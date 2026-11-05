import { Router } from 'express';
import prisma from '../lib/prisma';
import { userAuthMiddleware } from '../middleware/userAuth';
import { authMiddleware } from '../middleware/auth';
import { sendOrderWhatsApp } from '../services/whatsapp';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { validate } from '../middleware/validate';
import { orderSchema } from '../lib/schemas';
import { getDeliveryZoneConfig } from './shipping';
import { isDeliveryLocationAllowed } from '../utils/deliveryZones';

const router = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * Confirms payment for an order idempotently:
 * - Assigns sequential readableId (#XXX) and increments nextOrderNumber ONLY when payment is confirmed
 * - Sets status: 'PROCESSING', paymentStatus: 'PAID'
 * - Clears user's persistent cart in DB
 * - Creates user notification and high-priority admin notification
 * - Sends WhatsApp order confirmation
 */
export async function confirmOrderPayment({
    orderId,
    razorpayPaymentId,
    razorpaySignature,
    method = 'ONLINE'
}: {
    orderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    method?: string;
}) {
    const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } }, user: true }
    });

    if (!existingOrder) {
        throw new Error('Order not found');
    }

    // Idempotency: If already confirmed with readableId and paid, return as-is
    if (existingOrder.paymentStatus === 'PAID' && existingOrder.readableId) {
        return existingOrder;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
        let readableId = existingOrder.readableId;

        // Assign sequential readableId only upon confirmed payment
        if (!readableId) {
            const settings = await tx.siteSettings.findUnique({ where: { id: 'default' } });
            const prefix = settings?.orderIdPrefix || '#';
            const suffix = settings?.orderIdSuffix || '';
            const padding = settings?.orderIdPadding || 3;
            const currentNum = settings?.nextOrderNumber || 1;

            readableId = `${prefix}${currentNum.toString().padStart(padding, '0')}${suffix}`;

            await tx.siteSettings.update({
                where: { id: 'default' },
                data: { nextOrderNumber: currentNum + 1 }
            });
        }

        const updateData: any = {
            status: 'PROCESSING',
            paymentStatus: 'PAID',
            readableId: readableId,
        };

        if (razorpayPaymentId) updateData.razorpayPaymentId = razorpayPaymentId;
        if (razorpaySignature) updateData.razorpaySignature = razorpaySignature;

        const order = await tx.order.update({
            where: { id: orderId },
            data: updateData,
            include: { items: { include: { product: true } }, user: true }
        });

        // Clear user's persistent cart now that payment is confirmed
        if (existingOrder.userId) {
            await tx.cartItem.deleteMany({
                where: { userId: existingOrder.userId }
            });
        }

        return order;
    });

    // Create User Notification (Idempotent: only if not already created)
    const displayId = updatedOrder.readableId || "#" + updatedOrder.id.slice(-6);
    if (updatedOrder.userId) {
        const existingUserNotif = await prisma.notification.findFirst({
            where: {
                orderId: updatedOrder.id,
                userId: updatedOrder.userId,
                type: 'ORDER_CONFIRMED'
            }
        });
        if (!existingUserNotif) {
            await prisma.notification.create({
                data: {
                    userId: updatedOrder.userId,
                    isAdmin: false,
                    type: 'ORDER_CONFIRMED',
                    message: `Thank you! Your order ${displayId} has been confirmed and is now being processed.`,
                    orderId: updatedOrder.id
                }
            }).catch(console.error);
        }
    }

    // Create Admin Notification (High Priority, Idempotent: only if not already created)
    const existingAdminNotif = await prisma.notification.findFirst({
        where: {
            orderId: updatedOrder.id,
            isAdmin: true,
            type: 'NEW_ORDER'
        }
    });
    if (!existingAdminNotif) {
        await prisma.notification.create({
            data: {
                isAdmin: true,
                priority: 'HIGH',
                type: 'NEW_ORDER',
                message: `New Order ${displayId} received! Click to process.`,
                orderId: updatedOrder.id
            }
        }).catch(console.error);
    }

    // Fire-and-forget: Send WhatsApp order confirmation
    sendOrderWhatsApp('ORDER_CONFIRMED', updatedOrder).catch(err =>
        console.error('[WhatsApp] Failed to send ORDER_CONFIRMED:', err)
    );

    return updatedOrder;
}

// Create Order (Initiate Checkout)
router.post('/', userAuthMiddleware, validate(orderSchema), async (req, res) => {
    const {
        items, couponCode,
        customerName, phoneNumber, addressLine1, addressLine2, city, pincode
    } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Validate Delivery Zone Restrictions (if configured by admin)
        const zoneConfig = await getDeliveryZoneConfig();
        const locationCheck = isDeliveryLocationAllowed(
            { city, pincode, state: req.body.state, addressLine1 },
            zoneConfig
        );
        if (!locationCheck.allowed) {
            return res.status(400).json({
                error: locationCheck.reason || `Delivery is currently restricted to: ${zoneConfig.allowedAreas.join(', ')}.`
            });
        }

        let calculatedSubtotal = 0;
        let totalWeightKg = 0;

        // Fetch actual variant prices and calculate subtotal & weight
        for (const item of items) {
            // Frontend sends item.id = productId and item.weight = variant weight string
            const variant = await prisma.productVariant.findFirst({ 
                where: { productId: item.id, weight: item.weight },
                include: { product: true } 
            });
            
            if (!variant) {
                return res.status(400).json({ error: `Item variant not found: ${item.name}` });
            }

            if (variant.product.isDisabled) {
                return res.status(400).json({ error: `Item "${variant.product.name}" is currently unavailable.` });
            }

            if (variant.product.isSoldOut) {
                return res.status(400).json({ error: `Item "${variant.product.name}" is currently sold out and cannot be ordered.` });
            }

            item.variantId = variant.id;
            item.actualPrice = variant.price;
            item.productId = variant.productId;
            item.productName = variant.product.name;
            calculatedSubtotal += variant.price * item.quantity;

            // Extract weight for shipping calculation
            const weightMatch = variant.weight.match(/(\d+)\s*(g|kg|ml|l)/i);
            if (weightMatch) {
                let w = parseFloat(weightMatch[1]);
                if (weightMatch[2].toLowerCase() === 'g' || weightMatch[2].toLowerCase() === 'ml') w = w / 1000;
                totalWeightKg += w * item.quantity;
            }
        }

        // Calculate Shipping Charge
        let calculatedShippingCharge = 0;
        const shippingRules = await prisma.shippingRule.findMany({ where: { isActive: true } });
        let matchedRule = shippingRules.find(r => r.pincodes && r.pincodes.includes(pincode));
        if (!matchedRule) {
            matchedRule = shippingRules.find(r => r.areaName.toLowerCase() === city?.toLowerCase());
        }
        if (!matchedRule) {
            matchedRule = shippingRules.find(r => r.pincodes === '*');
        }

        if (matchedRule) {
            calculatedShippingCharge = matchedRule.baseCharge;
            if (totalWeightKg > matchedRule.baseWeightLimit) {
                const extraKg = Math.ceil(totalWeightKg - matchedRule.baseWeightLimit);
                calculatedShippingCharge += extraKg * matchedRule.additionalChargePerKg;
            }
        }

        // Verify Coupon and calculate discount
        let calculatedDiscount = 0;
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
            if (!coupon || !coupon.isActive || (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) || calculatedSubtotal < coupon.minCartAmount) {
                return res.status(400).json({ error: 'Applied coupon is no longer valid or minimum cart amount not met' });
            }
            if (coupon.type === 'FIXED') {
                calculatedDiscount = coupon.value;
            } else if (coupon.type === 'PERCENTAGE') {
                calculatedDiscount = (calculatedSubtotal * coupon.value) / 100;
            } else {
                calculatedDiscount = coupon.value;
            }
            // Ensure discount doesn't exceed subtotal
            calculatedDiscount = Math.min(calculatedDiscount, calculatedSubtotal);
        }

        const finalTotalAmount = calculatedSubtotal + calculatedShippingCharge - calculatedDiscount;

        const order = await prisma.$transaction(async (tx) => {
            // Note: Sequential readableId is NOT assigned here and nextOrderNumber is NOT incremented yet.
            // It will be assigned when payment is verified and confirmed.
            const newOrder = await tx.order.create({
                data: {
                    userId: req.user!.id,
                    readableId: null,
                    totalAmount: finalTotalAmount,
                    discountAmount: calculatedDiscount,
                    shippingCharge: calculatedShippingCharge,
                    couponCode: couponCode || null,
                    customerName: customerName || null,
                    phoneNumber: phoneNumber || null,
                    addressLine1: addressLine1 || null,
                    addressLine2: addressLine2 || null,
                    city: city || null,
                    pincode: pincode || null,
                    status: 'PENDING',
                    paymentStatus: 'PENDING',
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            productName: item.productName || "Unknown Product",
                            weight: item.weight,
                            price: item.actualPrice,
                            quantity: parseInt(item.quantity)
                        }))
                    }
                },
                include: { items: true }
            });

            // Create Razorpay Order
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(finalTotalAmount * 100), // Amount in paise
                currency: 'INR',
                receipt: newOrder.id,
            });

            // Update database order with Razorpay Order ID
            const updatedOrder = await tx.order.update({
                where: { id: newOrder.id },
                data: {
                    razorpayOrderId: razorpayOrder.id,
                }
            });

            // Update user's saved address
            await tx.user.update({
                where: { id: req.user!.id },
                data: {
                    customerName: customerName || null,
                    phoneNumber: phoneNumber || null,
                    addressLine1: addressLine1 || null,
                    addressLine2: addressLine2 || null,
                    city: city || null,
                    pincode: pincode || null
                }
            });

            // Note: Cart items are preserved in case payment fails or modal is dismissed.
            // Cart items will be deleted in confirmOrderPayment once payment is successful.

            return updatedOrder;
        });

        res.json({
            ...order,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// Verify Payment
router.post('/verify-payment', userAuthMiddleware, async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const isSimulation = process.env.NODE_ENV === 'development' && 
                        process.env.ALLOW_PAYMENT_SIMULATION === 'true' &&
                        razorpay_signature?.startsWith('sim_sig_');

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

    let isSignatureValid = isSimulation;
    if (!isSimulation && expectedSignature && razorpay_signature) {
        try {
            isSignatureValid = crypto.timingSafeEqual(
                Buffer.from(expectedSignature),
                Buffer.from(razorpay_signature)
            );
        } catch (e) {
            isSignatureValid = false;
        }
    }

    if (!isSignatureValid) {
        return res.status(400).json({ error: 'Invalid payment signature' });
    }

    try {
        const existingOrder = await prisma.order.findUnique({
            where: { razorpayOrderId: razorpay_order_id }
        });

        if (!existingOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (existingOrder.userId !== req.user?.id) {
            return res.status(403).json({ error: 'Unauthorized to verify this order' });
        }

        const order = await confirmOrderPayment({
            orderId: existingOrder.id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature
        });

        res.json({ success: true, order });
    } catch (error) {
        console.error('Payment verification DB update error:', error);
        res.status(500).json({ error: 'Payment verified but failed to update order' });
    }
});

// Webhook endpoint for Razorpay server-to-server notifications
router.post('/webhook', async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers['x-razorpay-signature'] as string;

        if (webhookSecret && signature) {
            const body = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(body)
                .digest('hex');

            if (expectedSignature !== signature) {
                return res.status(400).json({ error: 'Invalid webhook signature' });
            }
        }

        const event = req.body?.event;
        const payload = req.body?.payload;

        if (event === 'order.paid' || event === 'payment.captured') {
            const rzpOrderId = payload?.order?.entity?.id || payload?.payment?.entity?.order_id;
            const rzpPaymentId = payload?.payment?.entity?.id;

            if (rzpOrderId) {
                const order = await prisma.order.findUnique({
                    where: { razorpayOrderId: rzpOrderId }
                });

                if (order && order.paymentStatus !== 'PAID') {
                    await confirmOrderPayment({
                        orderId: order.id,
                        razorpayPaymentId: rzpPaymentId
                    });
                    console.log(`[Razorpay Webhook] Order ${order.id} automatically confirmed.`);
                }
            }
        } else if (event === 'payment.failed') {
            const rzpOrderId = payload?.payment?.entity?.order_id;
            if (rzpOrderId) {
                const order = await prisma.order.findUnique({
                    where: { razorpayOrderId: rzpOrderId }
                });
                if (order && order.paymentStatus !== 'PAID') {
                    await prisma.order.update({
                        where: { id: order.id },
                        data: {
                            status: 'FAILED',
                            paymentStatus: 'FAILED'
                        }
                    });
                    console.log(`[Razorpay Webhook] Order ${order.id} marked as FAILED.`);
                }
            }
        }

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('[Razorpay Webhook] Error processing webhook:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Customer fails or dismisses unpaid checkout
router.post('/:id/fail-unpaid', userAuthMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id as string, userId: req.user?.id }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.paymentStatus !== 'PAID') {
            const updated = await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'FAILED',
                    paymentStatus: 'FAILED'
                }
            });
            return res.json({ success: true, order: updated });
        }

        res.json({ success: false, message: 'Cannot mark order as failed' });
    } catch (error) {
        console.error('Fail unpaid error:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Alias for cancel-unpaid
router.post('/:id/cancel-unpaid', userAuthMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id as string, userId: req.user?.id }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.paymentStatus !== 'PAID') {
            const updated = await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'FAILED',
                    paymentStatus: 'FAILED'
                }
            });
            return res.json({ success: true, order: updated });
        }

        res.json({ success: false, message: 'Cannot cancel order in this state' });
    } catch (error) {
        console.error('Cancel unpaid error:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Get User Orders (Excludes unpaid/failed checkout attempts)
router.get('/', userAuthMiddleware, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: {
                userId: req.user?.id,
                NOT: {
                    OR: [
                        { status: 'FAILED' },
                        { paymentStatus: 'FAILED' },
                        { AND: [{ status: 'PENDING' }, { paymentStatus: 'PENDING' }] }
                    ]
                }
            },
            include: {
                items: {
                    include: { product: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error('Fetch orders error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// Get Single Order Detail
router.get('/:id', userAuthMiddleware, async (req, res) => {
    try {
        let order = await prisma.order.findUnique({
            where: {
                id: req.params.id as string,
                userId: req.user?.id // Security check: Ensure order belongs to user
            },
            include: {
                items: {
                    include: { product: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Auto-transition abandoned checkouts older than 15 minutes to FAILED
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (order.status === 'PENDING' && order.paymentStatus === 'PENDING' && order.createdAt < fifteenMinutesAgo) {
            order = await prisma.order.update({
                where: { id: order.id },
                data: {
                    status: 'FAILED',
                    paymentStatus: 'FAILED'
                },
                include: {
                    items: {
                        include: { product: true }
                    },
                    user: {
                        select: { id: true, email: true, name: true }
                    }
                }
            });
        }

        res.json(order);
    } catch (error) {
        console.error('Fetch order detail error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// ADMIN ROUTES
// Sales Analytics & Revenue Report (Admin)
router.get('/admin/sales-analytics', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, year, month } = req.query;

        // Sales strictly include confirmed paid orders
        const whereClause: any = {
            paymentStatus: 'PAID',
            status: { notIn: ['CANCELLED', 'FAILED', 'PENDING'] }
        };

        if (startDate && endDate) {
            whereClause.createdAt = {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            };
        } else if (year && month) {
            const y = parseInt(year as string);
            const m = parseInt(month as string) - 1;
            const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
            const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
            whereClause.createdAt = { gte: start, lte: end };
        } else if (year) {
            const y = parseInt(year as string);
            const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
            const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
            whereClause.createdAt = { gte: start, lte: end };
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                items: {
                    include: { product: true }
                },
                user: {
                    select: { id: true, email: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        let totalSalesAmount = 0;
        let totalDiscountAmount = 0;
        let totalShippingCharge = 0;
        const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

        for (const order of orders) {
            totalSalesAmount += order.totalAmount;
            totalDiscountAmount += (order.discountAmount || 0);
            totalShippingCharge += (order.shippingCharge || 0);

            for (const item of order.items) {
                const prodName = item.productName || item.product?.name || 'Unknown Product';
                if (!productSalesMap[prodName]) {
                    productSalesMap[prodName] = { name: prodName, quantity: 0, revenue: 0 };
                }
                productSalesMap[prodName].quantity += item.quantity;
                productSalesMap[prodName].revenue += item.price * item.quantity;
            }
        }

        const netProductSales = totalSalesAmount - totalShippingCharge + totalDiscountAmount;
        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalSalesAmount / totalOrders : 0;
        const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 15);

        res.json({
            summary: {
                totalSalesAmount,
                netProductSales,
                totalDiscountAmount,
                totalShippingCharge,
                totalOrders,
                averageOrderValue: Math.round(averageOrderValue * 100) / 100,
            },
            topProducts,
            orders
        });
    } catch (error) {
        console.error('Fetch sales analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch sales analytics' });
    }
});

// Get All Orders (Admin)
router.get('/admin/all', authMiddleware, async (req, res) => {
    try {
        // Auto-transition abandoned checkouts older than 15 minutes to FAILED
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        await prisma.order.updateMany({
            where: {
                status: 'PENDING',
                paymentStatus: 'PENDING',
                createdAt: { lt: fifteenMinutesAgo }
            },
            data: {
                status: 'FAILED',
                paymentStatus: 'FAILED'
            }
        }).catch(err => console.error('Error auto-updating stale pending orders:', err));

        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: { product: true }
                },
                user: {
                    select: { id: true, email: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error('Fetch all orders error:', error);
        res.status(500).json({ error: 'Failed to fetch all orders' });
    }
});

// Get Single Order Detail (Admin)
router.get('/admin/:id', authMiddleware, async (req, res) => {
    try {
        let order = await prisma.order.findUnique({
            where: { id: req.params.id as string },
            include: {
                items: {
                    include: { product: true }
                },
                user: {
                    select: { id: true, email: true, name: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Fetch admin order detail error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// Admin live payment sync & verify with Razorpay
router.post('/admin/:id/sync-payment', authMiddleware, async (req, res) => {
    try {
        let order = await prisma.order.findUnique({
            where: { id: req.params.id as string },
            include: { items: true, user: true }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.paymentStatus === 'PAID') {
            return res.json({
                success: true,
                captured: true,
                message: `Order is already confirmed as PAID (${order.readableId || order.id}).`,
                order
            });
        }

        if (!order.razorpayOrderId) {
            return res.status(400).json({ error: 'No Razorpay Order ID found for this order.' });
        }

        // Live check with Razorpay API
        const paymentsResponse: any = await razorpay.orders.fetchPayments(order.razorpayOrderId);
        const payments = paymentsResponse?.items || [];

        // Check if any payment was captured
        const capturedPayment = payments.find((p: any) => p.status === 'captured');

        if (capturedPayment) {
            const confirmedOrder = await confirmOrderPayment({
                orderId: order.id,
                razorpayPaymentId: capturedPayment.id,
                method: capturedPayment.method || 'ONLINE'
            });

            return res.json({
                success: true,
                captured: true,
                message: `Payment (${capturedPayment.id}) of ₹${capturedPayment.amount / 100} verified from Razorpay! Order confirmed as ${confirmedOrder.readableId}.`,
                order: confirmedOrder
            });
        }

        const lastPayment = payments[0];
        let reason = 'Customer did not complete payment on Razorpay.';
        if (lastPayment) {
            reason = `Payment attempt ${lastPayment.id} has status: "${lastPayment.status}". ${lastPayment.error_description || ''}`.trim();
        }

        return res.json({
            success: true,
            captured: false,
            message: reason,
            payments: payments.map((p: any) => ({
                id: p.id,
                status: p.status,
                amount: p.amount / 100,
                method: p.method,
                error: p.error_description
            })),
            order
        });
    } catch (error: any) {
        console.error('Sync payment error:', error);
        res.status(500).json({ error: error.message || 'Failed to verify payment with Razorpay' });
    }
});

// Admin Mark Failed for unpaid orders
router.post('/admin/:id/mark-failed', authMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id as string }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.paymentStatus === 'PAID') {
            return res.status(400).json({ error: 'Cannot mark a paid order as failed.' });
        }

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'FAILED',
                paymentStatus: 'FAILED'
            }
        });

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error('Admin mark failed error:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Admin Mark Abandoned / Cancelled for unpaid orders
router.post('/admin/:id/mark-unpaid-cancelled', authMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id as string }
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        if (order.paymentStatus === 'PAID') {
            return res.status(400).json({ error: 'Cannot mark a paid order as cancelled via this action.' });
        }

        const updated = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: 'FAILED',
                paymentStatus: 'FAILED'
            }
        });

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error('Admin mark unpaid cancelled error:', error);
        res.status(500).json({ error: 'Failed to update order' });
    }
});

// Update Order Status (Admin)
router.patch('/admin/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'FAILED'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const updateData: any = { status };

        // If status is SHIPPED, we expect tracking info
        if (status === 'SHIPPED') {
            const { deliveryManName, deliveryManPhone, trackingLink, trackingId } = req.body;

            if (!trackingLink || !trackingId) {
                return res.status(400).json({ error: 'Tracking Link and Tracking ID are mandatory for Shipped status' });
            }

            updateData.deliveryManName = deliveryManName || null;
            updateData.deliveryManPhone = deliveryManPhone || null;
            updateData.trackingLink = trackingLink;
            updateData.trackingId = trackingId;
        }

        // If status is DELIVERED, record the delivery timestamp
        if (status === 'DELIVERED') {
            updateData.deliveredAt = new Date();
        }

        const order = await prisma.order.update({
            where: { id: req.params.id as string },
            data: updateData,
            include: { items: true }
        });

        // Create User Notification for status change
        const displayId = order.readableId || "#" + order.id.slice(-6);
        let notificationMessage = `Your order ${displayId} status has been updated to ${status.toLowerCase()}.`;
        if (status === 'SHIPPED') {
            notificationMessage = `Great news! Your order ${displayId} has been shipped. Click to track!`;
        } else if (status === 'DELIVERED') {
            notificationMessage = `Your order ${displayId} has been delivered. Enjoy your snacks!`;
        } else if (status === 'CANCELLED') {
            notificationMessage = `Your order ${displayId} has been cancelled.`;
        } else if (status === 'FAILED') {
            notificationMessage = `Your order ${displayId} payment was not completed or failed.`;
        }

        await prisma.notification.create({
            data: {
                userId: order.userId,
                type: `ORDER_${status}`,
                message: notificationMessage,
                orderId: order.id
            }
        });

        res.json(order);

        // Fire-and-forget: Send WhatsApp notifications based on status
        if (status === 'SHIPPED') {
            sendOrderWhatsApp('ORDER_SHIPPED', order).then(sent => {
                if (sent) {
                    prisma.order.update({
                        where: { id: order.id },
                        data: { whatsappShippedSent: true }
                    }).catch(console.error);
                }
            }).catch(err => console.error('[WhatsApp] Failed to send ORDER_SHIPPED:', err));
        }

        if (status === 'DELIVERED') {
            sendOrderWhatsApp('ORDER_DELIVERED', order).then(sent => {
                if (sent) {
                    prisma.order.update({
                        where: { id: order.id },
                        data: { whatsappDeliveredSent: true }
                    }).catch(console.error);
                }
            }).catch(err => console.error('[WhatsApp] Failed to send ORDER_DELIVERED:', err));
        }
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

export default router;

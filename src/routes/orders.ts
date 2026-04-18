import { Router } from 'express';
import prisma from '../lib/prisma';
import { userAuthMiddleware } from '../middleware/userAuth';
import { authMiddleware } from '../middleware/auth';
import { sendOrderWhatsApp } from '../services/whatsapp';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { validate } from '../middleware/validate';
import { orderSchema } from '../lib/schemas';

const router = Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Create Order
router.post('/', userAuthMiddleware, validate(orderSchema), async (req, res) => {
    const {
        items, totalAmount, discountAmount, shippingCharge, couponCode,
        customerName, phoneNumber, addressLine1, addressLine2, city, pincode
    } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    // Server-side Double Check for Coupon
    if (couponCode) {
        const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
        const subtotal = items.reduce((sum: number, item: any) => sum + (parseFloat(item.price) * parseInt(item.quantity)), 0);

        if (!coupon || !coupon.isActive || (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) || subtotal < coupon.minCartAmount) {
            return res.status(400).json({ error: 'Applied coupon is no longer valid' });
        }
    }

    try {
        const order = await prisma.$transaction(async (tx) => {
            // Fetch ID settings
            const settings = await tx.siteSettings.findUnique({ where: { id: 'default' } });
            const prefix = settings?.orderIdPrefix || '#';
            const suffix = settings?.orderIdSuffix || '';
            const padding = settings?.orderIdPadding || 3;
            const currentNum = settings?.nextOrderNumber || 1;

            const readableId = `${prefix}${currentNum.toString().padStart(padding, '0')}${suffix}`;

            const newOrder = await tx.order.create({
                data: {
                    userId: req.user!.id,
                    readableId: readableId,
                    totalAmount: parseFloat(totalAmount),
                    discountAmount: parseFloat(discountAmount || 0),
                    shippingCharge: parseFloat(shippingCharge || 0),
                    couponCode: couponCode || null,
                    customerName: customerName || null,
                    phoneNumber: phoneNumber || null,
                    addressLine1: addressLine1 || null,
                    addressLine2: addressLine2 || null,
                    city: city || null,
                    pincode: pincode || null,
                    status: 'PENDING',
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.id,
                            productName: item.name || "Unknown Product",
                            weight: item.weight,
                            price: parseFloat(item.price),
                            quantity: parseInt(item.quantity)
                        }))
                    }
                },
                include: { items: true }
            });

            // Increment the order counter
            await tx.siteSettings.update({
                where: { id: 'default' },
                data: { nextOrderNumber: currentNum + 1 }
            });

            // Create Razorpay Order
            const razorpayOrder = await razorpay.orders.create({
                amount: Math.round(parseFloat(totalAmount) * 100), // Amount in paise
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

            // Clear user's persistent cart after ordering
            await tx.cartItem.deleteMany({
                where: { userId: req.user!.id }
            });

            return updatedOrder;
        });

        res.json(order);
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
                        razorpay_signature?.startsWith('sim_sig_');

    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

    const isSignatureValid = isSimulation || (expectedSignature === razorpay_signature);

    if (isSignatureValid) {
        try {
            const order = await prisma.order.update({
                where: { razorpayOrderId: razorpay_order_id },
                data: {
                    status: 'PROCESSING', // Move to processing after payment
                    paymentStatus: 'PAID',
                    razorpayPaymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature
                }
            });

            // Create User Notification
            await prisma.notification.create({
                data: {
                    userId: order.userId,
                    isAdmin: false,
                    type: 'ORDER_CONFIRMED',
                    message: `Thank you! Your order #${order.id.slice(-6)} has been confirmed and is now being processed.`,
                    orderId: order.id
                }
            });

            // Create Admin Notification (High Priority)
            await prisma.notification.create({
                data: {
                    isAdmin: true,
                    priority: 'HIGH',
                    type: 'NEW_ORDER',
                    message: `New Order #${order.id.slice(-6)} received! Click to process.`,
                    orderId: order.id
                }
            });

            // Also keep the existing admin alert but maybe with a different type or just allow it to stay if userId is nullable.
            // For now, I'll just change the message to be user-centric as per the request.

            res.json({ success: true, order });

            // Fire-and-forget: Send WhatsApp order confirmation
            sendOrderWhatsApp('ORDER_CONFIRMED', order).catch(err =>
                console.error('[WhatsApp] Failed to send ORDER_CONFIRMED:', err)
            );
        } catch (error) {
            console.error('Payment verification DB update error:', error);
            res.status(500).json({ error: 'Payment verified but failed to update order' });
        }
    } else {
        res.status(400).json({ error: 'Invalid payment signature' });
    }
});

// Get User Orders
router.get('/', userAuthMiddleware, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { userId: req.user?.id },
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
        const order = await prisma.order.findUnique({
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

        res.json(order);
    } catch (error) {
        console.error('Fetch order detail error:', error);
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// ADMIN ROUTES
// Get All Orders (Admin)
router.get('/admin/all', authMiddleware, async (req, res) => {
    try {
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
        const order = await prisma.order.findUnique({
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

// Update Order Status (Admin)
router.patch('/admin/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

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
        let notificationMessage = `Your order #${order.id.slice(-6)} status has been updated to ${status.toLowerCase()}.`;
        if (status === 'SHIPPED') {
            notificationMessage = `Great news! Your order #${order.id.slice(-6)} has been shipped. Click to track!`;
        } else if (status === 'DELIVERED') {
            notificationMessage = `Your order #${order.id.slice(-6)} has been delivered. Enjoy your snacks!`;
        } else if (status === 'CANCELLED') {
            notificationMessage = `Your order #${order.id.slice(-6)} has been cancelled.`;
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

import { Router } from 'express';
import prisma from '../lib/prisma';
import { userAuthMiddleware } from '../middleware/userAuth';
import { validate } from '../middleware/validate';
import { syncCartSchema, updateCartItemSchema } from '../lib/schemas';

const router = Router();

// Helper to normalize weight strings for robust matching
const normalizeWeight = (w: string) => {
    if (!w) return '';
    return w.toLowerCase().replace(/[^a-z0-9]/g, '');
};

/**
 * Shared helper to format a CartItem with bulletproof price retrieval.
 * Tries variants in this order: Exact weight -> Normalized weight -> Default variant -> First available variant -> Base price.
 */
const formatCartItem = (item: any) => {
    const product = item.product;
    if (!product) return null;

    const variants = product.variants || [];
    const normalizedItemWeight = normalizeWeight(item.weight);
    
    // 1. Try exact match
    let variant = variants.find((v: any) => v.weight === item.weight);
    
    // 2. Try normalized match
    if (!variant) {
        variant = variants.find((v: any) => normalizeWeight(v.weight) === normalizedItemWeight);
    }
    
    // 3. Try default variant
    if (!variant) {
        variant = variants.find((v: any) => v.isDefault);
    }

    // 4. LAST RESORT: Try the very first variant in the list
    if (!variant && variants.length > 0) {
        variant = variants[0];
    }

    const price = variant ? variant.price : (product.price || 0);

    return {
        id: item.productId,
        variantId: item.variantId,
        name: product.name,
        description: product.description,
        price: price,
        image: product.image,
        weight: item.weight,
        slug: product.slug,
        quantity: item.quantity,
        categoryName: product.category?.name || 'Category',
        categoryId: product.categoryId
    };
};

// Get cart
router.get('/', userAuthMiddleware, async (req, res) => {
    try {
        const cartItems = await prisma.cartItem.findMany({
            where: { userId: req.user?.id },
            include: {
                product: {
                    include: { 
                        category: true,
                        variants: true
                    }
                }
            }
        });

        const formatted = cartItems
            .map(item => formatCartItem(item))
            .filter(Boolean);

        res.json(formatted);
    } catch (error) {
        console.error('Fetch cart error:', error);
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// Sync cart
router.post('/sync', userAuthMiddleware, validate(syncCartSchema), async (req, res) => {
    const { items } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userId = req.user.id;

        for (const item of items) {
            await prisma.cartItem.upsert({
                where: {
                    userId_variantId: {
                        userId,
                        variantId: item.variantId
                    }
                },
                update: {
                    quantity: { increment: item.quantity }
                },
                create: {
                    userId,
                    productId: item.id,
                    variantId: item.variantId,
                    weight: item.weight,
                    quantity: item.quantity
                }
            });
        }

        const updatedCart = await prisma.cartItem.findMany({
            where: { userId },
            include: {
                product: {
                    include: { 
                        category: true,
                        variants: true
                    }
                }
            }
        });

        const formatted = updatedCart
            .map(item => formatCartItem(item))
            .filter(Boolean);

        res.json(formatted);
    } catch (error) {
        console.error('Cart sync error:', error);
        res.status(500).json({ error: 'Failed to sync cart' });
    }
});

// Update single item
router.put('/', userAuthMiddleware, validate(updateCartItemSchema), async (req, res) => {
    const { variantId, productId, weight, quantity } = req.body;
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (quantity <= 0) {
            await prisma.cartItem.delete({
                where: {
                    userId_variantId: {
                        userId: req.user.id,
                        variantId
                    }
                }
            });
        } else {
            await prisma.cartItem.upsert({
                where: {
                    userId_variantId: {
                        userId: req.user.id,
                        variantId
                    }
                },
                update: { quantity },
                create: {
                    userId: req.user.id,
                    productId,
                    variantId,
                    weight,
                    quantity
                }
            });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Update cart item error:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

export default router;

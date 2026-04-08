import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ADMIN: Create a new coupon
router.post('/admin/coupons', authMiddleware, async (req, res) => {
    const { code, type, value, minCartAmount, expiryDate } = req.body;

    if (type === 'FIXED' && parseFloat(minCartAmount) <= parseFloat(value)) {
        return res.status(400).json({ error: 'Minimum spend must be higher than the discount value' });
    }

    try {
        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                type,
                value: parseFloat(value),
                minCartAmount: parseFloat(minCartAmount || 0),
                expiryDate: expiryDate ? new Date(expiryDate) : null,
            }
        });
        res.json(coupon);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create coupon. Code might already exist.' });
    }
});

// ADMIN: List all coupons
router.get('/admin/coupons', authMiddleware, async (req, res) => {
    const coupons = await prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' }
    });
    res.json(coupons);
});

// ADMIN: Delete a coupon
router.delete('/admin/coupons/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.coupon.delete({ where: { id: req.params.id as string } });
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete coupon' });
    }
});

// USER: List active coupons
router.get('/coupons', async (req, res) => {
    const coupons = await prisma.coupon.findMany({
        where: {
            isActive: true,
            OR: [
                { expiryDate: null },
                { expiryDate: { gt: new Date() } }
            ]
        },
        orderBy: { minCartAmount: 'asc' }
    });
    res.json(coupons);
});

// USER: Validate a coupon
router.post('/coupons/validate', async (req, res) => {
    const { code, cartTotal } = req.body;

    try {
        const coupon = await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!coupon || !coupon.isActive) {
            return res.status(404).json({ error: 'Invalid or inactive coupon' });
        }

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ error: 'Coupon has expired' });
        }

        if (cartTotal < coupon.minCartAmount) {
            return res.status(400).json({
                error: `Minimum cart amount of ₹${coupon.minCartAmount} required for this coupon`
            });
        }

        let discount = 0;
        if (coupon.type === 'FIXED') {
            discount = coupon.value;
        } else {
            discount = (cartTotal * coupon.value) / 100;
        }

        res.json({
            valid: true,
            discount,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            minCartAmount: coupon.minCartAmount
        });
    } catch (error) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

export default router;

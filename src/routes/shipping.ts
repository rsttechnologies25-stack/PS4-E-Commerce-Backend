import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// ADMIN: Create or update a shipping rule
router.post('/admin/shipping/rules', authMiddleware, async (req, res) => {
    const { areaName, baseWeightLimit, baseCharge, additionalChargePerKg, isActive, pincodes } = req.body;

    try {
        const rule = await prisma.shippingRule.upsert({
            where: { areaName },
            update: {
                pincodes: pincodes || "*",
                baseWeightLimit: parseFloat(baseWeightLimit),
                baseCharge: parseFloat(baseCharge),
                additionalChargePerKg: parseFloat(additionalChargePerKg),
                isActive: isActive ?? true
            },
            create: {
                areaName,
                pincodes: pincodes || "*",
                baseWeightLimit: parseFloat(baseWeightLimit),
                baseCharge: parseFloat(baseCharge),
                additionalChargePerKg: parseFloat(additionalChargePerKg),
                isActive: isActive ?? true
            }
        });
        res.json(rule);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update shipping rule' });
    }
});

// ADMIN: List all shipping rules
router.get('/admin/shipping/rules', authMiddleware, async (req, res) => {
    const rules = await prisma.shippingRule.findMany({
        orderBy: { areaName: 'asc' }
    });
    res.json(rules);
});

// ADMIN: Delete a shipping rule
router.delete('/admin/shipping/rules/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.shippingRule.delete({ where: { id: req.params.id as string } });
        res.json({ message: 'Shipping rule deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Failed to delete shipping rule' });
    }
});

// USER: Get shipping rules
router.get('/shipping/rules', async (req, res) => {
    const rules = await prisma.shippingRule.findMany({
        where: { isActive: true },
        orderBy: { areaName: 'asc' }
    });
    res.json(rules);
});

export default router;

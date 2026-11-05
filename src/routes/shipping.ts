import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { RESTRICTION_RULE_KEY, DeliveryZoneConfig } from '../utils/deliveryZones';

const router = Router();

// Helper to fetch delivery zone restrictions config
export async function getDeliveryZoneConfig(): Promise<DeliveryZoneConfig> {
    try {
        const rule = await prisma.shippingRule.findUnique({
            where: { areaName: RESTRICTION_RULE_KEY }
        });

        if (!rule) {
            return { enabled: false, allowedAreas: [], customPincodes: [] };
        }

        let parsedData: any = {};
        try {
            parsedData = JSON.parse(rule.pincodes || '{}');
        } catch {
            parsedData = {};
        }

        return {
            enabled: rule.isActive && Array.isArray(parsedData.allowedAreas) && parsedData.allowedAreas.length > 0,
            allowedAreas: Array.isArray(parsedData.allowedAreas) ? parsedData.allowedAreas : [],
            customPincodes: Array.isArray(parsedData.customPincodes) ? parsedData.customPincodes : []
        };
    } catch (error) {
        console.error('Error fetching delivery zone config:', error);
        return { enabled: false, allowedAreas: [], customPincodes: [] };
    }
}

// ==========================================
// DELIVERY ZONE RESTRICTION ENDPOINTS
// ==========================================

// PUBLIC: Get active delivery zone restrictions (used by web checkout & mobile)
router.get('/shipping/delivery-zones', async (req, res) => {
    try {
        const config = await getDeliveryZoneConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delivery zone restrictions' });
    }
});

// ADMIN: Get delivery zone restrictions config
router.get('/admin/shipping/delivery-zones', authMiddleware, async (req, res) => {
    try {
        const config = await getDeliveryZoneConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch delivery zone restrictions' });
    }
});

// ADMIN: Update delivery zone restrictions config
router.post('/admin/shipping/delivery-zones', authMiddleware, async (req, res) => {
    const { enabled, allowedAreas, customPincodes } = req.body;

    try {
        const cleanedAreas = (Array.isArray(allowedAreas) ? allowedAreas : [])
            .map((a: string) => String(a).trim())
            .filter(Boolean);

        const cleanedPincodes = (Array.isArray(customPincodes) ? customPincodes : [])
            .map((p: string) => String(p).trim())
            .filter(Boolean);

        const isEnabled = Boolean(enabled) && cleanedAreas.length > 0;

        const payload = JSON.stringify({
            allowedAreas: cleanedAreas,
            customPincodes: cleanedPincodes
        });

        const rule = await prisma.shippingRule.upsert({
            where: { areaName: RESTRICTION_RULE_KEY },
            update: {
                pincodes: payload,
                isActive: isEnabled,
                baseWeightLimit: 0,
                baseCharge: 0,
                additionalChargePerKg: 0
            },
            create: {
                areaName: RESTRICTION_RULE_KEY,
                pincodes: payload,
                isActive: isEnabled,
                baseWeightLimit: 0,
                baseCharge: 0,
                additionalChargePerKg: 0
            }
        });

        res.json({
            success: true,
            config: {
                enabled: rule.isActive,
                allowedAreas: cleanedAreas,
                customPincodes: cleanedPincodes
            }
        });
    } catch (error) {
        console.error('Failed to update delivery zone restrictions:', error);
        res.status(400).json({ error: 'Failed to update delivery zone restrictions' });
    }
});

// ==========================================
// STANDARD AREA SHIPPING RATES ENDPOINTS
// ==========================================

// ADMIN: Create or update a shipping rule
router.post('/admin/shipping/rules', authMiddleware, async (req, res) => {
    const { areaName, baseWeightLimit, baseCharge, additionalChargePerKg, isActive, pincodes } = req.body;

    if (areaName === RESTRICTION_RULE_KEY) {
        return res.status(400).json({ error: 'Reserved rule name cannot be modified directly.' });
    }

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

// ADMIN: List all shipping rules (excludes internal restriction rule)
router.get('/admin/shipping/rules', authMiddleware, async (req, res) => {
    const rules = await prisma.shippingRule.findMany({
        where: {
            areaName: { not: RESTRICTION_RULE_KEY }
        },
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

// USER: Get shipping rules (excludes internal restriction rule)
router.get('/shipping/rules', async (req, res) => {
    const rules = await prisma.shippingRule.findMany({
        where: {
            isActive: true,
            areaName: { not: RESTRICTION_RULE_KEY }
        },
        orderBy: { areaName: 'asc' }
    });
    res.json(rules);
});

export default router;

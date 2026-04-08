import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all WhatsApp templates (Admin)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const templates = await prisma.whatsAppTemplate.findMany({
            orderBy: { key: 'asc' }
        });
        res.json(templates);
    } catch (error) {
        console.error('Fetch WhatsApp templates error:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Update a WhatsApp template (Admin)
router.put('/:id', authMiddleware, async (req, res) => {
    const { message, isActive } = req.body;

    try {
        const template = await prisma.whatsAppTemplate.update({
            where: { id: req.params.id as string },
            data: {
                ...(message !== undefined && { message }),
                ...(isActive !== undefined && { isActive })
            }
        });

        res.json(template);
    } catch (error) {
        console.error('Update WhatsApp template error:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

export default router;

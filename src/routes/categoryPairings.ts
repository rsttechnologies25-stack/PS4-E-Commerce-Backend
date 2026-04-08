import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET all pairings (admin)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const pairings = await prisma.categoryPairing.findMany({
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        });

        // Enrich with category names
        const categoryIds = [
            ...new Set([
                ...pairings.map((p: any) => p.categoryId),
                ...pairings.map((p: any) => p.pairedCategoryId),
            ]),
        ];

        const categories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, slug: true },
        });

        const categoryMap = new Map(categories.map(c => [c.id, c]));

        const enriched = pairings.map((p: any) => ({
            ...p,
            categoryName: categoryMap.get(p.categoryId)?.name || 'Unknown',
            pairedCategoryName: categoryMap.get(p.pairedCategoryId)?.name || 'Unknown',
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching pairings:', error);
        res.status(500).json({ error: 'Failed to fetch pairings' });
    }
});

// POST create pairing
router.post('/', async (req: Request, res: Response) => {
    try {
        const { categoryId, pairedCategoryId, sortOrder } = req.body;

        if (!categoryId || !pairedCategoryId) {
            return res.status(400).json({ error: 'Both categoryId and pairedCategoryId are required' });
        }

        if (categoryId === pairedCategoryId) {
            return res.status(400).json({ error: 'Cannot pair a category with itself' });
        }

        const pairing = await prisma.categoryPairing.create({
            data: {
                categoryId,
                pairedCategoryId,
                sortOrder: sortOrder ? parseInt(sortOrder) : 0,
            },
        });

        res.status(201).json(pairing);
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'This pairing already exists' });
        }
        console.error('Error creating pairing:', error);
        res.status(500).json({ error: 'Failed to create pairing' });
    }
});

// DELETE pairing
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        await prisma.categoryPairing.delete({
            where: { id: req.params.id as string },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting pairing:', error);
        res.status(500).json({ error: 'Failed to delete pairing' });
    }
});

// PATCH toggle active
router.patch('/:id/toggle', async (req: Request, res: Response) => {
    try {
        const pairing = await prisma.categoryPairing.findUnique({
            where: { id: req.params.id as string },
        });
        if (!pairing) return res.status(404).json({ error: 'Pairing not found' });

        const updated = await prisma.categoryPairing.update({
            where: { id: req.params.id as string },
            data: { isActive: !pairing.isActive },
        });
        res.json(updated);
    } catch (error) {
        console.error('Error toggling pairing:', error);
        res.status(500).json({ error: 'Failed to toggle pairing' });
    }
});

export default router;

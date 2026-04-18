import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const { parent } = req.query;
        const categories = await prisma.category.findMany({
            where: parent ? { parentId: parent as string } : {},
            orderBy: { sortOrder: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                image: true,
                deliveryInfo: true,
                parentId: true,
                sortOrder: true,
                products: { take: 4 }
            }
        });
        const result = categories.map(c => ({
            ...c,
            sortOrder: Number((c as any).sortOrder || 0),
            _debugId: "v1.0.3"
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { name, slug, image, parentId, deliveryInfo, sortOrder } = req.body;
    try {
        const category = await prisma.category.create({
            data: {
                name,
                slug,
                image: image || null,
                parentId: parentId || null,
                deliveryInfo: deliveryInfo || null,
                sortOrder: (sortOrder !== undefined && sortOrder !== null) ? Number(sortOrder) : 0
            }
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Category create error:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const { name, slug, image, parentId, deliveryInfo, sortOrder } = req.body;
    try {
        const category = await prisma.category.update({
            where: { id: req.params.id as string },
            data: {
                name,
                slug,
                image: image || null,
                parentId: parentId || null,
                deliveryInfo: deliveryInfo || null,
                sortOrder: (sortOrder !== undefined && sortOrder !== null) ? Number(sortOrder) : 0
            }
        });
        res.json(category);
    } catch (error) {
        console.error('Category update error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.category.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

router.get('/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        // Try finding by ID first
        let category = await prisma.category.findUnique({
            where: { id: idOrSlug },
            select: {
                id: true,
                name: true,
                slug: true,
                image: true,
                deliveryInfo: true,
                parentId: true,
                sortOrder: true,
            }
        });

        // If not found by ID, try finding by slug
        if (!category) {
            category = await prisma.category.findUnique({
                where: { slug: idOrSlug },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    image: true,
                    deliveryInfo: true,
                    parentId: true,
                    sortOrder: true,
                }
            });
        }

        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});

export default router;

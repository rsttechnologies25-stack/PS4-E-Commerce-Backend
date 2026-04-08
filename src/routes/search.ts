import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/search?q=query
router.get('/', async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.length < 1) {
        return res.json({ products: [], categories: [] });
    }

    try {
        // Search across Products and Categories
        const [products, categories] = await Promise.all([
            prisma.product.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { description: { contains: query, mode: 'insensitive' } }
                    ]
                },
                include: {
                    category: {
                        select: { name: true, slug: true }
                    },
                    images: {
                        where: { isPrimary: true },
                        take: 1
                    }
                },
                take: 10
            }),
            prisma.category.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' }
                },
                include: {
                    parent: {
                        select: { name: true, slug: true }
                    }
                },
                take: 5
            })
        ]);

        res.json({
            products: products.map(p => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: p.price,
                image: p.images[0]?.url || p.image,
                categoryName: p.category.name,
                categorySlug: p.category.slug
            })),
            categories: categories.map(c => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                parentName: c.parent?.name
            }))
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Failed to perform search' });
    }
});

export default router;

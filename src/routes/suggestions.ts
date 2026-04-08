import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// POST /api/suggestions - Get suggested products based on cart category IDs
router.post('/', async (req: Request, res: Response) => {
    try {
        const { categoryIds, excludeProductIds } = req.body;

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return res.json([]);
        }

        // Also look up parent categories for subcategories in cart
        const cartCategories = await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, parentId: true },
        });

        // Collect both direct IDs and parent IDs
        const allCategoryIds = [
            ...categoryIds,
            ...cartCategories.filter(c => c.parentId).map(c => c.parentId as string),
        ];
        const uniqueCategoryIds: string[] = [...new Set(allCategoryIds)];

        // Find active pairings for any of these categories (Bidirectional check)
        const pairings = await prisma.categoryPairing.findMany({
            where: {
                isActive: true,
                OR: [
                    { categoryId: { in: uniqueCategoryIds } },
                    { pairedCategoryId: { in: uniqueCategoryIds } }
                ]
            },
            orderBy: { sortOrder: 'asc' },
        });

        console.log('[Suggestions] Found pairings:', pairings.length);

        if (pairings.length === 0) {
            console.log('[Suggestions] No pairings found for input categories');
            return res.json([]);
        }

        // Get all paired category IDs from both sides of the relationship
        const pairedCategoryIds: string[] = [...new Set([
            ...pairings.map((p: any) => p.pairedCategoryId),
            ...pairings.map((p: any) => p.categoryId)
        ])];

        // Filter out original categories from suggestions
        const suggestionCategoryIds = pairedCategoryIds.filter(id => !uniqueCategoryIds.includes(id));
        
        // If we only have original categories, we still need target categories to suggest from
        // If suggestionCategoryIds is empty here, it means original categories are paired with each other
        const finalTargetIds = suggestionCategoryIds.length > 0 ? suggestionCategoryIds : pairedCategoryIds;
        console.log('[Suggestions] Final target IDs:', finalTargetIds);

        // Get subcategories of paired categories too
        const pairedSubcategories = await prisma.category.findMany({
            where: { parentId: { in: finalTargetIds } },
            select: { id: true },
        });

        const allPairedIds = [
            ...finalTargetIds,
            ...pairedSubcategories.map(c => c.id),
        ];

        // Build exclude list
        const excludeIds = Array.isArray(excludeProductIds) ? excludeProductIds : [];

        // Fetch products from paired categories, excluding items already in cart
        const products = await prisma.product.findMany({
            where: {
                categoryId: { in: allPairedIds },
                id: { notIn: excludeIds },
            },
            include: {
                category: { select: { name: true, slug: true } },
                variants: { orderBy: { sortOrder: 'asc' } },
            },
            take: 12, // fetch extra for randomization
        });

        // Shuffle and limit to 8
        const shuffled = products.sort(() => Math.random() - 0.5).slice(0, 8);

        res.json(shuffled);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

export default router;

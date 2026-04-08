import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const productInclude = {
    category: {
        include: {
            parent: true
        }
    },
    images: { orderBy: { sortOrder: 'asc' as const } },
    variants: { orderBy: { sortOrder: 'asc' as const } },
    _count: {
        select: {
            reviews: { where: { status: 'APPROVED' } }
        }
    }
};

// GET all products (flat list)
router.get('/', async (req, res) => {
    const { category, isBestSeller, isNewLaunch, includeChildren, limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : undefined;

    try {
        let categoryId: string | undefined;
        let subCategoryIds: string[] = [];

        if (category) {
            const cat = await prisma.category.findUnique({
                where: { slug: category as string },
                include: { children: true }
            });
            if (cat) {
                categoryId = cat.id;
                if (includeChildren === 'true') {
                    subCategoryIds = cat.children.map(c => c.id);
                }
            }
        }

        const where = {
            ...(category ? {
                OR: [
                    { categoryId: categoryId },
                    { categoryId: { in: subCategoryIds } }
                ]
            } : {}),
            ...(isBestSeller === 'true' ? { isBestSeller: true } : {}),
            ...(isNewLaunch === 'true' ? { isNewLaunch: true } : {}),
        };

        const products = await prisma.product.findMany({
            where,
            include: productInclude,
            take: limitNum,
            orderBy: { createdAt: 'desc' }
        });

        res.json(products);
    } catch (error) {
        console.error('Fetch products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// CREATE product with variants + images
router.post('/', authMiddleware, async (req, res) => {
    const { name, slug, description, deliveryInfo, image, categoryId, isBestSeller, isNewLaunch, isSoldOut, variants, images } = req.body;
    try {
        const product = await prisma.product.create({
            data: {
                name,
                slug,
                description,
                deliveryInfo: deliveryInfo || null,
                image: image || (images && images.length > 0 ? images[0].url : null),
                categoryId,
                isBestSeller: isBestSeller || false,
                isNewLaunch: isNewLaunch || false,
                isSoldOut: isSoldOut || false,
                variants: {
                    create: (variants || []).map((v: any, idx: number) => ({
                        weight: v.weight,
                        price: parseFloat(v.price),
                        stock: parseInt(v.stock) || 0,
                        isDefault: v.isDefault || false,
                        sortOrder: idx,
                    }))
                },
                images: {
                    create: (images || []).map((img: any, idx: number) => ({
                        url: img.url,
                        altText: img.altText || null,
                        isPrimary: idx === 0,
                        sortOrder: idx,
                    }))
                }
            },
            include: productInclude
        });
        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// UPDATE product with variants + images
router.put('/:id', authMiddleware, async (req, res) => {
    const { name, slug, description, deliveryInfo, image, categoryId, isBestSeller, isNewLaunch, isSoldOut, variants, images } = req.body;
    try {
        // Delete old variants and images, then recreate
        await prisma.productVariant.deleteMany({ where: { productId: req.params.id as string } });
        await prisma.productImage.deleteMany({ where: { productId: req.params.id as string } });

        const product = await prisma.product.update({
            where: { id: req.params.id as string },
            data: {
                name,
                slug,
                description,
                deliveryInfo: deliveryInfo || null,
                image: image || (images && images.length > 0 ? images[0].url : null),
                categoryId,
                isBestSeller: isBestSeller || false,
                isNewLaunch: isNewLaunch || false,
                isSoldOut: isSoldOut || false,
                variants: {
                    create: (variants || []).map((v: any, idx: number) => ({
                        weight: v.weight,
                        price: parseFloat(v.price),
                        stock: parseInt(v.stock) || 0,
                        isDefault: v.isDefault || false,
                        sortOrder: idx,
                    }))
                },
                images: {
                    create: (images || []).map((img: any, idx: number) => ({
                        url: img.url,
                        altText: img.altText || null,
                        isPrimary: idx === 0,
                        sortOrder: idx,
                    }))
                }
            },
            include: productInclude
        });
        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE product
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.product.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// GET single product by ID or slug
router.get('/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;

        let product = await prisma.product.findUnique({
            where: { id: idOrSlug },
            include: productInclude
        });

        if (!product) {
            product = await prisma.product.findUnique({
                where: { slug: idOrSlug },
                include: productInclude
            });
        }

        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Calculate average rating
        const ratingAggregate = await prisma.review.aggregate({
            where: { productId: product.id, status: 'APPROVED' },
            _avg: { rating: true }
        });

        res.json({
            ...product,
            averageRating: ratingAggregate._avg.rating || 0,
            reviewCount: product._count.reviews
        });
    } catch (error) {
        console.error('Fetch product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

export default router;

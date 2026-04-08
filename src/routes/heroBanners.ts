import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../public/uploads/banners');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `hero-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp|gif/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

const router = Router();

// GET active banners (public) — with linked product/category data for auto-pull
router.get('/active', async (_req: Request, res: Response) => {
    try {
        const now = new Date();
        const banners = await prisma.heroBanner.findMany({
            where: {
                isActive: true,
                OR: [
                    { startDate: null, endDate: null },
                    { startDate: null, endDate: { gte: now } },
                    { startDate: { lte: now }, endDate: null },
                    { startDate: { lte: now }, endDate: { gte: now } },
                ],
            },
            orderBy: { sortOrder: 'asc' },
        });

        // Enrich with product/category data for auto-pull
        const enriched = await Promise.all(
            banners.map(async (banner) => {
                let product = null;
                let category = null;

                if (banner.linkType === 'product' && banner.productId) {
                    product = await prisma.product.findUnique({
                        where: { id: banner.productId },
                        select: { name: true, slug: true, description: true },
                    });
                } else if (banner.linkType === 'category' && banner.categoryId) {
                    category = await prisma.category.findUnique({
                        where: { id: banner.categoryId },
                        select: { name: true, slug: true },
                    });
                }

                return {
                    ...banner,
                    // Final title/subtitle: use custom if set, otherwise auto-pull
                    displayTitle: banner.title || (product?.name ?? category?.name ?? 'Welcome'),
                    displaySubtitle: banner.subtitle || (product?.description ?? ''),
                    link:
                        banner.linkType === 'product' && product
                            ? `/product/${product.slug}`
                            : banner.linkType === 'category' && category
                                ? `/category/${category.slug}`
                                : banner.customUrl || '/',
                };
            })
        );

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching active banners:', error);
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

// GET all banners (admin)
router.get('/', async (_req: Request, res: Response) => {
    try {
        const banners = await prisma.heroBanner.findMany({
            orderBy: { sortOrder: 'asc' },
        });

        // Enrich with product/category names
        const enriched = await Promise.all(
            banners.map(async (banner) => {
                let productName = null;
                let categoryName = null;

                if (banner.productId) {
                    const p = await prisma.product.findUnique({
                        where: { id: banner.productId },
                        select: { name: true },
                    });
                    productName = p?.name || null;
                }
                if (banner.categoryId) {
                    const c = await prisma.category.findUnique({
                        where: { id: banner.categoryId },
                        select: { name: true },
                    });
                    categoryName = c?.name || null;
                }

                return { ...banner, productName, categoryName };
            })
        );

        res.json(enriched);
    } catch (error) {
        console.error('Error fetching banners:', error);
        res.status(500).json({ error: 'Failed to fetch banners' });
    }
});

// POST create banner
router.post('/', upload.single('image'), async (req: Request, res: Response) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const imageUrl = `/uploads/banners/${file.filename}`;
        const { title, subtitle, ctaText, linkType, productId, categoryId, customUrl, sortOrder, slideInterval, startDate, endDate } = req.body;

        const banner = await prisma.heroBanner.create({
            data: {
                image: imageUrl,
                title: title || null,
                subtitle: subtitle || null,
                ctaText: ctaText || 'SHOP NOW',
                linkType: linkType || 'product',
                productId: productId || null,
                categoryId: categoryId || null,
                customUrl: customUrl || null,
                sortOrder: parseInt(sortOrder) || 0,
                slideInterval: parseInt(slideInterval) || 6,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
            },
        });
        res.status(201).json(banner);
    } catch (error) {
        console.error('Error creating banner:', error);
        res.status(500).json({ error: 'Failed to create banner' });
    }
});

// PUT update banner
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const file = req.file;
    const { title, subtitle, ctaText, linkType, productId, categoryId, customUrl, sortOrder, slideInterval, startDate, endDate, isActive } = req.body;

    try {
        // If new image, delete old one
        if (file) {
            const existing = await prisma.heroBanner.findUnique({ where: { id: id } });
            if (existing?.image && !existing.image.startsWith('/hero_')) {
                const oldPath = path.join(__dirname, '../../public', existing.image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        // Determine which link fields to keep based on linkType
        const resolvedLinkType = linkType || 'product';
        const linkData = resolvedLinkType === 'product'
            ? { productId: productId || null, categoryId: null, customUrl: null }
            : resolvedLinkType === 'category'
                ? { productId: null, categoryId: categoryId || null, customUrl: null }
                : { productId: null, categoryId: null, customUrl: customUrl || null };

        const banner = await prisma.heroBanner.update({
            where: { id: id },
            data: {
                ...(file && { image: `/uploads/banners/${file.filename}` }),
                title: title || null,
                subtitle: subtitle || null,
                ...(ctaText !== undefined && { ctaText }),
                linkType: resolvedLinkType,
                ...linkData,
                ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
                ...(slideInterval !== undefined && { slideInterval: parseInt(slideInterval) }),
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
            },
        });
        res.json(banner);
    } catch (error) {
        console.error('Error updating banner:', error);
        res.status(500).json({ error: 'Failed to update banner' });
    }
});

// DELETE banner
router.delete('/:id', async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const banner = await prisma.heroBanner.findUnique({ where: { id: id } });
        if (banner?.image && banner.image.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '../../public', banner.image);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        await prisma.heroBanner.delete({ where: { id: id } });
        res.json({ message: 'Banner deleted' });
    } catch (error) {
        console.error('Error deleting banner:', error);
        res.status(500).json({ error: 'Failed to delete banner' });
    }
});

// PATCH toggle active
router.patch('/:id/toggle', async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
        const existing = await prisma.heroBanner.findUnique({ where: { id: id } });
        if (!existing) return res.status(404).json({ error: 'Banner not found' });

        const banner = await prisma.heroBanner.update({
            where: { id: id },
            data: { isActive: !existing.isActive },
        });
        res.json(banner);
    } catch (error) {
        console.error('Error toggling banner:', error);
        res.status(500).json({ error: 'Failed to toggle banner' });
    }
});

export default router;

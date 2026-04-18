import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { userAuthMiddleware } from '../middleware/userAuth';

const router = Router();

// GET all approved reviews
router.get('/', async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { status: 'APPROVED' },
            include: {
                product: {
                    select: { name: true, slug: true, image: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        console.error('Fetch all reviews error:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// GET reviews for a specific product (Approved only)
router.get('/product/:productId', async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: {
                productId: req.params.productId,
                status: 'APPROVED'
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                customerName: true,
                rating: true,
                comment: true,
                isVerified: true,
                adminReply: true,
                repliedAt: true,
                createdAt: true
            }
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// POST a review (User must be logged in)
router.post('/', userAuthMiddleware, async (req, res) => {
    const { productId, rating, comment, customerName } = req.body;
    const userId = req.user?.id;

    if (!productId || !rating || !comment) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Check if already reviewed
        const existing = await prisma.review.findUnique({
            where: {
                userId_productId: {
                    userId: userId!,
                    productId: productId
                }
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        // Check if verified purchaser
        const deliveredOrder = await prisma.order.findFirst({
            where: {
                userId: userId,
                status: 'DELIVERED',
                items: {
                    some: {
                        productId: productId
                    }
                }
            }
        });

        const review = await prisma.review.create({
            data: {
                productId,
                userId,
                customerName: customerName || req.user?.email.split('@')[0] || 'Anonymous',
                rating: parseInt(rating),
                comment,
                isVerified: !!deliveredOrder,
                status: 'PENDING' // Moderation required
            }
        });

        // Create Admin Notification (Low Priority)
        await prisma.notification.create({
            data: {
                isAdmin: true,
                priority: 'LOW',
                type: 'NEW_REVIEW',
                message: `New review submitted for moderation by ${review.customerName}.`,
            }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Failed to create review' });
    }
});

// ADMIN: Get all reviews for moderation
router.get('/admin/all', authMiddleware, async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            include: {
                product: {
                    select: { name: true, slug: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch all reviews' });
    }
});

// ADMIN: Update review status
router.put('/:id/status', authMiddleware, async (req, res) => {
    const { status } = req.body; // APPROVED, REJECTED, PENDING
    try {
        const review = await prisma.review.update({
            where: { id: req.params.id as string },
            data: { status }
        });
        res.json(review);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update review status' });
    }
});

// ADMIN: Add/Update reply
router.put('/:id/reply', authMiddleware, async (req, res) => {
    const { adminReply } = req.body;
    try {
        const review = await prisma.review.update({
            where: { id: req.params.id as string },
            data: {
                adminReply,
                repliedAt: adminReply ? new Date() : null
            }
        });
        res.json(review);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save reply' });
    }
});

// ADMIN: Delete a review
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.review.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete review' });
    }
});

export default router;

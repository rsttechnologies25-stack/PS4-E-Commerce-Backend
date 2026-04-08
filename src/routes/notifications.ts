import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { userAuthMiddleware } from '../middleware/userAuth';

const router = Router();

// --- ADMIN ROUTES ---

// Get all notifications for admin (system-wide alerts)
router.get('/admin/all', authMiddleware, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { isAdmin: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin notifications' });
    }
});

// Mark all admin notifications as read
router.patch('/admin/read-all', authMiddleware, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { isAdmin: true, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

// Mark admin notification as read
router.patch('/admin/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await prisma.notification.update({
            where: { id: req.params.id as string },
            data: { isRead: true }
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update admin notification' });
    }
});

// --- USER ROUTES ---

// Get all notifications for current user
router.get('/user/all', userAuthMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id, isAdmin: false },
            orderBy: { createdAt: 'desc' },
            take: 100 // History limit
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user notifications' });
    }
});

// Get unread count for polling
router.get('/user/unread-count', userAuthMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const count = await prisma.notification.count({
            where: { userId: req.user.id, isRead: false, isAdmin: false }
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// Mark user notification as read
router.patch('/user/:id/read', userAuthMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const notification = await prisma.notification.update({
            where: { id: req.params.id as string, userId: req.user.id },
            data: { isRead: true }
        });
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all user notifications as read
router.patch('/user/read-all', userAuthMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to mark all as read' });
    }
});

export default router;

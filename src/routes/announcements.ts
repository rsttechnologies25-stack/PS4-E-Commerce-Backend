import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET all announcements (public - active only)
router.get('/active', async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching active announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// GET all announcements (admin - all)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const announcements = await prisma.announcement.findMany({
            orderBy: { sortOrder: 'asc' },
        });
        res.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

// POST create announcement
router.post('/', authMiddleware, async (req, res) => {
    const { message, isActive, sortOrder } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const announcement = await prisma.announcement.create({
            data: {
                message,
                isActive: isActive !== undefined ? isActive : true,
                sortOrder: sortOrder || 0,
            },
        });
        res.status(201).json(announcement);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

// PUT update announcement
router.put('/:id', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    const { message, isActive, sortOrder } = req.body;

    try {
        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                ...(message !== undefined && { message }),
                ...(isActive !== undefined && { isActive }),
                ...(sortOrder !== undefined && { sortOrder }),
            },
        });
        res.json(announcement);
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ error: 'Failed to update announcement' });
    }
});

// DELETE announcement
router.delete('/:id', authMiddleware, async (req, res) => {
    const id = req.params.id as string;

    try {
        await prisma.announcement.delete({ where: { id } });
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// PATCH toggle active status
router.patch('/:id/toggle', authMiddleware, async (req, res) => {
    const id = req.params.id as string;

    try {
        const existing = await prisma.announcement.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        const announcement = await prisma.announcement.update({
            where: { id },
            data: { isActive: !existing.isActive },
        });
        res.json(announcement);
    } catch (error) {
        console.error('Error toggling announcement:', error);
        res.status(500).json({ error: 'Failed to toggle announcement' });
    }
});

export default router;

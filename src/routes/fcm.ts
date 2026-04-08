import { Router } from 'express';
import prisma from '../lib/prisma';
import { userAuthMiddleware } from '../middleware/userAuth';

const router = Router();

// Save or update FCM token for the current user
router.post('/fcm-token', userAuthMiddleware, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { token } = req.body;

    if (!token) return res.status(400).json({ error: 'Token is required' });

    try {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { fcmToken: token }
        });
        res.json({ success: true, message: 'FCM token updated successfully' });
    } catch (error) {
        console.error('Update FCM token error:', error);
        res.status(500).json({ error: 'Failed to update FCM token' });
    }
});

export default router;

import { Router } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/auth';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { adminLoginSchema, forgotPasswordSchema, resetPasswordSchema } from '../lib/schemas';
import { sendResetPasswordEmail } from '../services/email';

const router = Router();

const adminAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: { error: 'Too many admin login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', adminAuthLimiter, validate(adminLoginSchema), async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = await bcrypt.compare(password, admin.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET!, { expiresIn: '1d' });
        res.json({ token, admin: { email: admin.email } });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- ADMIN PROFILE ---

// Get current admin info
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const admin = await prisma.admin.findUnique({
            where: { id: (req as any).admin?.id },
            select: { email: true }
        });
        if (!admin) return res.status(404).json({ error: 'Admin not found' });
        res.json(admin);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin info' });
    }
});

// Update admin credentials
router.put('/me', authMiddleware, async (req, res) => {
    const { email, password } = req.body;

    try {
        const data: any = { email };
        if (password) {
            data.password = await bcrypt.hash(password, 12);
        }

        const updated = await prisma.admin.update({
            where: { id: (req as any).admin?.id },
            data,
            select: { email: true }
        });
        console.log('Admin updated successfully');
        res.json(updated);
    } catch (error) {
        console.error('FAILED TO UPDATE ADMIN:', error);
        res.status(500).json({ error: 'Failed to update admin credentials' });
    }
});

// --- CUSTOMER MANAGEMENT ---

// List all customers with stats
router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// Toggle user ban status
router.patch('/users/:id/ban', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const updated = await prisma.user.update({
            where: { id },
            data: { isBanned: !user.isBanned }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to toggle user ban' });
    }
});

// Update admin notes for user
router.patch('/users/:id/notes', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    const { notes } = req.body;
    try {
        const updated = await prisma.user.update({
            where: { id },
            data: { adminNotes: notes }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user notes' });
    }
});

// Export customers to CSV
router.get('/users/export', authMiddleware, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: { orders: true }
                }
            }
        });

        let csv = 'ID,Name,Email,Joined Date,Total Orders,Banned,Internal Notes\n';
        users.forEach(u => {
            const joinedDate = u.createdAt.toISOString().split('T')[0];
            csv += `"${u.id}","${u.name || ''}","${u.email}","${joinedDate}","${u._count.orders}","${u.isBanned}","${(u.adminNotes || '').replace(/"/g, '""')}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to export customers' });
    }
});

// --- BLACKLISTED EMAILS ---

// List blacklisted emails
router.get('/banned-emails', authMiddleware, async (req, res) => {
    try {
        const emails = await prisma.bannedEmail.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(emails);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch blacklisted emails' });
    }
});

// Add email to blacklist
router.post('/banned-emails', authMiddleware, async (req, res) => {
    const { email } = req.body;
    try {
        const blacklisted = await prisma.bannedEmail.create({
            data: { email }
        });
        res.json(blacklisted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to blacklist email' });
    }
});

// Remove email from blacklist
router.delete('/banned-emails/:id', authMiddleware, async (req, res) => {
    const id = req.params.id as string;
    try {
        await prisma.bannedEmail.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove blacklisted email' });
    }
});

// Forgot Password
router.post('/forgot-password', adminAuthLimiter, validate(forgotPasswordSchema), async (req, res) => {
    const { email } = req.body;
    try {
        const admin = await prisma.admin.findUnique({ where: { email } });
        if (!admin) {
            return res.json({ success: true, message: 'If an account exists, a reset link has been sent' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        await prisma.admin.update({
            where: { id: admin.id },
            data: {
                passwordResetToken: hashedToken,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000)
            }
        });

        await sendResetPasswordEmail(email, resetToken, true);
        res.json({ success: true, message: 'Reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process forgot password' });
    }
});

// Reset Password
router.post('/reset-password', adminAuthLimiter, validate(resetPasswordSchema), async (req, res) => {
    const { token, password } = req.body;
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const admin = await prisma.admin.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { gt: new Date() }
            }
        });

        if (!admin) return res.status(400).json({ error: 'Invalid or expired reset token' });

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.admin.update({
            where: { id: admin.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null
            }
        });

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

export default router;

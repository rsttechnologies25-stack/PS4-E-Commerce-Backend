import { Router } from 'express';
import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userAuthMiddleware } from '../middleware/userAuth';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { 
    registerSchema, 
    loginSchema, 
    updateProfileSchema, 
    forgotPasswordSchema, 
    resetPasswordSchema, 
    changePasswordSchema 
} from '../lib/schemas';
import { sendResetPasswordEmail } from '../services/email';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased from 10 to 1000 for development
    message: { error: 'Too many registration/login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Register
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
    const { email, password, name } = req.body;

    try {
        const blacklisted = await prisma.bannedEmail.findUnique({ where: { email } });
        if (blacklisted) return res.status(403).json({ error: 'This email is blacklisted' });

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ error: 'Email already in use' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            }
        });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.USER_JWT_SECRET!, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    console.log(`[${new Date().toISOString()}] Login attempt for: ${email}`);

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.isBanned) return res.status(403).json({ error: 'Your account has been permanently banned' });

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.USER_JWT_SECRET!, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Profile
router.get('/me', userAuthMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user?.id },
            select: {
                id: true,
                email: true,
                name: true,
                customerName: true,
                phoneNumber: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                pincode: true,
                createdAt: true
            }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update Profile
router.put('/me', userAuthMiddleware, validate(updateProfileSchema), async (req, res) => {
    const { name, customerName, phoneNumber, addressLine1, addressLine2, city, state, pincode } = req.body;

    try {
        const updatedUser = await prisma.user.update({
            where: { id: req.user?.id },
            data: {
                name,
                customerName,
                phoneNumber,
                addressLine1,
                addressLine2,
                city,
                state,
                pincode
            },
            select: {
                id: true,
                email: true,
                name: true,
                customerName: true,
                phoneNumber: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                pincode: true,
                createdAt: true
            }
        });
        res.json(updatedUser);
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change Password
router.put('/me/change-password', userAuthMiddleware, validate(changePasswordSchema), async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = await bcrypt.compare(oldPassword, user.password);
        if (!isValid) return res.status(401).json({ error: 'Current password incorrect' });

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.user.update({
            where: { id: req.user?.id },
            data: { password: hashedPassword }
        });

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Forgot Password
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // "Success" to prevent email enumeration
            return res.json({ success: true, message: 'If an account exists, a reset link has been sent' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordResetToken: hashedToken,
                passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            }
        });

        const { frontendUrl } = req.body;
        await sendResetPasswordEmail(email, resetToken, false, frontendUrl);
        res.json({ success: true, message: 'Reset link sent to your email' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process forgot password' });
    }
});

// Reset Password
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res) => {
    const { token, password } = req.body;
    try {
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: hashedToken,
                passwordResetExpires: { gt: new Date() }
            }
        });

        if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.user.update({
            where: { id: user.id },
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

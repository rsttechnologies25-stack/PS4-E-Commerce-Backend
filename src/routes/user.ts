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
    changePasswordSchema,
    sendOtpSchema,
    verifyOtpSchema
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

        if (!user.password) {
            return res.status(400).json({ error: 'Please login using your mobile number and OTP' });
        }

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

        if (!user.password) {
            return res.status(400).json({ error: 'You do not have a password set. Please use password reset to set a password.' });
        }

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

// Delete Account
router.delete('/me', userAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // 1. Delete cart items
        await prisma.cartItem.deleteMany({ where: { userId } });

        // 2. Dissociate/Anonymize reviews (set userId to null, customerName to Anonymous)
        await prisma.review.updateMany({
            where: { userId },
            data: {
                userId: null,
                customerName: 'Anonymous'
            }
        });

        // 3. Delete notifications
        await prisma.notification.deleteMany({ where: { userId } });

        // 4. Delete orders (order items are cascade deleted automatically by the database schema)
        await prisma.order.deleteMany({ where: { userId } });

        // 5. Delete the user
        await prisma.user.delete({ where: { id: userId } });

        res.json({ success: true, message: 'Your account and all associated data have been permanently deleted.' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account. Please try again later.' });
    }
});

// Send OTP
router.post('/send-otp', validate(sendOtpSchema), async (req, res) => {
    const { phoneNumber } = req.body;
    
    try {
        // Generate a 6-digit verification code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        const hashedOtp = await bcrypt.hash(otp, 10);

        let user = await prisma.user.findUnique({ where: { phoneNumber } });
        
        if (!user) {
            // New user registration via phone number
            user = await prisma.user.create({
                data: {
                    phoneNumber,
                    otp: hashedOtp,
                    otpExpires: expiry
                }
            });
        } else {
            if (user.isBanned) {
                return res.status(403).json({ error: 'Your account has been permanently banned' });
            }
            
            // Update existing user with OTP fields
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    otp: hashedOtp,
                    otpExpires: expiry
                }
            });
        }

        // Send OTP via 2Factor.in SMS Gateway
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey) {
            console.warn('[Warning] TWO_FACTOR_API_KEY is not defined in environment variables.');
        } else {
                const templateName = process.env.TWO_FACTOR_TEMPLATE || 'OTP1';
                const response = await fetch(`https://2factor.in/API/V1/${apiKey}/SMS/${phoneNumber}/${otp}/${templateName}`);
                const result: any = await response.json();
                if (result.Status !== 'Success') {
                    console.error('2Factor API error details:', result);
                    throw new Error(result.Details || 'Failed to send SMS');
                }
            } catch (smsError) {
                console.error('Failed to send OTP via SMS:', smsError);
                // In development, log the error and allow proceeding so developers don't get blocked
                if (process.env.NODE_ENV !== 'development') {
                    return res.status(500).json({ error: 'Failed to deliver OTP SMS. Please try again.' });
                }
            }
        }

        // Always print OTP in console in development mode to save API credits and ease testing
        if (process.env.NODE_ENV === 'development') {
            console.log(`\n[DEV ONLY] OTP code for ${phoneNumber} is: ${otp}\n`);
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
    }
});

// Verify OTP
router.post('/verify-otp', validate(verifyOtpSchema), async (req, res) => {
    const { phoneNumber, otp } = req.body;
    
    try {
        const user = await prisma.user.findUnique({ where: { phoneNumber } });
        if (!user) {
            return res.status(404).json({ error: 'User account not found' });
        }

        if (user.isBanned) {
            return res.status(403).json({ error: 'Your account has been permanently banned' });
        }

        if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
            return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
        }

        const isValid = await bcrypt.compare(otp, user.otp);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid OTP code' });
        }

        // OTP is valid. Clear OTP fields
        await prisma.user.update({
            where: { id: user.id },
            data: {
                otp: null,
                otpExpires: null
            }
        });

        // Generate session JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            process.env.USER_JWT_SECRET!, 
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.name || 'Customer',
                phoneNumber: user.phoneNumber
            } 
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
    }
});

export default router;

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { securityContext } from '../lib/context';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Auth token required' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;

        // Verify admin exists in database
        const adminExists = await prisma.admin.findUnique({
            where: { id: decoded.id },
            select: { id: true }
        });

        if (!adminExists) {
            return res.status(401).json({ error: 'Admin session expired. Please log in again.' });
        }

        (req as any).admin = decoded;

        // Update security context for RLS
        const store = securityContext.getStore();
        if (store) {
            store.userId = decoded.id;
            store.isAdmin = true;
        }

        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

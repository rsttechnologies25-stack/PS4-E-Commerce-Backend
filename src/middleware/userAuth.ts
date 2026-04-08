import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { securityContext } from '../lib/context';

interface UserPayload {
    id: string;
    email: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}

export const userAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.USER_JWT_SECRET!) as UserPayload;

        // Verify user exists in database to prevent P2003 FK errors after DB resets
        const userExists = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true }
        });

        if (!userExists) {
            return res.status(401).json({ error: 'User session expired. Please log in again.' });
        }

        req.user = decoded;
        
        // Update security context for RLS
        const store = securityContext.getStore();
        if (store) {
            store.userId = decoded.id;
            store.isAdmin = false;
        }

        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

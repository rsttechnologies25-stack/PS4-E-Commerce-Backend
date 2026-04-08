import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const branches = await prisma.branch.findMany();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { name, address, city, phone, image, isHeadOffice, latitude, longitude } = req.body;
    try {
        const branch = await prisma.branch.create({
            data: { name, address, city, phone, image, isHeadOffice, latitude: latitude ? parseFloat(latitude) : null, longitude: longitude ? parseFloat(longitude) : null }
        });
        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create branch' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const { name, address, city, phone, image, isHeadOffice, latitude, longitude } = req.body;
    try {
        const branch = await prisma.branch.update({
            where: { id: req.params.id as string },
            data: { name, address, city, phone, image, isHeadOffice, latitude: latitude ? parseFloat(latitude) : null, longitude: longitude ? parseFloat(longitude) : null }
        });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update branch' });
    }
});


router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await prisma.branch.delete({ where: { id: req.params.id as string } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete branch' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: req.params.id as string }
        });
        if (!branch) return res.status(404).json({ error: 'Branch not found' });
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branch' });
    }
});

export default router;

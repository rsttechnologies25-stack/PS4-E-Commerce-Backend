import { PrismaClient } from '../src/generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const SNAPSHOT_DIR = path.join(__dirname, '../data/master-snapshot');

async function readSnapshot(fileName: string) {
    const filePath = path.join(SNAPSHOT_DIR, `${fileName}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

async function main() {
    console.log('--- Starting Master Data Restore (Seed) ---\n');

    // 1. Categories (Handling Parents/Children)
    const categories = await readSnapshot('categories');
    if (categories) {
        console.log('Seeding Categories...');
        // Clear old ones first to avoid constraint errors
        await prisma.category.deleteMany();
        
        // Split into parents and children for safe insertion
        const parents = categories.filter((c: any) => !c.parentId);
        const children = categories.filter((c: any) => c.parentId);

        for (const cat of parents) {
            await prisma.category.create({ data: cat });
        }
        for (const cat of children) {
            await prisma.category.create({ data: cat });
        }
    }

    // 2. Products with Variants and Images
    const productsFull = await readSnapshot('products_full');
    if (productsFull) {
        console.log('Seeding Products, Variants, and Images...');
        await prisma.product.deleteMany();
        
        for (const p of productsFull) {
            const { variants, images, ...productData } = p;
            
            // Clean variants and images: Remove productId as it's handled by the nested create
            const cleanVariants = variants?.map(({ productId, ...v }: any) => v) || [];
            const cleanImages = images?.map(({ productId, ...img }: any) => img) || [];

            await prisma.product.create({
                data: {
                    ...productData,
                    variants: { create: cleanVariants },
                    images: { create: cleanImages }
                }
            });
        }
    }

    // 3. Site Config & Content
    const siteSettings = await readSnapshot('site_settings');
    if (siteSettings) {
        console.log('Seeding Site Settings...');
        await prisma.siteSettings.deleteMany();
        for (const s of siteSettings) await prisma.siteSettings.create({ data: s });
    }

    const banners = await readSnapshot('hero_banners');
    if (banners) {
        console.log('Seeding Hero Banners...');
        await prisma.heroBanner.deleteMany();
        for (const b of banners) await prisma.heroBanner.create({ data: b });
    }

    const branches = await readSnapshot('branches');
    if (branches) {
        console.log('Seeding Branches...');
        await prisma.branch.deleteMany();
        for (const b of branches) await prisma.branch.create({ data: b });
    }

    const shippingRules = await readSnapshot('shipping_rules');
    if (shippingRules) {
        console.log('Seeding Shipping Rules...');
        await prisma.shippingRule.deleteMany();
        for (const r of shippingRules) await prisma.shippingRule.create({ data: r });
    }

    const coupons = await readSnapshot('coupons');
    if (coupons) {
        console.log('Seeding Coupons...');
        await prisma.coupon.deleteMany();
        for (const c of coupons) await prisma.coupon.create({ data: c });
    }

    const announcements = await readSnapshot('announcements');
    if (announcements) {
        console.log('Seeding Announcements...');
        await prisma.announcement.deleteMany();
        for (const a of announcements) await prisma.announcement.create({ data: a });
    }

    const pairings = await readSnapshot('category_pairings');
    if (pairings) {
        console.log('Seeding Category Pairings...');
        await prisma.categoryPairing.deleteMany();
        for (const p of pairings) await prisma.categoryPairing.create({ data: p });
    }

    // 4. Operational Data
    const users = await readSnapshot('users');
    if (users) {
        console.log('Seeding Users...');
        await prisma.user.deleteMany();
        for (const u of users) await prisma.user.create({ data: u });
    }

    const ordersFull = await readSnapshot('orders_full');
    if (ordersFull) {
        console.log('Seeding Orders and Order Items...');
        await prisma.order.deleteMany();
        for (const o of ordersFull) {
            const { items, ...orderData } = o;
            // Clean items: Remove orderId as it's handled by the nested create
            const cleanItems = items?.map(({ orderId, ...item }: any) => item) || [];
            await prisma.order.create({
                data: {
                    ...orderData,
                    items: { create: cleanItems }
                }
            });
        }
    }

    console.log('\n--- Restore Complete! ---');
    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Seed Failed:', err);
    process.exit(1);
});

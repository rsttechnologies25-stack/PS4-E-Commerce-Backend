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

async function clearDatabase() {
    console.log('Clearing existing database...');
    // Delete in order to avoid FK violations
    await prisma.notification.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.bannedEmail.deleteMany();
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.heroBanner.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.categoryPairing.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.shippingRule.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.whatsAppTemplate.deleteMany();
    await prisma.siteSettings.deleteMany();
    console.log('[✔] Database cleared.\n');
}

async function main() {
    console.log('--- Starting Master Data Restore (Seed) ---\n');

    await clearDatabase();

    // 0. Admins
    const admins = await readSnapshot('admins');
    if (admins) {
        console.log('Seeding Admins...');
        for (const a of admins) await prisma.admin.create({ data: a });
    }
    
    const bannedEmails = await readSnapshot('banned_emails');
    if (bannedEmails) {
        console.log('Seeding Banned Emails...');
        for (const e of bannedEmails) await prisma.bannedEmail.create({ data: e });
    }

    // 1. Categories (Handling Parents/Children)
    const categories = await readSnapshot('categories');
    if (categories) {
        console.log('Seeding Categories...');
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
        for (const s of siteSettings) await prisma.siteSettings.create({ data: s });
    }

    const banners = await readSnapshot('hero_banners');
    if (banners) {
        console.log('Seeding Hero Banners...');
        for (const b of banners) await prisma.heroBanner.create({ data: b });
    }

    const branches = await readSnapshot('branches');
    if (branches) {
        console.log('Seeding Branches...');
        for (const b of branches) await prisma.branch.create({ data: b });
    }

    const shippingRules = await readSnapshot('shipping_rules');
    if (shippingRules) {
        console.log('Seeding Shipping Rules...');
        for (const r of shippingRules) await prisma.shippingRule.create({ data: r });
    }

    const coupons = await readSnapshot('coupons');
    if (coupons) {
        console.log('Seeding Coupons...');
        for (const c of coupons) await prisma.coupon.create({ data: c });
    }

    const announcements = await readSnapshot('announcements');
    if (announcements) {
        console.log('Seeding Announcements...');
        for (const a of announcements) await prisma.announcement.create({ data: a });
    }

    const pairings = await readSnapshot('category_pairings');
    if (pairings) {
        console.log('Seeding Category Pairings...');
        for (const p of pairings) await prisma.categoryPairing.create({ data: p });
    }

    // 4. Operational Data
    const users = await readSnapshot('users');
    if (users) {
        console.log('Seeding Users...');
        for (const u of users) await prisma.user.create({ data: u });
    }

    const ordersFull = await readSnapshot('orders_full');
    if (ordersFull) {
        console.log('Seeding Orders and Order Items...');
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

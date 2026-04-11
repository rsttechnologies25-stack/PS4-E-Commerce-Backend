import { PrismaClient } from '../src/generated/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const EXPORT_DIR = path.join(__dirname, '../data/master-snapshot');

async function exportTable(tableName: string, data: any[]) {
    if (!fs.existsSync(EXPORT_DIR)) {
        fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
    const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[✔] Exported ${tableName} (${data.length} records)`);
}

async function main() {
    console.log('--- Starting Master Data Export ---\n');

    // 1. Core Catalog
    await exportTable('admins', await prisma.admin.findMany());
    await exportTable('categories', await prisma.category.findMany());
    
    // Products with nested relations for easier portability
    const products = await prisma.product.findMany({
        include: {
            variants: true,
            images: true
        }
    });
    await exportTable('products_full', products);

    // 2. Site Configuration
    await exportTable('site_settings', await prisma.siteSettings.findMany());
    await exportTable('hero_banners', await prisma.heroBanner.findMany());
    await exportTable('announcements', await prisma.announcement.findMany());
    await exportTable('branches', await prisma.branch.findMany());
    await exportTable('shipping_rules', await prisma.shippingRule.findMany());
    await exportTable('coupons', await prisma.coupon.findMany());
    await exportTable('category_pairings', await prisma.categoryPairing.findMany());
    await exportTable('whats_app_templates', await prisma.whatsAppTemplate.findMany());

    // 3. User & Transactional Data
    await exportTable('users', await prisma.user.findMany());
    await exportTable('orders_full', await prisma.order.findMany({
        include: { items: true }
    }));
    await exportTable('reviews', await prisma.review.findMany());
    await exportTable('notifications', await prisma.notification.findMany());
    await exportTable('banned_emails', await prisma.bannedEmail.findMany());

    console.log('\n--- Export Complete! ---');
    console.log(`Files saved in: ${EXPORT_DIR}`);

    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Export Failed:', err);
    prisma.$disconnect();
    process.exit(1);
});

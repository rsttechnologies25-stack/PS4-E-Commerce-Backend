import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Data Inventory ---');
    
    const inventory = {
        Categories: await prisma.category.count(),
        Products: await prisma.product.count(),
        ProductVariants: await prisma.productVariant.count(),
        ProductImages: await prisma.productImage.count(),
        HeroBanners: await prisma.heroBanner.count(),
        Coupons: await prisma.coupon.count(),
        ShippingRules: await prisma.shippingRule.count(),
        Branches: await prisma.branch.count(),
        Announcements: await prisma.announcement.count(),
        CategoryPairings: await prisma.categoryPairing.count(),
        WhatsAppTemplates: await prisma.whatsAppTemplate.count(),
        Users: await prisma.user.count(),
        Orders: await prisma.order.count(),
        OrderItems: await prisma.orderItem.count(),
        Reviews: await prisma.review.count(),
        Notifications: await prisma.notification.count(),
        BannedEmails: await prisma.bannedEmail.count(),
        SiteSettings: await prisma.siteSettings.count(),
    };

    console.table(inventory);

    // Sample data for key entities
    const categories = await prisma.category.findMany({ select: { name: true }, take: 5 });
    console.log('\nSample Categories:', categories.map(c => c.name).join(', '));

    const products = await prisma.product.findMany({ select: { name: true }, take: 5 });
    console.log('Sample Products:', products.map(p => p.name).join(', '));

    const orders = await prisma.order.findMany({ select: { id: true, totalAmount: true }, take: 3 });
    console.log('Recent Orders:', orders.map(o => `ID: ${o.id}, Amount: ${o.totalAmount}`).join(' | '));

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

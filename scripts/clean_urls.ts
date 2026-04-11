import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting URL Cleanup Migration ---\n');

    const LOCALHOST = 'http://localhost:4000';

    // 1. Products
    const products = await prisma.product.findMany({
        where: { image: { contains: LOCALHOST } }
    });
    console.log(`Found ${products.length} products with localhost URLs`);
    for (const p of products) {
        await prisma.product.update({
            where: { id: p.id },
            data: { image: p.image?.replace(LOCALHOST, '') }
        });
    }

    // 2. Product Images
    const productImages = await prisma.productImage.findMany({
        where: { url: { contains: LOCALHOST } }
    });
    console.log(`Found ${productImages.length} product images with localhost URLs`);
    for (const img of productImages) {
        await prisma.productImage.update({
            where: { id: img.id },
            data: { url: img.url.replace(LOCALHOST, '') }
        });
    }

    // 3. Categories
    const categories = await prisma.category.findMany({
        where: { image: { contains: LOCALHOST } }
    });
    console.log(`Found ${categories.length} categories with localhost URLs`);
    for (const c of categories) {
        await prisma.category.update({
            where: { id: c.id },
            data: { image: c.image?.replace(LOCALHOST, '') }
        });
    }

    // 4. Hero Banners
    const banners = await prisma.heroBanner.findMany({
        where: { image: { contains: LOCALHOST } }
    });
    console.log(`Found ${banners.length} hero banners with localhost URLs`);
    for (const b of banners) {
        await prisma.heroBanner.update({
            where: { id: b.id },
            data: { image: b.image.replace(LOCALHOST, '') }
        });
    }

    // 5. Branches
    const branches = await prisma.branch.findMany({
        where: { image: { contains: LOCALHOST } }
    });
    console.log(`Found ${branches.length} branches with localhost URLs`);
    for (const b of branches) {
        await prisma.branch.update({
            where: { id: b.id },
            data: { image: b.image?.replace(LOCALHOST, '') }
        });
    }

    console.log('\n--- Cleanup Complete! ---');
    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Cleanup Failed:', err);
    process.exit(1);
});

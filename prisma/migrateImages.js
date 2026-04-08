/**
 * Migration script: Convert existing Product.image into ProductImage rows.
 * Run once: node prisma/migrateImages.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        include: { images: true }
    });

    let migrated = 0;
    let skipped = 0;

    for (const product of products) {
        if (product.images.length > 0) {
            skipped++;
            continue;
        }

        if (!product.image) {
            skipped++;
            continue;
        }

        await prisma.productImage.create({
            data: {
                productId: product.id,
                url: product.image,
                isPrimary: true,
                sortOrder: 0,
            }
        });

        migrated++;
        console.log(`✓ Migrated image: ${product.name}`);
    }

    console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

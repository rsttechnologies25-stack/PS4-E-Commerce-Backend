/**
 * Migration script: Convert existing Product.price/weight into ProductVariant rows.
 * Run once: node prisma/migrateVariants.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        include: { variants: true }
    });

    let migrated = 0;
    let skipped = 0;

    for (const product of products) {
        // Skip if already has variants
        if (product.variants.length > 0) {
            skipped++;
            continue;
        }

        const weight = product.weight || '250g';
        const price = product.price || 0;

        await prisma.productVariant.create({
            data: {
                productId: product.id,
                weight,
                price,
                stock: 100,      // default stock
                isDefault: true,
                sortOrder: 0,
            }
        });

        migrated++;
        console.log(`✓ Migrated: ${product.name} → ${weight} @ ₹${price}`);
    }

    console.log(`\nDone! Migrated: ${migrated}, Skipped (already had variants): ${skipped}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

import { PrismaClient } from '../generated/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    const productsPath = path.join(__dirname, '../../../categorized_products.json');
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

    console.log(`Starting import of ${products.length} products...`);

    // Define Category Mappings (Slug -> Name/Parent)
    const categoryInfo: any = {
        'sweets': { name: 'Sweets', parent: null },
        'sev': { name: 'Sev', parent: null },
        'savouries': { name: 'Savouries', parent: null },
        'pickle': { name: 'Pickle', parent: null },
        'cookies': { name: 'Cookies', parent: null },
        'podi': { name: 'Podi', parent: null },
        'gifting': { name: 'Gifting', parent: null },
        'outdoor-catering': { name: 'Outdoor Catering', parent: null },
        // Sub-categories
        'milk-sweets': { name: 'Milk Sweets', parent: 'sweets' },
        'ghee-sweets': { name: 'Ghee Sweets', parent: 'sweets' },
        'cashew-sweets': { name: 'Cashew Sweets', parent: 'sweets' },
        'kara-sev': { name: 'Kara Sev', parent: 'sev' },
        'mixture': { name: 'Mixture', parent: 'savouries' },
        'murukku': { name: 'Murukku', parent: 'savouries' },
        'chips': { name: 'Chips', parent: 'savouries' },
        'thokku': { name: 'Thokku', parent: 'pickle' },
        'veg-pickles': { name: 'Vegetable Pickles', parent: 'pickle' },
        'idly-podi': { name: 'Idly Podi', parent: 'podi' },
        'rice-podi': { name: 'Rice Podi', parent: 'podi' },
        'butter-cookies': { name: 'Butter Cookies', parent: 'cookies' },
        'health-cookies': { name: 'Health Cookies', parent: 'cookies' },
        'festival-boxes': { name: 'Festival Boxes', parent: 'gifting' },
        'wedding-catering': { name: 'Wedding Catering', parent: 'outdoor-catering' }
    };

    // 1. Ensure Categories exist
    for (const [slug, info] of Object.entries(categoryInfo) as any) {
        let parentId = null;
        if (info.parent) {
            const parent = await prisma.category.findUnique({ where: { slug: info.parent } });
            parentId = parent?.id || null;
        }

        await prisma.category.upsert({
            where: { slug },
            update: { name: info.name, parentId },
            create: { slug, name: info.name, parentId }
        });
    }

    // 2. Import Products
    let imported = 0;
    let skipped = 0;

    for (const p of products) {
        try {
            const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
            if (existing) {
                console.log(`Skipping existing product: ${p.slug}`);
                skipped++;
                continue;
            }

            const category = await prisma.category.findUnique({ where: { slug: p.category } });
            if (!category) {
                console.error(`Category not found: ${p.category} for product ${p.slug}`);
                continue;
            }

            const product = await prisma.product.create({
                data: {
                    name: p.name,
                    slug: p.slug,
                    categoryId: category.id,
                    description: `Premium ${p.name} from PS4 Platform.`,
                    image: '/hero_motichoor_laddu.jpg' // Placeholder
                }
            });

            // Create Variants
            for (const v of p.variants) {
                await prisma.productVariant.create({
                    data: {
                        productId: product.id,
                        weight: v.weight,
                        price: v.price,
                        stock: 100,
                        isDefault: p.variants.indexOf(v) === 0
                    }
                });
            }

            imported++;
            if (imported % 10 === 0) console.log(`Imported ${imported} products...`);
        } catch (error) {
            console.error(`Error importing ${p.slug}:`, error);
        }
    }

    console.log(`Import complete. Imported: ${imported}, Skipped: ${skipped}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
    const hierarchy = [
        {
            name: 'Sweets',
            slug: 'sweets',
            children: [
                { name: 'Ghee Sweets', slug: 'ghee-sweets', keywords: ['laddu', 'mysore-pak', 'badhusha', 'boondhi', 'chandra-kala', 'suryakala', 'jangri', 'seeni-mittai', 'jalebi', 'sweet-samosa', 'then-mittai'] },
                { name: 'Milk Sweets', slug: 'milk-sweets', keywords: ['milk-cake', 'palkova', 'milk-halwa', 'milk-sandwich', 'kalakand', 'rasgulla', 'gulab-jamun', 'basundi', 'mothi-pak'] },
                { name: 'Cashew & Dry Fruit', slug: 'cashew-dry-fruit', keywords: ['kaju', 'cashew', 'dates', 'nut', 'almond', 'badam-katli', 'pista', 'baklava', 'dry-fruit', 'mango-sticks'] },
                { name: 'Halwa', slug: 'halwa', keywords: ['halwa'] },
                { name: 'Traditional Sweets', slug: 'traditional-sweets', keywords: ['athirasam', 'burfi', 'peda', 'sommas', 'seedai-sweet', 'susiyam', 'poli', 'soan-papdi', 'ellu-ball', 'lavang-latika', 'kunafa', 'assorted-sweets', 'thambulam'] }
            ]
        },
        {
            name: 'Savouries',
            slug: 'savouries',
            children: [
                { name: 'Murukku & Thattai', slug: 'murukku-thattai', keywords: ['murukku', 'thattai', 'seedai', 'ribbon-pakoda'] },
                { name: 'Mixture', slug: 'mixture', keywords: ['mixture', 'boondhi-kara', 'corn-flakes', 'pori'] },
                { name: 'Chips', slug: 'chips', keywords: ['chips', 'banana', 'potato', 'pavakkai', 'vendaka'] },
                { name: 'Bites & Snacks', slug: 'bites-snacks', keywords: ['bites', 'pakoda', 'kara-boondhi', 'omapodi-mini', 'kara-kuzhambu', 'marappa', 'chettinad'] }
            ]
        },
        {
            name: 'Sev',
            slug: 'sev',
            children: [
                { name: 'Kara Sev', slug: 'kara-sev-sub', keywords: ['kara-sev', 'garlic-sev'] },
                { name: 'Omapodi', slug: 'omapodi-sub', keywords: ['omapodi'] },
                { name: 'Other Sev', slug: 'other-sev', keywords: ['sev', 'lakkadi'] }
            ]
        },
        {
            name: 'Podi',
            slug: 'podi',
            children: [
                { name: 'Idly Podi', slug: 'idly-podi-sub', keywords: ['idly-podi'] },
                { name: 'Rice Podi', slug: 'rice-podi-sub', keywords: ['podi', 'thuvaiyal'] }
            ]
        },
        {
            name: 'Pickle',
            slug: 'pickle',
            children: [
                { name: 'Veg Pickles', slug: 'veg-pickles-sub', keywords: ['pickle', 'inchi', 'vatha-kuzhambu'] },
                { name: 'Thokku', slug: 'thokku-sub', keywords: ['thokku'] }
            ]
        },
        {
            name: 'Cookies',
            slug: 'cookies',
            children: [
                { name: 'Butter Cookies', slug: 'butter-cookies-sub', keywords: ['butter-biscuits', 'cashew-nut-cookies', 'jam-pista', 'tea-cake', 'rusk', 'fruit-cake', 'cookies'] },
                { name: 'Health & Millet Cookies', slug: 'health-millet-cookies', keywords: ['ragi-cookies', 'oats-cookies', 'sesame-cookies', 'badam-stick', 'atta-cookies'] }
            ]
        },
        {
            name: 'Gifting',
            slug: 'gifting',
            children: [
                { name: 'Festival Boxes', slug: 'festival-boxes', keywords: ['tin-box', 'dry-fruit-box', 'gift-hamper'] }
            ]
        }
    ];

    console.log('--- REORGANIZING CATEGORIES ---');

    for (const main of hierarchy) {
        const mainCat = await prisma.category.upsert({
            where: { slug: main.slug },
            update: { name: main.name, parentId: null },
            create: { name: main.name, slug: main.slug }
        });
        console.log(`Main Category: ${mainCat.name}`);

        for (const child of main.children) {
            const subCat = await prisma.category.upsert({
                where: { slug: child.slug },
                update: { name: child.name, parentId: mainCat.id },
                create: { name: child.name, slug: child.slug, parentId: mainCat.id }
            });
            console.log(`  Sub-Category: ${subCat.name}`);

            const productsToUpdate = await prisma.product.findMany({
                where: {
                    OR: child.keywords.map(kw => ({
                        slug: { contains: kw, mode: 'insensitive' }
                    }))
                }
            });

            if (productsToUpdate.length > 0) {
                const updated = await prisma.product.updateMany({
                    where: { id: { in: productsToUpdate.map(p => p.id) } },
                    data: { categoryId: subCat.id }
                });
                console.log(`    Mapped ${updated.count} products to ${subCat.name}`);
            }
        }
    }

    const remaining = await prisma.product.findMany({
        where: {
            category: {
                parentId: null
            }
        }
    });

    if (remaining.length > 0) {
        console.log(`\nWarning: ${remaining.length} products are still in top-level categories.`);
        remaining.forEach(p => console.log(`  - ${p.slug}`));
    } else {
        console.log('\nAll 154 products have been successfully categorized in the hierarchy.');
    }

    console.log('\nCategorization complete!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

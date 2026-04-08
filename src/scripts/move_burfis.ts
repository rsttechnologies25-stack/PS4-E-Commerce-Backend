import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Burfi categorization fix...');

    // 1. Get Parent Category (Sweets)
    const sweetsCat = await prisma.category.findUnique({ where: { slug: 'sweets' } });
    if (!sweetsCat) {
        console.error('Sweets category not found!');
        process.exit(1);
    }

    // 2. Create/Upsert Burfi Category
    const burfiCat = await prisma.category.upsert({
        where: { slug: 'burfi' },
        update: { name: 'Burfi', parentId: sweetsCat.id },
        create: { 
            slug: 'burfi', 
            name: 'Burfi', 
            parentId: sweetsCat.id,
            image: '/hero_motichoor_laddu.jpg' // Placeholder
        }
    });
    console.log(`Burfi category ready (ID: ${burfiCat.id})`);

    // 3. Move products
    // Find products containing 'burfi' in slug that are in 'ghee-sweets'
    const gheeSweetsCat = await prisma.category.findUnique({ where: { slug: 'ghee-sweets' } });
    if (!gheeSweetsCat) {
        console.error('Ghee Sweets category not found!');
        process.exit(1);
    }

    const result = await prisma.product.updateMany({
        where: {
            slug: { contains: 'burfi' },
            categoryId: gheeSweetsCat.id
        },
        data: {
            categoryId: burfiCat.id
        }
    });

    console.log(`Moved ${result.count} burfi products to the new Burfi category.`);
    console.log('Fix complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

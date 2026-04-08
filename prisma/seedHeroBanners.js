const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Find the motichoor laddu and kaju katli products
    const motichoor = await prisma.product.findFirst({
        where: { slug: { contains: 'motichur' } },
        select: { id: true, name: true, slug: true },
    });

    const kajuKatli = await prisma.product.findFirst({
        where: { slug: { contains: 'kaju' } },
        select: { id: true, name: true, slug: true },
    });

    console.log('Found products:', { motichoor, kajuKatli });

    // Clear existing hero banners
    await prisma.heroBanner.deleteMany();

    // Seed the existing hardcoded hero slides
    const banners = [];

    if (motichoor) {
        banners.push({
            image: '/hero_motichoor_laddu.jpg',
            title: 'Signature Motichoor Laddu',
            subtitle: 'The Soul of Perambur Sri Srinivasa. Pure Ghee. Traditionally Crafted.',
            ctaText: 'ORDER NOW',
            linkType: 'product',
            productId: motichoor.id,
            sortOrder: 0,
            slideInterval: 6,
            isActive: true,
        });
    }

    if (kajuKatli) {
        banners.push({
            image: '/hero_kaju_katli.jpg',
            title: 'Premium Kaju Katli',
            subtitle: 'Exquisite Cashew Delight. Melt-in-your-mouth Perfection.',
            ctaText: 'SHOP NOW',
            linkType: 'product',
            productId: kajuKatli.id,
            sortOrder: 1,
            slideInterval: 6,
            isActive: true,
        });
    }

    for (const banner of banners) {
        await prisma.heroBanner.create({ data: banner });
        console.log(`Created banner: ${banner.title}`);
    }

    console.log(`Seeded ${banners.length} hero banners`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

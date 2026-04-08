import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
    const slugsToDelete = [
        'rassgulla-bowl',   // typo with double s
        'andra-idly-podi'   // anomaly/duplicate
    ];

    console.log('Cleaning up anomalous products...');

    for (const slug of slugsToDelete) {
        const deleted = await prisma.product.deleteMany({
            where: { slug }
        });
        console.log(`Deleted ${deleted.count} records for slug: ${slug}`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

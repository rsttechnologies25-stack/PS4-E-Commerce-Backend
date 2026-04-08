import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
    const cats = await prisma.category.findMany({
        include: {
            parent: true,
            children: true,
            _count: {
                select: { products: true }
            }
        }
    });

    console.log('--- CATEGORY LIST ---');
    cats.forEach(c => {
        console.log(`${c.slug}: ${c.name}`);
        console.log(`  - Parent: ${c.parent?.name || 'None'}`);
        console.log(`  - Products: ${c._count.products}`);
        if (c.children.length > 0) {
            console.log(`  - Children: ${c.children.map(child => child.slug).join(', ')}`);
        }
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Branch Image URL Migration ---\n');

    const OLD_CDN_PREFIXES = [
        'https://perambursrinivasa.com/cdn/shop/files/',
        'https://perambursrinivasa.co.in/cdn/shop/files/',
        'http://perambursrinivasa.com/cdn/shop/files/',
        'http://perambursrinivasa.co.in/cdn/shop/files/',
    ];

    const NEW_CDN_PREFIX = 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/';

    const branches = await prisma.branch.findMany();
    console.log(`Found ${branches.length} branches to check.`);

    let updatedCount = 0;

    for (const b of branches) {
        if (!b.image) continue;

        let newImageUrl = b.image;
        let matched = false;

        for (const prefix of OLD_CDN_PREFIXES) {
            if (b.image.startsWith(prefix)) {
                newImageUrl = b.image.replace(prefix, NEW_CDN_PREFIX);
                matched = true;
                break;
            }
        }

        if (matched) {
            console.log(`Updating ${b.name}: \n  Old: ${b.image} \n  New: ${newImageUrl}\n`);
            await prisma.branch.update({
                where: { id: b.id },
                data: { image: newImageUrl }
            });
            updatedCount++;
        }
    }

    console.log(`\nMigration complete. Updated ${updatedCount} branch image URLs.`);
    await prisma.$disconnect();
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});

import { PrismaClient } from './generated/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const listPath = path.join(__dirname, '../../Product List.txt');
    const content = fs.readFileSync(listPath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');

    const expectedSlugs = new Set<string>();
    const expectedNames = new Map<string, string>();
    let currentSlug = "";

    for (const line of lines) {
        if (!(line.includes('Gram') || line.includes('Kilogram') || line.includes('Pcs') || line.includes('Qty') || line.includes('Nos'))) {
            currentSlug = line;
            expectedSlugs.add(currentSlug);
            expectedNames.set(currentSlug, line);
        }
    }

    const dbProducts = await prisma.product.findMany({
        select: { slug: true, name: true }
    });
    const dbSlugs = new Set(dbProducts.map((p: any) => p.slug));

    console.log('--- RECONCILIATION REPORT ---');
    console.log(`Total unique names in file: ${expectedSlugs.size}`);
    console.log(`Total products in DB: ${dbProducts.length}`);

    const missingInDB = [...expectedSlugs].filter(slug => !dbSlugs.has(slug));
    const extraInDB = [...dbSlugs].filter(slug => !expectedSlugs.has(slug));

    console.log('\nProducts missing in DB:');
    if (missingInDB.length > 0) {
        missingInDB.forEach(slug => console.log(`- ${slug}`));
    } else {
        console.log('None');
    }

    console.log('\nProducts in DB not in file:');
    if (extraInDB.length > 0) {
        extraInDB.forEach(slug => {
            const prod = dbProducts.find((p: any) => p.slug === slug);
            console.log(`- ${slug} (${prod?.name})`);
        });
    } else {
        console.log('None');
    }

    // Check for duplicates in file
    const allFileSlugs = lines.filter(l => !(l.includes('Gram') || l.includes('Kilogram') || l.includes('Pcs') || l.includes('Qty') || l.includes('Nos')));
    const duplicateList = allFileSlugs.filter((item, index) => allFileSlugs.indexOf(item) !== index);
    console.log('\nDuplicate items found in Product List.txt:');
    if (duplicateList.length > 0) {
        console.log([...new Set(duplicateList)].join(', '));
    } else {
        console.log('None');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

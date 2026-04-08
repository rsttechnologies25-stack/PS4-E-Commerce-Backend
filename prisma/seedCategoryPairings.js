const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Fetch all top-level categories
    const categories = await prisma.category.findMany({
        where: { parentId: null },
        select: { id: true, name: true, slug: true },
    });

    const findCat = (slug) => categories.find(c => c.slug === slug);

    const sweets = findCat('sweets');
    const sev = findCat('sev');
    const cookies = findCat('cookies');
    const pickle = findCat('pickle');
    const podi = findCat('podi');

    console.log('Categories found:', {
        sweets: sweets?.name,
        sev: sev?.name,
        cookies: cookies?.name,
        pickle: pickle?.name,
        podi: podi?.name,
    });

    // Clear existing pairings
    await prisma.categoryPairing.deleteMany();

    const pairings = [];

    // Sweets → Cookies, Sev
    if (sweets && cookies) pairings.push({ categoryId: sweets.id, pairedCategoryId: cookies.id, sortOrder: 0 });
    if (sweets && sev) pairings.push({ categoryId: sweets.id, pairedCategoryId: sev.id, sortOrder: 1 });

    // Sev → Sweets, Pickle, Podi
    if (sev && sweets) pairings.push({ categoryId: sev.id, pairedCategoryId: sweets.id, sortOrder: 0 });
    if (sev && pickle) pairings.push({ categoryId: sev.id, pairedCategoryId: pickle.id, sortOrder: 1 });
    if (sev && podi) pairings.push({ categoryId: sev.id, pairedCategoryId: podi.id, sortOrder: 2 });

    // Cookies → Sweets, Sev
    if (cookies && sweets) pairings.push({ categoryId: cookies.id, pairedCategoryId: sweets.id, sortOrder: 0 });
    if (cookies && sev) pairings.push({ categoryId: cookies.id, pairedCategoryId: sev.id, sortOrder: 1 });

    // Pickle & Podi → Sweets, Sev
    if (pickle && sweets) pairings.push({ categoryId: pickle.id, pairedCategoryId: sweets.id, sortOrder: 0 });
    if (pickle && sev) pairings.push({ categoryId: pickle.id, pairedCategoryId: sev.id, sortOrder: 1 });
    if (podi && sweets) pairings.push({ categoryId: podi.id, pairedCategoryId: sweets.id, sortOrder: 0 });
    if (podi && sev) pairings.push({ categoryId: podi.id, pairedCategoryId: sev.id, sortOrder: 1 });

    for (const pairing of pairings) {
        await prisma.categoryPairing.create({ data: pairing });
        const src = categories.find(c => c.id === pairing.categoryId)?.name;
        const dst = categories.find(c => c.id === pairing.pairedCategoryId)?.name;
        console.log(`  ${src} → ${dst}`);
    }

    console.log(`\nSeeded ${pairings.length} category pairings`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function debugCategories() {
  try {
    const allCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' }
    });

    console.log('--- ALL CATEGORIES ---');
    console.log(JSON.stringify(allCategories, null, 2));

    const parents = allCategories.filter(c => !c.parentId);
    console.log('\n--- PARENT ORDERS ---');
    parents.forEach(p => console.log(`${p.name}: ${p.sortOrder}`));

  } catch (error) {
    console.error('Debug script failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCategories();

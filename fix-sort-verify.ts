import { PrismaClient } from './src/generated/client';

const prisma = new PrismaClient();

async function fixSortOrder() {
  try {
    // Set Sweets to 1
    const sweets = await prisma.category.update({
      where: { slug: 'sweets' },
      data: { sortOrder: 1 },
    });
    console.log('Updated Sweets:', sweets.name, sweets.sortOrder);

    // Set Pickles, Thokku & Podi to 2
    const pickles = await prisma.category.update({
      where: { slug: 'pickles--thokku-&-podi' },
      data: { sortOrder: 2 },
    });
    console.log('Updated Pickles:', pickles.name, pickles.sortOrder);

  } catch (error) {
    console.error('Error updating categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSortOrder();

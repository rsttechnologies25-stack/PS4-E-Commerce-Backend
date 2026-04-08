import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
    const typoSlug = 'rassgulla-bowl';
    const correctSlug = 'rasgulla-bowl-20-pcs';

    console.log(`Starting migration: ${typoSlug} -> ${correctSlug}`);

    const typo = await prisma.product.findUnique({ where: { slug: typoSlug } });
    const correct = await prisma.product.findUnique({ where: { slug: correctSlug } });

    if (!typo || !correct) {
        console.error('Error: Typo or correct product not found.');
        return;
    }

    console.log(`Re-linking OrderItems...`);
    const updateOrders = await prisma.orderItem.updateMany({
        where: { productId: typo.id },
        data: { productId: correct.id }
    });
    console.log(`Updated ${updateOrders.count} OrderItems.`);

    console.log(`Re-linking CartItems...`);
    const updateCart = await prisma.cartItem.updateMany({
        where: { productId: typo.id },
        data: { productId: correct.id }
    });
    console.log(`Updated ${updateCart.count} CartItems.`);

    console.log(`Deleting variants and images for typo...`);
    await prisma.productVariant.deleteMany({ where: { productId: typo.id } });
    await prisma.productImage.deleteMany({ where: { productId: typo.id } });

    console.log(`Deleting typo product...`);
    await prisma.product.delete({ where: { id: typo.id } });

    console.log('Cleanup successful!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

import { PrismaClient } from './generated/client';

const prisma = new PrismaClient();

async function main() {
    const slug = 'rassgulla-bowl';
    console.log(`Analyzing references for product: ${slug}`);

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            orderItems: {
                include: {
                    order: true
                }
            },
            cartItems: true,
            variants: true,
            images: true
        }
    });

    if (!product) {
        console.log('Product not found in database.');
        return;
    }

    console.log('--- PRODUCT DATA ---');
    console.log(`ID: ${product.id}`);
    console.log(`Name: ${product.name}`);
    console.log(`Variants: ${product.variants.length} [${product.variants.map(v => v.weight).join(', ')}]`);
    console.log(`Images: ${product.images.length}`);

    console.log('\n--- REFERENCES ---');
    console.log(`Order Items: ${product.orderItems.length}`);
    if (product.orderItems.length > 0) {
        product.orderItems.forEach(item => {
            console.log(`  - Order ID: ${item.orderId}, Status: ${item.order.status}, Created: ${item.order.createdAt}, Weight: ${item.weight}, Price: ${item.price}`);
        });
    }

    console.log(`Cart Items: ${product.cartItems.length}`);
    if (product.cartItems.length > 0) {
        console.log(`  - Total across ${product.cartItems.length} users`);
    }

    // Check for "correct" counterpart
    const correctSlug = 'rasgulla-bowl';
    const correctProduct = await prisma.product.findUnique({
        where: { slug: correctSlug },
        include: { variants: true }
    });
    if (correctProduct) {
        console.log(`\nFound correct counterpart: ${correctProduct.name} (ID: ${correctProduct.id})`);
        console.log(`Correct Variants: ${correctProduct.variants.length} [${correctProduct.variants.map(v => v.weight).join(', ')}]`);
    } else {
        console.log('\nCorrect counterpart (rasgulla-bowl) NOT found.');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

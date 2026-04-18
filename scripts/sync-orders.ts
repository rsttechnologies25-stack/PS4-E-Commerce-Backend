import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function sync() {
    console.log('--- STARTING ORDER COUNTER SYNC ---');
    
    // 1. Get all orders with a readableId
    const orders = await prisma.order.findMany({
        where: {
            readableId: { not: null }
        },
        select: { readableId: true }
    });

    let maxNumber = 0;

    // 2. Parse numbers from existing readableIds (e.g., "#005" -> 5)
    orders.forEach(order => {
        if (order.readableId) {
            const matches = order.readableId.match(/\d+/);
            if (matches) {
                const num = parseInt(matches[0], 10);
                if (num > maxNumber) maxNumber = num;
            }
        }
    });

    console.log(`Highest existing order number found: ${maxNumber}`);
    const nextNumber = maxNumber + 1;

    // 3. Update SiteSettings with the correct next number
    await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: {
            id: 'default',
            nextOrderNumber: nextNumber
        },
        update: {
            nextOrderNumber: nextNumber
        }
    });

    console.log(`SUCCESS: Next order number set to: ${nextNumber}`);
    console.log('You can now place orders without the 500 error.');
}

sync()
    .catch(e => {
        console.error('Error during sync:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

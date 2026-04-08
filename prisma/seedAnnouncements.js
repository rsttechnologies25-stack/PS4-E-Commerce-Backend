const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Clear existing
    await prisma.announcement.deleteMany();

    // Seed announcements
    await prisma.announcement.createMany({
        data: [
            { message: 'Order before 3:00 PM for next-day delivery by 7PM.', isActive: true, sortOrder: 0 },
            { message: 'Rest of India: Order before 3:00 PM for next-day dispatch.', isActive: true, sortOrder: 1 },
            { message: 'Free delivery on orders above Rs.500!', isActive: true, sortOrder: 2 },
        ]
    });

    const all = await prisma.announcement.findMany();
    console.log('Seeded announcements:', JSON.stringify(all, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

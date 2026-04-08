import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateCoords() {
    const coordsMap: Record<string, { lat: number; lng: number }> = {
        'Perambur': { lat: 13.1087, lng: 80.2396 },
        'Kolathur': { lat: 13.1227, lng: 80.2231 },
        'Madhavaram': { lat: 13.1487, lng: 80.2299 },
        'Villivakkam': { lat: 13.1061, lng: 80.2050 },
        'Anna Nagar': { lat: 13.0860, lng: 80.2126 },
        'Ambattur': { lat: 13.1143, lng: 80.1548 },
        'Thirumullaivoyal': { lat: 13.1380, lng: 80.1340 },
        'Padi': { lat: 13.1130, lng: 80.1930 },
        'Redhills': { lat: 13.1920, lng: 80.1890 },
        'Avadi': { lat: 13.1155, lng: 80.1003 },
        'Korattur': { lat: 13.1140, lng: 80.1803 },
        'ICF': { lat: 13.0750, lng: 80.2090 },
        'Mogappair': { lat: 13.0870, lng: 80.1780 },
        'Ayanavaram': { lat: 13.1030, lng: 80.2350 },
        'Ashok Nagar': { lat: 13.0370, lng: 80.2160 },
        'Arumbakkam (MMDA)': { lat: 13.0720, lng: 80.2120 },
        'Tirumangalam': { lat: 13.0930, lng: 80.1970 },
        'Madhavaram Milk': { lat: 13.1487, lng: 80.2299 },
        'Mathur-2': { lat: 13.1200, lng: 80.2500 },
        'Srinivasa Nagar': { lat: 13.1227, lng: 80.2231 },
        'Thiruninravur': { lat: 13.1050, lng: 80.0570 },
    };

    const branches = await prisma.branch.findMany();
    for (const branch of branches) {
        const c = coordsMap[branch.name];
        if (c) {
            await prisma.branch.update({
                where: { id: branch.id },
                data: { latitude: c.lat, longitude: c.lng }
            });
            console.log('Updated:', branch.name, c.lat, c.lng);
        } else {
            console.log('No coords for:', branch.name);
        }
    }
    console.log('Done!');
    await prisma.$disconnect();
}

updateCoords();

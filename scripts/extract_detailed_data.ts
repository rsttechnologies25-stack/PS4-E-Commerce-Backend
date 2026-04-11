import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Deep Data Extraction ---');
    
    // 1. Site Settings (Policies, Terms, etc.)
    const settings = await prisma.siteSettings.findFirst();
    console.log('\n[Site Settings]');
    if (settings) {
        console.log('Privacy Content length:', settings.privacy_content?.length || 0);
        console.log('Terms Content length:', settings.terms_content?.length || 0);
        console.log('Shipping Content length:', settings.shipping_content?.length || 0);
        console.log('About Page Content:', JSON.stringify(settings.aboutPageContent).substring(0, 100) + '...');
    }

    // 2. Banner Images
    const banners = await prisma.heroBanner.findMany();
    console.log('\n[Hero Banners]');
    banners.forEach((b, i) => console.log(`${i+1}. ${b.title || 'No Title'} -> ${b.image}`));

    // 3. Product Image Sample
    const productImages = await prisma.productImage.findMany({ take: 5 });
    console.log('\n[Sample Product Images]');
    productImages.forEach((img, i) => console.log(`${i+1}. URL: ${img.url}`));

    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});

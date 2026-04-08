import { PrismaClient } from './generated/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const filePath = path.join(__dirname, '../../Product List.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l !== '');

    const products: any[] = [];
    let currentProduct: any = null;

    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        const hasVariantKeyword = lowerLine.includes('gram') || lowerLine.includes('kilogram') || lowerLine.includes('pcs') || lowerLine.includes('qty') || lowerLine.includes('nos') || lowerLine.includes('gms');
        if (line.includes('–') && hasVariantKeyword) {
            if (currentProduct) {
                const parts = line.split('–').map(p => p.trim());
                if (parts.length === 2) {
                    currentProduct.variants.push({
                        weight: parts[0],
                        price: parseFloat(parts[1])
                    });
                }
            }
        } else {
            if (currentProduct) {
                products.push(currentProduct);
            }
            // Normalize name: Remove hyphens, capitalize words
            let slug = line;
            let name = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            currentProduct = {
                slug,
                name,
                variants: []
            };
        }
    }
    if (currentProduct) {
        products.push(currentProduct);
    }

    console.log(`Found ${products.length} products to import.`);

    // Get all image files in public/products
    const imagesDir = path.join(__dirname, '../public/products');
    const imageFiles = fs.readdirSync(imagesDir);

    // Get existing categories
    const existingCats = await prisma.category.findMany();
    const catMap = new Map(existingCats.map(c => [c.slug, c.id]));

    // Helper to get or create category
    async function getCategoryId(name: string, slug: string) {
        if (catMap.has(slug)) return catMap.get(slug);
        const newCat = await prisma.category.create({
            data: { name, slug }
        });
        catMap.set(slug, newCat.id);
        return newCat.id;
    }

    const SWEETS_ID = await getCategoryId("Sweets", "sweets");
    const SAVOURIES_ID = await getCategoryId("Savouries", "savouries");
    const COOKIES_ID = await getCategoryId("Cookies", "cookies");
    const PICKLE_ID = await getCategoryId("Pickle", "pickle");
    const PODI_ID = await getCategoryId("Podi", "podi");

    for (const product of products) {
        try {
            // Check if product already exists
            const existingProduct = await prisma.product.findUnique({
                where: { slug: product.slug },
                include: { variants: true }
            });

            // Infer category
            let categoryId = SWEETS_ID;
            const n = product.name.toLowerCase();
            if (n.includes('mixture') || n.includes('murukku') || n.includes('pakoda') || n.includes('chips') || n.includes('thattai') || n.includes('sev') || n.includes('boondhi') || n.includes('lakkadi')) {
                categoryId = SAVOURIES_ID;
            } else if (n.includes('cookie') || n.includes('biscuit') || n.includes('rusk')) {
                categoryId = COOKIES_ID;
            } else if (n.includes('pickle') || n.includes('thokku') || n.includes('kulambu')) {
                categoryId = PICKLE_ID;
            } else if (n.includes('podi')) {
                categoryId = PODI_ID;
            }

            // Find matching images
            const searchName = product.name.toLowerCase().replace(/ /g, '');
            const matchedImages = imageFiles.filter(f => {
                const fn = f.toLowerCase().replace(/ /g, '').replace(/_/g, '');
                return fn.includes(searchName) || searchName.includes(fn.split('sw')[0]);
            });

            // Fallback for names with minor differences
            if (matchedImages.length === 0) {
                // Try fuzzy match on words
                const words = product.name.toLowerCase().split(' ');
                const bestMatch = imageFiles.find(f => {
                    const fn = f.toLowerCase();
                    return words.every((w: string) => fn.includes(w));
                });
                if (bestMatch) matchedImages.push(bestMatch);
            }

            const imageData = matchedImages.length > 0 ? `/products/${matchedImages[0]}` : '/logo-v1.png';

            if (existingProduct) {
                console.log(`Updating existing product: ${product.name}`);

                // Delete existing variants and images to re-sync
                await prisma.productVariant.deleteMany({ where: { productId: existingProduct.id } });
                await prisma.productImage.deleteMany({ where: { productId: existingProduct.id } });

                await prisma.product.update({
                    where: { id: existingProduct.id },
                    data: {
                        name: product.name,
                        description: `${product.name} - Premium quality from PS4 Sweets & Snacks.`,
                        price: product.variants[0]?.price || 0,
                        categoryId: categoryId!,
                        image: imageData,
                        variants: {
                            create: product.variants.map((v: any, index: number) => ({
                                weight: v.weight,
                                price: v.price,
                                stock: 100,
                                sortOrder: index
                            }))
                        },
                        images: {
                            create: matchedImages.map((img, index) => ({
                                url: `/products/${img}`,
                                isPrimary: index === 0,
                                sortOrder: index
                            }))
                        }
                    }
                });
            } else {
                // Create product
                await prisma.product.create({
                    data: {
                        name: product.name,
                        slug: product.slug,
                        description: `${product.name} - Premium quality from PS4 Sweets & Snacks.`,
                        price: product.variants[0]?.price || 0,
                        categoryId: categoryId!,
                        image: imageData,
                        variants: {
                            create: product.variants.map((v: any, index: number) => ({
                                weight: v.weight,
                                price: v.price,
                                stock: 100,
                                sortOrder: index
                            }))
                        },
                        images: {
                            create: matchedImages.map((img, index) => ({
                                url: `/products/${img}`,
                                isPrimary: index === 0,
                                sortOrder: index
                            }))
                        }
                    }
                });
                console.log(`Created: ${product.name} with ${product.variants.length} variants and ${matchedImages.length} images.`);
            }
        } catch (err: any) {
            console.error(`Error processing ${product.name}:`, err.message);
        }
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

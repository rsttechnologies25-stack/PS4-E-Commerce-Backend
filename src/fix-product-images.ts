import { PrismaClient } from './generated/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    const sourceDir = path.join(__dirname, '../Sweets & Savories_for swiggy');
    const targetDir = path.join(__dirname, '../public/products');

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const files = fs.readdirSync(sourceDir);
    const sanitizedMap = new Map<string, string>(); // original -> sanitized

    console.log("Sanitizing filenames...");

    for (const file of files) {
        if (file === 'desktop.ini') continue;

        // Sanitize: lowercase, remove spaces, remove brackets, remove special chars
        let sanitized = file.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[\[\]\(\)]/g, '')
            .replace(/&/g, 'and')
            .replace(/--+/g, '-')
            .replace(/^-+|-+$/g, '');

        const sourcePath = path.join(sourceDir, file);
        const targetPath = path.join(targetDir, sanitized);

        fs.copyFileSync(sourcePath, targetPath);
        sanitizedMap.set(file, sanitized);
    }

    console.log(`Sanitized and copied ${sanitizedMap.size} files.`);

    const products = await prisma.product.findMany();
    console.log(`Analyzing ${products.length} products...`);

    const sanitizedFiles = Array.from(sanitizedMap.values());

    for (const product of products) {
        const pName = product.name.toLowerCase();
        const pWords = pName.split(/[\s\-]/).filter(w => w.length > 2 && w !== 'pcs' && w !== 'bowl');

        let bestMatch: string | null = null;
        let bestScore = 0;

        for (const fName of sanitizedFiles) {
            const fWords = fName.replace(/\.jpg$/, '').split(/[\-\_]/).filter(w => w.length > 2 && w !== 'sw');

            let matches = 0;
            for (const pw of pWords) {
                // Exact match or contains
                if (fWords.some(fw => fw.includes(pw) || pw.includes(fw))) {
                    matches++;
                }
            }

            const score = matches / Math.max(pWords.length, 1);

            // Tie-breaker: prefer shorter names or names starting with the same word
            if (score > bestScore) {
                bestScore = score;
                bestMatch = fName;
            } else if (score === bestScore && score > 0) {
                if (fName.length < (bestMatch?.length || Infinity)) {
                    bestMatch = fName;
                }
            }
        }

        if (bestScore >= 0.5) { // At least 50% words match
            console.log(`Mapping [${product.name}] -> [${bestMatch}] (Score: ${bestScore.toFixed(2)})`);

            // Find all matching images (for products with multiple images)
            const allMatches = sanitizedFiles.filter(f => {
                const fBase = f.replace(/\.jpg$/, '').toLowerCase();
                const pBase = product.name.toLowerCase().replace(/\s+/g, '-');
                // Check if file starts with product name or very similar
                return fBase.includes(pWords[0]) && fBase.includes(pWords[pWords.length - 1]);
            }).slice(0, 5); // Limit to 5

            // Update product
            await prisma.product.update({
                where: { id: product.id },
                data: {
                    image: `/products/${bestMatch}`,
                    images: {
                        deleteMany: {},
                        create: allMatches.map((img, idx) => ({
                            url: `/products/${img}`,
                            isPrimary: img === bestMatch,
                            sortOrder: idx
                        }))
                    }
                }
            });
        } else {
            console.log(`No strong match for [${product.name}]. Keeping placeholder.`);
            await prisma.product.update({
                where: { id: product.id },
                data: { image: '/logo-v1.png' }
            });
        }
    }

    console.log("Image remediation complete.");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

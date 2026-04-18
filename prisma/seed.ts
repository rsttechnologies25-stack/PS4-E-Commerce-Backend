import { PrismaClient } from '../src/generated/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Clear existing data (in order of dependencies: Children first)
    await prisma.orderItem.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.productImage.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.heroBanner.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.categoryPairing.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.admin.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.shippingRule.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.whatsAppTemplate.deleteMany({});
    await prisma.coupon.deleteMany({});
    await prisma.bannedEmail.deleteMany({});
    await prisma.siteSettings.deleteMany({});

    // Default Site Settings
    await prisma.siteSettings.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            deliveryPopupEnabled: true,
            deliveryPopupTitle: 'Delivery Notification!',
            deliveryPopupContent: '• Chennai: Order before 3:00 PM for next-day delivery by 7PM.\n• Rest of India: Order before 3:00 PM for next-day dispatch.\n• Delivery Timeline: Rest of India: 2–4 days.',
            nextOrderNumber: 1,
            orderIdPrefix: '#',
            orderIdPadding: 3,
            whatsappNumber: '919282445577'
        }
    });

    // Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
        data: {
            email: 'admin@ps4sweets.com',
            password: hashedPassword
        }
    });

    // Categories
    // 1. Sweets
    const sweets = await prisma.category.create({
        data: { name: 'Sweets', slug: 'sweets', image: '/hero_motichoor_laddu.jpg' }
    });
    const subSweets = await Promise.all([
        prisma.category.create({ data: { name: 'Milk Sweets', slug: 'milk-sweets', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/SPL_MILK_CAKE.jpg?v=1753341841', parentId: sweets.id } }),
        prisma.category.create({ data: { name: 'Ghee Sweets', slug: 'ghee-sweets', image: '/hero_motichoor_laddu.jpg', parentId: sweets.id } }),
        prisma.category.create({ data: { name: 'Cashew Sweets', slug: 'cashew-sweets', image: 'https://cdn.shopify.com/s/files/1/0025/9834/8887/files/KAJU_KATLI.jpg?v=1753000606', parentId: sweets.id } }),
    ]);

    // 2. Sev
    const sev = await prisma.category.create({
        data: { name: 'Sev', slug: 'sev', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/MINI_KARA_SEV.jpg?v=1753017794' }
    });
    const subSev = await Promise.all([
        prisma.category.create({ data: { name: 'Kara Sev', slug: 'kara-sev', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/MINI_KARA_SEV.jpg?v=1753017794', parentId: sev.id } }),
    ]);

    // 2.5 Savouries (New)
    const savouries = await prisma.category.create({
        data: { name: 'Savouries', slug: 'savouries', image: 'https://perambursrinivasa.com/cdn/shop/files/ANDHRA_MURUKKU.jpg?v=1753018411' }
    });
    const subSavouries = await Promise.all([
        prisma.category.create({ data: { name: 'Mixture', slug: 'mixture', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/SPL_MIXTURE.jpg?v=1753017688', parentId: savouries.id } }),
    ]);

    // 3. Pickle
    const pickle = await prisma.category.create({
        data: { name: 'Pickle', slug: 'pickle', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image6.webp?v=1746161359' }
    });
    const subPickle = await Promise.all([
        prisma.category.create({ data: { name: 'Vegetable Pickles', slug: 'veg-pickles', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image3.webp?v=1746161336', parentId: pickle.id } }),
        prisma.category.create({ data: { name: 'Thokku', slug: 'thokku', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image4.webp?v=1746161348', parentId: pickle.id } }),
    ]);

    // 4. Podi
    const podi = await prisma.category.create({
        data: { name: 'Podi', slug: 'podi', image: 'https://perambursrinivasa.com/cdn/shop/files/IDLY_PODI_34e04bc4-aee0-42a9-949a-2bd13815a4f1.jpg?v=1753016470&width=500' }
    });
    const subPodi = await Promise.all([
        prisma.category.create({ data: { name: 'Idly Podi', slug: 'idly-podi', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/IDLY_PODI_34e04bc4-aee0-42a9-949a-2bd13815a4f1.jpg?v=1753016470', parentId: podi.id } }),
        prisma.category.create({ data: { name: 'Rice Podi', slug: 'rice-podi', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/PARUPPUPODI.jpg?v=1747888955', parentId: podi.id } }),
    ]);

    // 5. Cookies
    const cookies = await prisma.category.create({
        data: { name: 'Cookies', slug: 'cookies', image: 'https://perambursrinivasa.com/cdn/shop/files/KESAR_BADAM_COOKIES.jpg?v=1753017309&width=500' }
    });
    const subCookies = await Promise.all([
        prisma.category.create({ data: { name: 'Butter Cookies', slug: 'butter-cookies', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/KESAR_BADAM_COOKIES.jpg?v=1753017309', parentId: cookies.id } }),
        prisma.category.create({ data: { name: 'Health Cookies', slug: 'health-cookies', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/RAGI_COOKIES.jpg?v=1753017272', parentId: cookies.id } }),
    ]);

    // 6. Gifting
    const gifting = await prisma.category.create({
        data: { name: 'Gifting', slug: 'gifting', image: 'https://perambursrinivasa.com/cdn/shop/files/KESAR_BADAM_COOKIES.jpg?v=1753017309&width=500' }
    });
    const subGifting = await Promise.all([
        prisma.category.create({ data: { name: 'Festival Boxes', slug: 'festival-boxes', image: 'https://perambursrinivasa.com/cdn/shop/files/KESAR_BADAM_COOKIES.jpg?v=1753017309', parentId: gifting.id } }),
    ]);

    // 7. Outdoor Catering
    const catering = await prisma.category.create({
        data: { name: 'Outdoor Catering', slug: 'outdoor-catering', image: 'https://perambursrinivasa.com/cdn/shop/files/KESAR_BADAM_COOKIES.jpg?v=1753017309&width=500' }
    });
    const subCatering = await Promise.all([
        prisma.category.create({ data: { name: 'Wedding Catering', slug: 'wedding-catering', image: 'https://perambursrinivasa.com/cdn/shop/files/KESAR_BADAM_COOKIES.jpg?v=1753017309', parentId: catering.id } }),
    ]);

    const allSubCategories = [...subSweets, ...subSev, ...subSavouries, ...subPickle, ...subPodi, ...subCookies, ...subGifting, ...subCatering];
    const findId = (slug: string) => allSubCategories.find(c => c.slug === slug)?.id;

    // Sweets Mappings
    const milkSweetsId = findId('milk-sweets');
    const gheeSweetsId = findId('ghee-sweets');
    const cashewSweetsId = findId('cashew-sweets');

    if (milkSweetsId) {
        await prisma.product.createMany({
            data: [
                { name: 'Special Milk Cake', slug: 'special-milk-cake', price: 200, description: 'Dense milk sweet with caramelized edges.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/SPL_MILK_CAKE.jpg?v=1753341841', categoryId: milkSweetsId },
                { name: 'Rassgulla Bowl', slug: 'rassgulla-bowl', price: 180, description: 'Soft and spongy cottage cheese balls in sugar syrup.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/rag.webp?v=1745992713', categoryId: milkSweetsId },
                { name: 'Gulab Jamun Bowl', slug: 'gulab-jamun-bowl', price: 180, description: 'Classic deep-fried milk solids in sugar syrup.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image34.webp?v=1753339502', categoryId: milkSweetsId },
            ]
        });
    }

    if (gheeSweetsId) {
        await prisma.product.createMany({
            data: [
                { name: 'Motichur Laddu', slug: 'motichur-laddu', price: 200, description: 'Authentic Taste, Handcrafted, No Maida, No Added Colors', image: '/hero_motichoor_laddu.jpg', categoryId: gheeSweetsId, isBestSeller: true },
                { name: 'Srinivasa Laddu Small', slug: 'srinivasa-laddu-small', price: 205, description: 'Authentic Taste, Handcrafted, No Maida, No Added Colors', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/SRINIVASA_LADDU-170_3.webp?v=1748349101', categoryId: gheeSweetsId, isBestSeller: true },
                { name: 'Karuppatti Mysore Pak', slug: 'karuppatti-mysore-pak', price: 230, description: 'Mysore Pak sweetened with palm jaggery for earthy flavor.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/KARUPATTI_MYSOREPAK.jpg?v=1753341712', categoryId: gheeSweetsId, isNewLaunch: true },
            ]
        });
    }

    if (cashewSweetsId) {
        await prisma.product.createMany({
            data: [
                { name: 'Kaju Katli', slug: 'kaju-katli', price: 310, description: 'Classic cashew fudge.', image: 'https://cdn.shopify.com/s/files/1/0025/9834/8887/files/KAJU_KATLI.jpg?v=1753000606', categoryId: cashewSweetsId, isBestSeller: true },
                { name: 'Kesar Kaju Katli', slug: 'kesar-kaju-katli', price: 360, description: 'Saffron-infused version of the kaju katli.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/kk2.webp?v=1745989914', categoryId: cashewSweetsId, isBestSeller: true },
                { name: 'Kaju Pista Roll', slug: 'kaju-pista-roll', price: 360, description: 'Cashew and pistachio rolled sweet.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/KAJU_PISTA_ROLL.jpg?v=1753338971', categoryId: cashewSweetsId, isNewLaunch: true },
            ]
        });
    }

    // Savouries Mappings
    const mixtureId = findId('mixture');
    if (mixtureId) {
        await prisma.product.createMany({
            data: [
                { name: 'Special Mixture', slug: 'special-mixture', price: 145, description: 'A savory snack mix.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/SPL_MIXTURE.jpg?v=1753017688', categoryId: mixtureId, isBestSeller: true },
            ]
        });
    }

    // Sev Mappings
    const karaSevId = findId('kara-sev');
    if (karaSevId) {
        await prisma.product.createMany({
            data: [
                { name: 'Special Kara Sev', slug: 'special-kara-sev', price: 138, description: 'Special spicy sev variety.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/MINI_KARA_SEV.jpg?v=1753017794', categoryId: karaSevId },
            ]
        });
    }

    // Pickle Mappings
    const thokkuId = findId('thokku');
    if (thokkuId) {
        await prisma.product.createMany({
            data: [
                { name: 'Pirandai Thokku', slug: 'pirandai-thokku', price: 180, description: 'Made from edible Cissus quadrangularis.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image6.webp?v=1746161359', categoryId: thokkuId, isNewLaunch: true },
                { name: 'Pudina Thokku', slug: 'pudina-thokku', price: 180, description: 'A refreshing mint-based preserve.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image4.webp?v=1746161348', categoryId: thokkuId },
                { name: 'Tomato Thokku', slug: 'tomato-thokku', price: 180, description: 'Classic tomato thokku balance of spice and tang.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/image3.webp?v=1746161336', categoryId: thokkuId },
            ]
        });
    }

    // Podi Mappings
    const idlyPodiId = findId('idly-podi');
    if (idlyPodiId) {
        await prisma.product.createMany({
            data: [
                { name: 'PS4 Idly Podi', slug: 'ps4-idly-podi', price: 170, description: 'Flavorful idly podi made with special PS4 spice blend.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/IDLY_PODI_34e04bc4-aee0-42a9-949a-2bd13815a4f1.jpg?v=1753016470', categoryId: idlyPodiId },
                { name: 'Andra Idly Podi', slug: 'andra-idly-podi', price: 180, description: 'A spicy dry chutney powder made in Andhra style.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/Ps4_Pickles_Thokku-31.jpg?v=1768392408', categoryId: idlyPodiId },
            ]
        });
    }

    // Cookies Mappings
    const butterCookiesId = findId('butter-cookies');
    const healthCookiesId = findId('health-cookies');

    if (butterCookiesId) {
        await prisma.product.createMany({
            data: [
                { name: 'Sesame Cookies', slug: 'sesame-cookies', price: 140, description: 'Cookies made with sesame seeds.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/SEASAME_COOKIES.jpg?v=1753017240', categoryId: butterCookiesId },
                { name: 'Kesar Badam Cookies', slug: 'kesar-badam-cookies', price: 180, description: 'Saffron almond cookies.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/KESAR_BADAM_COOKIES.jpg?v=1753017309', categoryId: butterCookiesId },
            ]
        });
    }

    if (healthCookiesId) {
        await prisma.product.createMany({
            data: [
                { name: 'Ragi Cookies', slug: 'ragi-cookies', price: 105, description: 'Nutritious cookies made from ragi.', image: 'https://cdn.shopify.com/s/files/1/0625/9834/8887/files/RAGI_COOKIES.jpg?v=1753017272', categoryId: healthCookiesId },
            ]
        });
    }

    // Branches
    await prisma.branch.createMany({
        data: [
            { name: "Tirupathi", address: "No: 20-5-1, Thirumala Bypass Road, Thirupathi Town, Chitoor, AP-517501", city: "Tirupati", phone: "+91 7823999799 / 899", image: "https://perambursrinivasa.com/cdn/shop/files/Tirupathi_01_600x.webp?v=1747809328", isHeadOffice: false },
            { name: "Tirupathi - II", address: "No: 29/1, 29/2, 29/3/254/2, Tiruchanoor Road, Tirupati, AP-517502", city: "Tirupati", phone: "+91 7823 999 599 / 699", image: "https://perambursrinivasa.com/cdn/shop/files/Tirupathi_02_600x.webp?v=1747809328", isHeadOffice: false },
            { name: "Perambur (RS Opp)", address: "No: 23/16, Perambur High Road, Perambur, Chennai-600011", city: "Chennai", phone: "+91 7823999930 / 931", image: "https://perambursrinivasa.com/cdn/shop/files/PERAMBUR_600x.jpg?v=1767788916", isHeadOffice: true },
            { name: "Perambur Market", address: "No: 132, M H Road, Perambur, Chennai-600011", city: "Chennai", phone: "+91 7823999932", image: "https://perambursrinivasa.com/cdn/shop/files/MARKET_600x.jpg?v=1767788917", isHeadOffice: false },
            { name: "Venus (Perambur)", address: "No: 38, Paper Mills Road, Chennai-600011", city: "Chennai", phone: "+91 7823999933", image: "https://perambursrinivasa.com/cdn/shop/files/Perambur_01_600x.webp?v=1747809328", isHeadOffice: false },
            { name: "Ayanavaram", address: "No: 200, KH Road Aynavaram, Chennai-600023", city: "Chennai", phone: "+91 7823999935", image: "https://perambursrinivasa.com/cdn/shop/files/07_Aynavaram_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Kolathur", address: "1 & 2, 1ST, Anjugam Nagar Main Road, Kolathur, Chennai-600099", city: "Chennai", phone: "+91 7823999936", image: "https://perambursrinivasa.com/cdn/shop/files/KOLATHUR_9ff3245e-b9c6-432b-bdd4-aec1a65280bf_600x.jpg?v=1767788917", isHeadOffice: false },
            { name: "Moolakadai", address: "No: 30, M H Road, Moolakadai, Chennai-600060", city: "Chennai", phone: "+91 7823999937", image: "https://perambursrinivasa.com/cdn/shop/files/MOOL_600x.jpg?v=1767788919", isHeadOffice: false },
            { name: "Redhills", address: "No: 265, G.N.T. Road, Redhills, Chennai-600052", city: "Chennai", phone: "+91 7823999938", image: "https://perambursrinivasa.com/cdn/shop/files/REDHILLS_8347a857-5242-4575-ac86-465d0b258e2a_600x.jpg?v=1767788919", isHeadOffice: false },
            { name: "Padi", address: "No: 100, M.T.H Road Padi, Chennai-600050", city: "Chennai", phone: "+91 7823999939", image: "https://perambursrinivasa.com/cdn/shop/files/PADI_600x.jpg?v=1767788916", isHeadOffice: false },
            { name: "Ambathur", address: "No: 453/1, CTH Road Ambatur O.T, Chennai-600053", city: "Chennai", phone: "+91 7823999940", image: "https://perambursrinivasa.com/cdn/shop/files/12_Ambathur_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Thiru.vi.ka.nagar", address: "No: 59, S.R.P. Kol Street, T.V.K. nagar, Perambur, Chennai-600011", city: "Chennai", phone: "+91 7823999941", image: "https://perambursrinivasa.com/cdn/shop/files/13_T.V.K._NAGAR_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Bharathi Road", address: "No: 8, Bharathi Road, Perambur, Chennai-600011", city: "Chennai", phone: "+91 7823999942", image: "https://perambursrinivasa.com/cdn/shop/files/14_Bharathi_Road_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Thiruvallur", address: "No: 4/3A, C.V. Naidu Salai, National Highways, Tiruvallur-602003", city: "Tiruvallur", phone: "+91 7823999943", image: "https://perambursrinivasa.com/cdn/shop/files/TRL_MAIN_600x.jpg?v=1767788918", isHeadOffice: false },
            { name: "Aminjikarai", address: "No: 493, P.H. Road, Aminjikarai, Chennai-600029", city: "Chennai", phone: "+91 7823999944", image: "https://perambursrinivasa.com/cdn/shop/files/16_Aminjikarai_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Mathur (MMDA)", address: "No: 132, Kamarajar Salai, Mathur MMDA, Chennai-600068", city: "Chennai", phone: "+91 7823999945", image: "https://perambursrinivasa.com/cdn/shop/files/MATHUR_600x.png?v=1767789273", isHeadOffice: false },
            { name: "Nelson Manickam Rd", address: "No: 130, Nelson Manickam Road, Aminjikarai, Chennai-600 029", city: "Chennai", phone: "+91 7823999946", image: "https://perambursrinivasa.com/cdn/shop/files/18_NMR_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Periyar Nagar", address: "No: 106, Siva Elango Salai, Periyar Nagar, Chennai-600 082", city: "Chennai", phone: "+91 7823999947 / 956", image: "https://perambursrinivasa.com/cdn/shop/files/19_Periya_Nagar_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Tiruvallur (Silks)", address: "No: 65A, C.V. Naidu Salai, Chennai Silks Campus, Thiruvallur-602001", city: "Tiruvallur", phone: "+91 7823999948 / 958", image: "https://perambursrinivasa.com/cdn/shop/files/15_Tiruvallur_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Valasarawakkam", address: "No: 3, Arcot Road, Valasaravakkam, Chennai-600087", city: "Chennai", phone: "+91 7823999950", image: "https://perambursrinivasa.com/cdn/shop/files/Perambur_01_600x.webp?v=1747809328", isHeadOffice: false },
            { name: "Thiruninravur", address: "Plot no: 20, survey no:224/1, C.T.H road, Thiruninravur-602024", city: "Thiruninravur", phone: "+91 7823999951 / 961", image: "https://perambursrinivasa.com/cdn/shop/files/22_Thiruninravur_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Arumbakkam (MMDA)", address: "No: 249/6, P-block, MMDA Colony, Arumbakkam-600106", city: "Chennai", phone: "+91 7823999952", image: "https://perambursrinivasa.com/cdn/shop/files/23_Arumbakkam_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Tirumangalam", address: "No: 1, Mogappair Road, Tirumangalam, Chennai-600101", city: "Chennai", phone: "+91 7823999953", image: "https://perambursrinivasa.com/cdn/shop/files/24_Tirumangalam_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Madhavaram Milk", address: "No-12, Madhavaram Milk Colony Main Road, Chennai-600051", city: "Chennai", phone: "+91 7823999949", image: "https://perambursrinivasa.com/cdn/shop/files/24_Tirumangalam_600x.webp?v=1747826010", isHeadOffice: false },
            { name: "Mathur-2", address: "No-105/4, MMDA 2nd Main Road, Mathur, Chennai-600068", city: "Chennai", phone: "+91 7823999945", image: "https://perambursrinivasa.com/cdn/shop/files/MATHUR_600x.png?v=1767789273", isHeadOffice: false },
            { name: "Srinivasa Nagar", address: "No.10/2, Srinivasa Nagar Main Road, Kolathur, Chennai-600099", city: "Chennai", phone: "+91 7823999954", image: "https://perambursrinivasa.com/cdn/shop/files/SRINIVASA_NAGAR_600x.jpg?v=1767788918", isHeadOffice: false },
            { name: "Ashok Nagar", address: "NO-66 & 67(37) 1st Avenue, Ashok Nagar, Chennai-600083", city: "Chennai", phone: "+91 7823999954", image: "https://perambursrinivasa.com/cdn/shop/files/unnamed_600x.webp?v=1767790212", isHeadOffice: false }
        ]
    });

    // Shipping Rules
    await prisma.shippingRule.createMany({
        data: [
            { areaName: 'CHENNAI', baseCharge: 150, additionalChargePerKg: 30 },
            { areaName: 'TAMIL NADU', baseCharge: 200, additionalChargePerKg: 40 },
            { areaName: 'OTHER STATES', baseCharge: 250, additionalChargePerKg: 50 },
        ]
    });

    // Hero Banners
    const motichoor = await prisma.product.findFirst({ where: { slug: 'motichur-laddu' } });
    const kajuKatli = await prisma.product.findFirst({ where: { slug: 'kaju-katli' } });

    if (motichoor) {
        await prisma.heroBanner.create({
            data: {
                image: '/hero_motichoor_laddu.jpg',
                title: 'Signature Motichoor Laddu',
                subtitle: 'The Soul of Perambur Sri Srinivasa. Pure Ghee. Traditionally Crafted.',
                ctaText: 'ORDER NOW',
                linkType: 'product',
                productId: motichoor.id,
                sortOrder: 0,
                isActive: true,
            }
        });
    }

    if (kajuKatli) {
        await prisma.heroBanner.create({
            data: {
                image: '/hero_kaju_katli.jpg',
                title: 'Premium Kaju Katli',
                subtitle: 'Exquisite Cashew Delight. Melt-in-your-mouth Perfection.',
                ctaText: 'SHOP NOW',
                linkType: 'product',
                productId: kajuKatli.id,
                sortOrder: 1,
                isActive: true,
            }
        });
    }

    console.log('Seed completed');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

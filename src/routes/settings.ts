import { Router } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const DEFAULT_SPLASH_CONTENT = {
    useDefault: true,
    image: "/logo-v1.png",
    backgroundColor: "#7C2D12",
    text: "PS4 SWEETS & SNACKS",
    textColor: "#FFFFFF",
    duration: 2
};

const DEFAULT_ABOUT_CONTENT = {
    hero: {
        title: "Our Legacy",
        subtitle: "The PS4 Story",
        description: "Crafting sweetness and tradition since 1981. A testament to quality, trust, and excellence.",
        image: "/about_us_hero.png"
    },
    stats: [
        { icon: "Calendar", value: "1981", label: "Established" },
        { icon: "MapPin", value: "26+", label: "Branches" },
        { icon: "Factory", "value": "50K", label: "Sq. Ft. Factory" },
        { icon: "Globe2", value: "USA", label: "Global Export" }
    ],
    legacy: {
        badge: "Our Roots",
        title: "A Journey That Began in 1981",
        content: [
            "Perambur Sri Srinivasa Sweets and Snacks (PS4) roots can be traced all the way back to 1981. Founded by Late Mr. P. Devendran Naidu, Mrs. D. Kasthuri Devendran, and his brother Mr. P. Boopalan Naidu, SRI SRINIVASA SWEETS AND SNACKS began with a simple vision: to share authentic Indian flavors with the community.",
            "What started as a small sweet shop has grown into a trusted brand known for its authentic taste and quality. Each product is made with passion and dedication, offering customers the perfect blend of traditional recipes and modern standards."
        ],
        quote: "Now led by the third generation, PS4 continues to build on its legacy of trust and excellence.",
        image: "/about_legacy_img.png"
    },
    quality: {
        title: "Modern Quality, Traditional Taste",
        description: "Today, PS4 proudly operates 26+ branches across Chennai, Tiruvallur, and Tirupati, supported by a modern 50,000 sq. ft. factory. Every sweet and snack we make is prepared in a clean and hygienic environment.",
        features: [
            { icon: "ShieldCheck", title: "Pure Ingredients", desc: "We use only the finest natural ingredients without any harmful additives." },
            { icon: "Heart", title: "Hygienic Standards", desc: "Our 50,000 sq. ft. facility follows the strictest hygiene protocols." },
            { icon: "Star", title: "Best Taste", desc: "A perfect blend of traditional recipes passed through three generations." }
        ]
    },
    restaurant: {
        isVisible: true,
        title: "PS4 Pure Veg Restaurant & Catering",
        titleAccent: "Restaurant & Catering",
        description: "Beyond our famous sweets, we have expanded into the culinary world with our Pure Veg Restaurant, serving a curated menu of traditional flavors. Our dedicated catering wing brings the same PS4 excellence to your corporate events and auspicious family celebrations, ensuring every guest experiences the true taste of tradition.",
        image: "/hero_motichoor_laddu.jpg"
    },
    global: {
        isVisible: true,
        title: "Sharing Traditional Flavors Worldwide",
        titleAccent: "Flavors Worldwide",
        description: "Our brand has crossed oceans with PS4 Foodz, proudly exporting our authentic South Indian sweets and snacks to the United States of America (USA). We are committed to maintaining the highest export standards, ensuring that every bite tastes exactly as it does in our Chennai kitchens.",
        image: "/ps4_sweets_hero_1.png"
    },
    footer: {
        title: "Pure Quality. Pure Trust.",
        titleAccent: "Pure Trust.",
        quote: "We thank our valued customers for their continued trust and promise to keep introducing new and exciting flavours for everyone to enjoy.",
        legacyText: "Legacy Since 1981",
        subText: "Third Generation Leadership"
    }
};

const DEFAULT_CONTACT_CONTENT = {
    hero: {
        badge: "Get in Touch",
        title: "Connect With Us",
        image: "/ps4_sweets_hero_1.png"
    },
    hq: {
        badge: "Corporate HQ",
        title: "Visit our Headquarters",
        titleAccent: "Headquarters",
        address: "Sri Srinivasa Sweets and Snacks, Chennai, Tamil Nadu, India",
        mapsLink: "https://www.google.com/maps/search/?api=1&query=Perambur+Srinivasa+Sweets+And+Snacks",
        phone: "+91 91500 81981",
        email: "care@perambursrinivasa.com",
        hours: "Mon-Sat: 9AM - 9PM | Sun: 10AM - 6PM"
    },
    feedback: {
        title: "Your Opinion Changes Us",
        titleAccent: "Changes Us",
        description: "We cherish every tradition, but we embrace every suggestion. Lend us your voice.",
        reviewLink: "https://review.perambursrinivasa.co.in/reviews/new",
        stats: [
            { value: "24+", label: "Outlets" },
            { value: "1981", label: "Est. Year" }
        ]
    },
    map: {
        iframeUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d124376.88372691456!2d80.14152862024823!3d13.04944122171569!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a52646274431785%3A0xc6ad50f8376263a!2sPerambur%20Sri%20Srinivasa%20Sweets%20And%20Snacks!5e0!3m2!1sen!2sin!4v1709575000000!5m2!1sen!2sin",
        badge: "Headquarters",
        subText: "Discover Tradition"
    }
};

// Get settings
router.get('/', async (req, res) => {
    try {
        let settings = await prisma.siteSettings.findUnique({
            where: { id: 'default' }
        });

        if (!settings) {
            // Create default settings if not exists
            settings = await prisma.siteSettings.create({
                data: {
                    id: 'default',
                    deliveryPopupEnabled: true,
                    deliveryPopupTitle: 'Delivery Notification!',
                    deliveryPopupContent: '• Chennai: Order before 3:00 PM for next-day delivery by 7PM.\n• Rest of India: Order before 3:00 PM for next-day dispatch.\n• Delivery Timeline: Rest of India: 2–4 days.',
                    whatsappNumber: '919282445577',
                    aboutPageContent: DEFAULT_ABOUT_CONTENT,
                    contactPageContent: DEFAULT_CONTACT_CONTENT,
                    splashContent: DEFAULT_SPLASH_CONTENT,
                    dispatchCutoffHour: 14,
                    dispatchSundayPolicy: false,
                    dispatchLimitText: 'ORDER WITHIN {time} HOURS',
                    nextOrderNumber: 1,
                    orderIdPrefix: '#',
                    orderIdSuffix: '',
                    orderIdPadding: 3
                }
            });
        } else if (!settings.aboutPageContent || !settings.contactPageContent || !settings.splashContent || (settings.splashContent as any).useDefault === undefined) {
            // Migration: Add page contents if missing from existing record
            settings = await prisma.siteSettings.update({
                where: { id: 'default' },
                data: {
                    aboutPageContent: settings.aboutPageContent || DEFAULT_ABOUT_CONTENT,
                    contactPageContent: settings.contactPageContent || DEFAULT_CONTACT_CONTENT,
                    splashContent: settings.splashContent ? { ...DEFAULT_SPLASH_CONTENT, ...(settings.splashContent as any) } : DEFAULT_SPLASH_CONTENT,
                    privacy_content: settings.privacy_content || '',
                    terms_content: settings.terms_content || '',
                    shipping_content: settings.shipping_content || '',
                    refund_content: settings.refund_content || '',
                    nextOrderNumber: settings.nextOrderNumber || 1,
                    orderIdPrefix: settings.orderIdPrefix || '#',
                    orderIdSuffix: settings.orderIdSuffix || '',
                    orderIdPadding: settings.orderIdPadding || 3
                }
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('Fetch settings error:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// GET Public Razorpay Key (Option B - Domain Agnostic)
router.get('/razorpay-key', (req, res) => {
    res.json({ keyId: process.env.RAZORPAY_KEY_ID });
});

// Update settings
router.put('/', authMiddleware, async (req, res) => {
    const {
        deliveryPopupEnabled,
        deliveryPopupTitle,
        deliveryPopupContent,
        whatsappNumber,
        aboutPageContent,
        contactPageContent,
        privacy_content,
        terms_content,
        shipping_content,
        refund_content,
        splashContent,
        dispatchCutoffHour,
        dispatchSundayPolicy,
        dispatchLimitText,
        nextOrderNumber,
        orderIdPrefix,
        orderIdSuffix,
        orderIdPadding
    } = req.body;

    try {
        const settings = await prisma.siteSettings.upsert({
            where: { id: 'default' },
            update: {
                deliveryPopupEnabled,
                deliveryPopupTitle,
                deliveryPopupContent,
                whatsappNumber,
                aboutPageContent,
                contactPageContent,
                privacy_content,
                terms_content,
                shipping_content,
                refund_content,
                splashContent,
                dispatchCutoffHour,
                dispatchSundayPolicy,
                dispatchLimitText,
                nextOrderNumber: nextOrderNumber !== undefined ? nextOrderNumber : undefined,
                orderIdPrefix,
                orderIdSuffix,
                orderIdPadding
            },
            create: {
                id: 'default',
                deliveryPopupEnabled,
                deliveryPopupTitle,
                deliveryPopupContent,
                whatsappNumber: whatsappNumber || '919282445577',
                aboutPageContent: aboutPageContent || DEFAULT_ABOUT_CONTENT,
                contactPageContent: contactPageContent || DEFAULT_CONTACT_CONTENT,
                splashContent: splashContent || DEFAULT_SPLASH_CONTENT,
                privacy_content: privacy_content || '',
                terms_content: terms_content || '',
                shipping_content: shipping_content || '',
                refund_content: refund_content || '',
                dispatchCutoffHour: dispatchCutoffHour !== undefined ? dispatchCutoffHour : 14,
                dispatchSundayPolicy: dispatchSundayPolicy !== undefined ? dispatchSundayPolicy : false,
                dispatchLimitText: dispatchLimitText || 'ORDER WITHIN {time} HOURS',
                nextOrderNumber: nextOrderNumber !== undefined ? nextOrderNumber : 1,
                orderIdPrefix: orderIdPrefix || '#',
                orderIdSuffix: orderIdSuffix || '',
                orderIdPadding: orderIdPadding !== undefined ? orderIdPadding : 3
            }
        });
        res.json(settings);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

export default router;

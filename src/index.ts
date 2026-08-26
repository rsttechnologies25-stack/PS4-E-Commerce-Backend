import dotenv from 'dotenv';
import path from 'path';

// Global error handlers for fatal crashes
process.on('uncaughtException', (err) => {
    console.error('FATAL ERROR: Uncaught Exception:', err);
    // Give some time for logs to flush
    setTimeout(() => process.exit(1), 100);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
    // Give some time for logs to flush
    setTimeout(() => process.exit(1), 100);
});

dotenv.config({ path: path.join(__dirname, '../.env') });
import express from 'express';
import cors from 'cors';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import branchRoutes from './routes/branches';
import adminRoutes from './routes/admin';
import reviewRoutes from './routes/reviews';
import settingsRoutes from './routes/settings';
import userRoutes from './routes/user';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';
import couponRoutes from './routes/coupons';
import shippingRoutes from './routes/shipping';
import deliveryCheckRoutes from './routes/deliveryCheck';
import announcementRoutes from './routes/announcements';
import heroBannerRoutes from './routes/heroBanners';
import suggestionRoutes from './routes/suggestions';
import categoryPairingRoutes from './routes/categoryPairings';
import searchRoutes from './routes/search';
import uploadRoutes from './routes/upload';
import notificationRoutes from './routes/notifications';
import whatsappTemplateRoutes from './routes/whatsappTemplates';
import fcmRoutes from './routes/fcm';
import healthRoutes from './routes/health';
import { startFeedbackCron } from './services/feedbackCron';
import { rlsMiddleware } from './middleware/rls';
import rateLimit from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1); // Fixes rate limit ValidationError: X-Forwarded-For when behind a reverse proxy
const port = process.env.PORT || 4000;

// 1. Basic Middlewares (MUST be first for preflight requests)
import helmet from 'helmet';

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Parse allowed origins from environment and hardcoded safe defaults
const defaultAllowedOrigins = [
    'https://perambursrinivasa.co.in',
    'https://www.perambursrinivasa.co.in',
    'https://ecommerceadmin.perambursrinivasa.co.in',
    'https://admin.perambursrinivasa.co.in',
    'https://ecommerce.perambursrinivasa.co.in',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4000',
    'http://localhost:5000'
];

const envAllowedOrigins: string[] = [];
if (process.env.ALLOWED_ORIGINS) {
    const split = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    envAllowedOrigins.push(...split.filter(Boolean));
}
if (process.env.FRONTEND_URL) envAllowedOrigins.push(process.env.FRONTEND_URL.trim());
if (process.env.ADMIN_URL) envAllowedOrigins.push(process.env.ADMIN_URL.trim());

const allAllowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);

        // Check if origin matches allowed list or is a subdomain of perambursrinivasa.co.in or localhost
        const isAllowed = allAllowedOrigins.includes(origin) ||
                          /^https?:\/\/([a-z0-9-]+\.)*perambursrinivasa\.co\.in(:\d+)?$/i.test(origin) ||
                          /^http:\/\/localhost(:\d+)?$/i.test(origin) ||
                          /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin);

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(new Error(`Not allowed by CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// 2. Global Rate Limiter (Relaxed for development/testing)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 100 to 5000 for development, now 500
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});

// 3. Custom Middlewares
app.use(rlsMiddleware);
app.use(globalLimiter);

// Request logging for debugging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', couponRoutes);
app.use('/api', shippingRoutes);
app.use('/api/delivery', deliveryCheckRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/hero-banners', heroBannerRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/category-pairings', categoryPairingRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/whatsapp-templates', whatsappTemplateRoutes);
app.use('/api/user', fcmRoutes);
app.use('/api', healthRoutes);

app.get('/', (req, res) => {
    res.send('PS4 Sweets API is running');
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[${new Date().toISOString()}] Error:`, err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(Number(port), '0.0.0.0', () => {
    console.log(`Server is running on port ${port} (exposed to 0.0.0.0)`);
    startFeedbackCron();
});

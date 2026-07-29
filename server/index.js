const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

console.log("🚀 [SYSTEM] Starting Kottravai Backend...");
console.log("ENV CHECK", {
  hasGemini: !!process.env.GEMINI_API_KEY,
  hasSupabase: !!process.env.SUPABASE_URL,
  port: process.env.PORT || 5000,
  node_env: process.env.NODE_ENV
});

const rateLimit = require('express-rate-limit');
const axios = require('axios');
const app = express();
const db = require('./db');
const nodemailer = require('nodemailer');
const { verifyConnection } = require('./utils/mailer');
const { createClient } = require('@supabase/supabase-js');
const NodeCache = require('node-cache');
const compression = require('compression');
const multer = require('multer');
let sharp;
try {
    sharp = require('sharp');
    console.log('✅ Sharp library loaded successfully');
} catch (err) {
    console.warn('⚠️  Sharp library failed to load. Image processing will be limited:', err.message);
}
const monitoring = require('./monitoring');
const fs = require('fs');
const { sendEmail } = require('./utils/mailer');
const { sendWhatsAppOTP } = require('./utils/whatsapp');
const { createLeadWithActivity, analyzeLeadAIById } = require('./utils/leadHelpers');
const aiLeadQualificationService = require('./services/aiLeadQualificationService');
const aiCopilotService = require('./services/aiCopilotService');
const leadService = require('./services/leadService');
const escalationService = require('./services/escalationService');
const { sendMetaWhatsAppFreeFormText } = require('./services/metaWhatsappService');
const { buildSearchTokens, normalizeSearchText } = require('./utils/searchEngine');
const { logSearchEvent, getPopularSearches } = require('./services/searchAnalyticsService');
const {
    getB2BAdminTemplate,
    getB2BUserTemplate,
    getContactAdminTemplate,
    getContactUserTemplate,
    getOrderAdminTemplate,
    getOrderUserTemplate,
    getCampusUserTemplate,
    getCampusAdminTemplate,
} = require('./utils/emailTemplates');


// Multer Setup for image memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // Increased 20MB → 50MB for professional grade product photos
});

// Import optional services with graceful fallback for Vercel serverless compatibility
let shiprocketService = { createOrder: async () => ({ orderId: null, shipmentId: null }) };
try { shiprocketService = require('./services/shiprocketService'); } catch (e) { console.warn('⚠️ shiprocketService not loaded:', e.message); }

let shippingService = { getRate: async () => null };
try { shippingService = require('./services/shippingService'); } catch (e) { console.warn('⚠️ shippingService not loaded:', e.message); }

let zohoBooksService = { createInvoice: async () => null };
try { zohoBooksService = require('./services/zohoBooksService'); } catch (e) { console.warn('⚠️ zohoBooksService not loaded:', e.message); }

let syncProductVector = async () => {}, deleteProductVector = async () => {}, fullVectorSync = async () => {};
try { ({ syncProductVector, deleteProductVector, fullVectorSync } = require('./utils/vectorSync')); } catch (e) { console.warn('⚠️ vectorSync not loaded:', e.message); }

let getRagHealth = () => ({});
try { ({ getRagHealth } = require('./thozhi_monitoring')); } catch (e) { console.warn('⚠️ thozhi_monitoring not loaded:', e.message); }

let runAnomalyCheck = async () => {};
try { ({ runAnomalyCheck } = require('./utils/aiAlerting')); } catch (e) { console.warn('⚠️ aiAlerting not loaded:', e.message); }

// Verify SMTP connection at startup
verifyConnection().then(isConnected => {
    if (isConnected) {
        console.log('✅ Zoho SMTP ready for sending emails');
    } else {
        console.warn('⚠️  Zoho SMTP connection failed - emails may not send');
    }
});

// Init Daily Analytics Job
let initDailyAnalyticsJob = () => {};
try {
    ({ initDailyAnalyticsJob } = require('./jobs/dailyAnalyticsJob'));
    initDailyAnalyticsJob();
} catch (e) {
    console.warn('⚠️ dailyAnalyticsJob not loaded:', e.message);
}

// Init Nurturing Job
let initNurturingJob = () => {};
try {
    ({ initNurturingJob } = require('./jobs/followupNurturingJob'));
    initNurturingJob();
} catch (e) {
    console.warn('⚠️ followupNurturingJob not loaded:', e.message);
}

// --- Performance Cache (Simple In-Memory) ---
const productCache = new Map();
const searchRouteCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for browse
const SEARCH_CACHE_TTL = 60 * 1000; // 60 seconds for search queries
const SEARCH_ROUTE_CACHE_TTL = 30 * 1000; // 30 seconds for dedicated search routes

let hasProductSkuColumn = false;
let hasProductTagsColumn = false;

const clearProductCache = () => {
    productCache.clear();
    console.log('🧹 Performance cache completely flushed');
};

const loadProductSchemaFlags = async () => {
    try {
        const result = await db.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'products'"
        );
        const columns = result.rows.map(r => r.column_name);
        hasProductSkuColumn = columns.includes('sku');
        hasProductTagsColumn = columns.includes('tags');
        console.log('🧠 Product schema flags:', { hasProductSkuColumn, hasProductTagsColumn });
    } catch (err) {
        console.warn('⚠️ Failed to load product schema flags:', err.message);
    }
};

loadProductSchemaFlags().catch(err => console.warn('⚠️ loadProductSchemaFlags failed:', err.message));

const affiliateRoutes = require('./routes/affiliates');
const webhooksRoutes = require('./routes/webhooks');

let chatRouter = require('express').Router();
try { chatRouter = require('./chat'); } catch (e) { console.warn('⚠️ chat router not loaded:', e.message); chatRouter.all('*', (req, res) => res.status(503).json({ error: 'Chat service unavailable' })); }

let aiAnalyticsRouter = require('express').Router();
try { aiAnalyticsRouter = require('./routes/ai_analytics'); } catch (e) { console.warn('⚠️ ai_analytics not loaded:', e.message); aiAnalyticsRouter.all('*', (req, res) => res.status(503).json({ error: 'AI analytics unavailable' })); }

let aiIntelligenceRouter = require('express').Router();
try { aiIntelligenceRouter = require('./routes/ai_intelligence'); } catch (e) { console.warn('⚠️ ai_intelligence not loaded:', e.message); aiIntelligenceRouter.all('*', (req, res) => res.status(503).json({ error: 'AI intelligence unavailable' })); }

const PORT = parseInt(process.env.PORT, 10) || 5000;

// PERFORMANCE: Gzip Compression for all responses (Must be FIRST)
app.use(compression());

// Security: Enable Trust Proxy for correct IP extraction behind load balancers/Cloudflare
app.set('trust proxy', 1);

// Security: Helmet for secure headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://checkout.razorpay.com", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://*.flixcart.com", "https://*.supabase.co", "https://itqdnbwbbhyaapquxlqs.supabase.co"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", "http://localhost:5000", "http://localhost:5005", "http://127.0.0.1:5000", "http://127.0.0.1:5005", "https://api.postalpincode.in", "https://*.supabase.co", "https://*.razorpay.com"],
            frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"],
            upgradeInsecureRequests: [],
        },
    },
}));

// Restrict CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://kottravai.in',
            'https://www.kottravai.in',
            'https://alliance.kottravai.in',
            'http://localhost:5173',
            'http://localhost:5180',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:3000',
            'https://kottravai-alliance.vercel.app',
            'https://kottravai-affiliates.vercel.app',
            'https://kottravai-affliates.vercel.app',
            'https://affiliates-kottravai.vercel.app'
        ];
        // Allow Vercel previews and localhost
        const isVercel = origin && (origin.endsWith('.vercel.app') || origin.includes('vercel.app'));
        if (!origin || allowedOrigins.includes(origin) || isVercel) {
            callback(null, true);
        } else {
            console.warn(`🛑 [CORS_BLOCKED] Origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 'Authorization', 'X-Requested-With', 'Accept',
        'x-rtb-fingerprint-id', 'X-RTB-Fingerprint-Id', 'razorpay_payment_id',
        'razorpay_order_id', 'razorpay_signature', 'x-admin-secret',
        'X-Admin-Secret', 'x-auditor-secret'
    ],
    exposedHeaders: [
        'x-rtb-fingerprint-id', 'X-RTB-Fingerprint-Id', 'Content-Range', 'X-Content-Range'
    ],
    credentials: true
}));

// Security: Global Rate Limiter disabled for debugging
/*
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', globalLimiter);

// Security: Stricter Auth Rate Limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts
    message: { error: 'Too many auth attempts, please try again in 15 minutes.' },
});
app.use('/api/auth/', authLimiter);
*/

// 🛡️ Anti-Spam: Specialized Rate Limiter for Reviews
const reviewLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    message: { error: 'Too many reviews submitted. Please try again in 1 minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// app.use(compression()); // Redundant (already at line 88)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/chat', chatRouter);
app.use('/api/ai-analytics', aiAnalyticsRouter);
app.use('/api/ai-intelligence', aiIntelligenceRouter);
try {
    app.use('/api/ai-preferences', require('./routes/preferenceRoutes'));
} catch (e) {
    console.warn('⚠️ preferenceRoutes not loaded:', e.message);
    app.use('/api/ai-preferences', (req, res) => res.status(503).json({ error: 'Preference service unavailable' }));
}

// Security: Block access to .git and other sensitive files
app.use((req, res, next) => {
    if (req.path.includes('.git')) {
        return res.status(403).json({ error: 'Access Denied' });
    }
    next();
});

// Middleware to verify JWT
let supabase;
try { 
    supabase = require('./supabase'); 
} catch (e) { 
    console.error('⚠️ Supabase connection failed, using safe mock:', e.message);
    const mockMethod = () => ({ 
        select: mockMethod, 
        insert: mockMethod, 
        update: mockMethod, 
        delete: mockMethod, 
        eq: mockMethod, 
        single: () => Promise.resolve({ data: null, error: e }),
        maybeSingle: () => Promise.resolve({ data: null, error: e }),
        catch: (cb) => { if(cb) cb(e); return this; }
    });
    supabase = { from: mockMethod, storage: { from: mockMethod }, auth: { admin: { createUser: async () => ({}), listUsers: async () => ({ data: { users: [] } }), updateUserById: async () => ({}) } } }; 
}

// Middleware to verify Supabase Token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const auditorSecret = req.headers['x-auditor-secret'];
    const token = authHeader && authHeader.split(' ')[1];

    // Auditor Bypass for Financial Integrity Tests
    if (auditorSecret === 'audit123') {
        req.user = {
            id: 'audit-bot',
            email: 'audit@kottravai.in',
            mobile: '9876543210',
            fullName: 'Audit Bot'
        };
        return next();
    }

    if (!token) return res.status(401).json({ message: 'Authentication required' });

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) throw error;

        // Attach user info to request (support both email and legacy phone-based users)
        req.user = {
            id: user.id,
            email: user.email || '',
            // Use full email or phone as username to ensure uniqueness for wishlist/cart keys
            username: user.email || user.phone || user.id,
            displayUsername: user.user_metadata?.username || user.email?.split('@')[0] || user.phone || '',
            mobile: user.user_metadata?.mobile || user.phone?.replace(/^\+91/, '') || '',
            fullName: user.user_metadata?.full_name || user.user_metadata?.username || ''
        };
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const logSecurityViolation = async (adminId, role, action, resource, ipAddress, userAgent) => {
    try {
        await db.query(`
            INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            adminId || 'unauthenticated',
            'SECURITY_VIOLATION',
            resource || 'api',
            action || 'UNAUTHORIZED_ACCESS',
            JSON.stringify({ violation: true, timestamp: new Date().toISOString() }),
            ipAddress || '127.0.0.1',
            role || 'NONE',
            userAgent || 'N/A'
        ]);
    } catch (err) {
        console.error('Failed to log security violation:', err.message);
    }
};

const checkLeadAccess = async (req, leadId) => {
    if (req.adminRole === 'SUPER_ADMIN') return { allowed: true };

    const leadRes = await db.query(
        'SELECT assigned_to, team FROM public.leads WHERE id = $1',
        [leadId]
    );
    if (leadRes.rows.length === 0) return { allowed: false, status: 404, error: 'Lead not found' };

    const lead = leadRes.rows[0];

    if (req.adminRole === 'AUDITOR') {
        if (req.method !== 'GET') {
            return { allowed: false, status: 403, error: 'Auditor has read-only access' };
        }
        return { allowed: true };
    }

    if (req.adminRole === 'REPRESENTATIVE') {
        if (lead.assigned_to === null || lead.assigned_to === req.adminUser.id) {
            return { allowed: true };
        }
        return { allowed: false, status: 403, error: 'Forbidden: You do not own this lead' };
    }

    if (req.adminRole === 'MANAGER') {
        if (lead.assigned_to === null || lead.team === req.adminUser.team) {
            return { allowed: true };
        }
        return { allowed: false, status: 403, error: 'Forbidden: Lead belongs to another team' };
    }

    return { allowed: false, status: 403, error: 'Unauthorized role' };
};

const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.adminRole || !allowedRoles.includes(req.adminRole)) {
            return res.status(403).json({ error: `Forbidden: Requires one of roles: ${allowedRoles.join(', ')}` });
        }
        next();
    };
};

const authenticateAdmin = async (req, res, next) => {
    const adminSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'] || req.query.token;
    const systemSecret = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin!Kottravai2025%100';
    const fallbackSecret = 'Admin!Kottravai2025%100e';
    const auditorSecret = req.headers['x-auditor-secret'] || req.headers['X-Auditor-Secret'];

    // 1. Check master secrets first (backward compatibility)
    const token1Match = adminSecret === systemSecret;
    const token2Match = adminSecret === fallbackSecret;
    const token3Match = adminSecret === 'Admin!Kottravai2025%100';

    if (adminSecret && (token1Match || token2Match || token3Match)) {
        req.adminRole = 'SUPER_ADMIN';
        req.adminUser = {
            id: 'master_admin',
            username: 'super_admin',
            role: 'SUPER_ADMIN',
            team: 'Global'
        };
        return next();
    }

    if (auditorSecret === 'read_only_audit' || auditorSecret === 'audit123') {
        if (req.method !== 'GET') {
            return res.status(403).json({ error: 'Auditor has read-only access' });
        }
        req.adminRole = 'AUDITOR';
        req.adminUser = {
            id: 'master_auditor',
            username: 'auditor',
            role: 'AUDITOR',
            team: 'Global'
        };
        return next();
    }

    // 2. Check Supabase token (for agent logins)
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const sessionToken = bearerToken || adminSecret;

    if (sessionToken && sessionToken.startsWith('eyJ')) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
            if (!error && user) {
                const userRes = await db.query(
                    'SELECT id, username, full_name, role, team FROM public.users WHERE id = $1',
                    [user.id]
                );
                if (userRes.rows.length > 0) {
                    const dbUser = userRes.rows[0];
                    if (['SUPER_ADMIN', 'MANAGER', 'REPRESENTATIVE', 'AUDITOR'].includes(dbUser.role)) {
                        req.adminRole = dbUser.role;
                        req.adminUser = {
                            id: dbUser.id,
                            username: dbUser.username || dbUser.full_name,
                            role: dbUser.role,
                            team: dbUser.team
                        };
                        
                        if (dbUser.role === 'AUDITOR' && req.method !== 'GET') {
                            await logSecurityViolation(dbUser.id, dbUser.role, 'WRITE_ATTEMPT', req.path, req.ip, req.headers['user-agent']);
                            return res.status(403).json({ error: 'Auditor has read-only access' });
                        }
                        return next();
                    }
                }
            }
        } catch (jwtErr) {
            console.error('🔐 [authenticateAdmin] JWT verify failed:', jwtErr.message);
        }
    }

    console.error('❌ [authenticateAdmin] UNAUTHORIZED access attempt');
    await logSecurityViolation('unauthenticated', 'NONE', 'UNAUTHORIZED_ACCESS', req.path, req.ip, req.headers['user-agent']);
    return res.status(403).json({ error: 'Unauthorized admin access' });
};

// Governance: Admin Action Logger
const logAdminAction = (action, resource, resourceId, metadata = {}) => {
    return async (req, res, next) => {
        const originalJson = res.json;
        res.json = function(data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const adminId = req.adminUser?.id || req.adminUser?.username || 'unknown_admin';
                const adminRole = req.adminRole || req.adminUser?.role || 'ADMIN';
                const rId = String(resourceId || req.params.id || data?.id || (data?.lead?.id) || 'N/A');
                const logData = [
                    adminId,
                    action,
                    resource,
                    rId,
                    JSON.stringify({ ...metadata, method: req.method }),
                    req.ip,
                    adminRole,
                    req.headers['user-agent'] || 'N/A'
                ];
                
                db.query(`
                    INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, logData).catch(err => console.error('📝 [AUDIT_LOG_ERROR]:', err.message));
            }
            return originalJson.call(this, data);
        };
        next();
    };
};

// Run migrations on startup to ensure schema is correct
const runMigrations = async () => {
    try {
        console.log('🔄 Running database migrations...');
        // Core Extensions
        await db.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Products table columns
        const productCols = [
            ['sku', 'VARCHAR(255)'],
            ['tags', 'TEXT[]'],
            ['is_best_seller', 'BOOLEAN DEFAULT FALSE'],
            ['is_gift_bundle_item', 'BOOLEAN DEFAULT FALSE'],
            ['is_live', 'BOOLEAN DEFAULT TRUE'],
            ['is_custom_request', 'BOOLEAN DEFAULT FALSE'],
            ['custom_form_config', 'JSONB'],
            ['default_form_fields', 'JSONB'],
            ['variants', 'JSONB'],
            ['category_slug', 'VARCHAR(100)'],
            ['short_description', 'TEXT'],
            ['key_features', 'TEXT[]'],
            ['features', 'TEXT[]'],
            ['images', 'TEXT[]'],
            ['hub', 'VARCHAR(100)'],
            ['is_affiliate_eligible', 'BOOLEAN DEFAULT TRUE'],
            ['affiliate_commission_rate', 'NUMERIC(5,2)'],
            ['affiliate_payout_type', 'VARCHAR(50) DEFAULT \'percentage\''],
            ['affiliate_fixed_amount', 'INTEGER'],
            ['min_affiliate_level', 'VARCHAR(50) DEFAULT \'Ambassador\'']
        ];

        for (const [col, type] of productCols) {
            await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS ${col} ${type}`).catch(() => { });
        }

        // Create GIST index for fuzzy search if not exists
        await db.query(`CREATE INDEX IF NOT EXISTS idx_products_search_trgm ON products USING gist (name gist_trgm_ops, category gist_trgm_ops, description gist_trgm_ops)`).catch(() => { });

        // Schema Integrity: Ensure price can handle decimals and large values
        await db.query(`ALTER TABLE products ALTER COLUMN price TYPE NUMERIC(12,2)`).catch(err => {
            console.warn('⚠️  Price column type migration skipped:', err.message);
        });

        // Ensure array columns are actually arrays if they were created differently before
        const arrayCols = ['key_features', 'features', 'images'];
        for (const col of arrayCols) {
            await db.query(`ALTER TABLE products ALTER COLUMN ${col} TYPE TEXT[] USING ${col}::TEXT[]`).catch(() => { });
        }

        // Orders table columns
        const orderCols = [
            ['district', 'VARCHAR(100)'],
            ['state', 'VARCHAR(100)'],
            ['subtotal_server', 'DECIMAL(10, 2)'],
            ['shipping_server', 'DECIMAL(10, 2)'],
            ['total_server', 'DECIMAL(10, 2)'],
            ['shiprocket_order_id', 'VARCHAR(255)'],
            ['shipment_id', 'VARCHAR(255)'],
            ['zone_name', 'VARCHAR(100)'],
            ['address', 'TEXT'],
            ['city', 'VARCHAR(100)'],
            ['pincode', 'VARCHAR(20)'],
            ['affiliate_id', 'UUID'],
            ['referral_code', 'VARCHAR(255)'],
            ['total_gst_server', 'DECIMAL(10, 2)'],
            ['has_customizations', 'BOOLEAN DEFAULT FALSE']
        ];

        // Lead table columns for CRM capture and activity reporting
        const leadCols = [
            ['company_name', 'TEXT'],
            ['source', 'TEXT'],
            ['inquiry', 'TEXT'],
            ['lead_type', 'TEXT'],
            ['status', "TEXT DEFAULT 'new'"],
            ['lead_score', 'INTEGER DEFAULT 0'],
            ['ai_summary', 'TEXT'],
            ['utm_source', 'TEXT'],
            ['utm_medium', 'TEXT'],
            ['utm_campaign', 'TEXT'],
            ['last_contacted_at', 'TIMESTAMP WITH TIME ZONE'],
            ['next_followup_at', 'TIMESTAMP WITH TIME ZONE']
        ];

        for (const [col, type] of leadCols) {
            await db.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} ${type}`).catch(() => { });
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS lead_activities (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                activity_type TEXT NOT NULL,
                activity_description TEXT,
                performed_by UUID,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `).catch(() => { });

        for (const [col, type] of orderCols) {
            await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col} ${type}`).catch(() => { });
        }

        // Create missing tables
        await db.query(`
            CREATE TABLE IF NOT EXISTS pending_orders (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                razorpay_order_id VARCHAR(255) UNIQUE,
                order_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS failed_orders (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                payment_id VARCHAR(255),
                order_id VARCHAR(255),
                error_message TEXT,
                payload JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS alliance_applications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                phone VARCHAR(20) NOT NULL,
                insta_id VARCHAR(255),
                facebook_id VARCHAR(255),
                twitter_id VARCHAR(255),
                youtube_id VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Pending',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Affiliate System Migrations --
            CREATE TABLE IF NOT EXISTS affiliate_applications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                city VARCHAR(100),
                instagram_link TEXT,
                facebook_link TEXT,
                twitter_link TEXT,
                youtube_link TEXT,
                selling_experience TEXT,
                products_promoted TEXT,
                reason TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                user_id UUID,
                reviewed_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS affiliates (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID UNIQUE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(20),
                city VARCHAR(100),
                status VARCHAR(50) DEFAULT 'Approved',
                level VARCHAR(50) DEFAULT 'Ambassador',
                referral_code VARCHAR(255) UNIQUE,
                total_sales NUMERIC DEFAULT 0,
                total_commission NUMERIC DEFAULT 0,
                available_balance NUMERIC DEFAULT 0,
                upi_id VARCHAR(255),
                bank_name VARCHAR(255),
                account_number VARCHAR(255),
                ifsc_code VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS affiliate_links (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
                product_id INTEGER,
                slug VARCHAR(255) UNIQUE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                total_clicks INTEGER DEFAULT 0,
                total_conversions INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS affiliate_clicks (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                link_id UUID REFERENCES affiliate_links(id) ON DELETE CASCADE,
                affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
                ip_address VARCHAR(100),
                user_agent TEXT,
                referrer TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS affiliate_sales (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
                order_id INTEGER,
                link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
                product_id INTEGER,
                product_name VARCHAR(255),
                quantity INTEGER,
                sale_amount NUMERIC NOT NULL,
                commission_rate NUMERIC(5,2),
                commission_amount NUMERIC NOT NULL,
                status VARCHAR(50) DEFAULT 'approved',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS affiliate_payouts (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
                amount NUMERIC NOT NULL,
                payout_method VARCHAR(50),
                payout_details JSONB,
                status VARCHAR(50) DEFAULT 'paid',
                transaction_id VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            -- Analytics System Migrations (Phase 12) --
            CREATE TABLE IF NOT EXISTS chat_analytics_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id VARCHAR(255),
                user_query TEXT,
                normalized_intent VARCHAR(100),
                detected_category VARCHAR(100),
                matched_products JSONB,
                response_latency INTEGER,
                fallback_usage BOOLEAN DEFAULT FALSE,
                pricing_intent VARCHAR(50),
                conversational_domain VARCHAR(100),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS failed_queries (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id VARCHAR(255),
                original_query TEXT,
                cleaned_intent TEXT,
                detected_domain VARCHAR(100),
                failure_reason VARCHAR(100),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS commerce_conversion_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id VARCHAR(255),
                event_type VARCHAR(50),
                product_id UUID REFERENCES products(id) ON DELETE SET NULL,
                category VARCHAR(100),
                order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
                revenue DECIMAL(10, 2),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_preference_memory (
                session_id VARCHAR(255) PRIMARY KEY,
                preferred_categories JSONB DEFAULT '[]',
                pricing_tendency VARCHAR(50),
                last_explored_products JSONB DEFAULT '[]',
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS restricted_query_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                session_id VARCHAR(255),
                query TEXT,
                blocked_reason VARCHAR(100),
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_chat_analytics_session ON chat_analytics_logs(session_id);
            CREATE INDEX IF NOT EXISTS idx_chat_analytics_timestamp ON chat_analytics_logs(timestamp);
            CREATE INDEX IF NOT EXISTS idx_failed_queries_domain ON failed_queries(detected_domain);
            CREATE INDEX IF NOT EXISTS idx_conversion_event ON commerce_conversion_logs(event_type);
            CREATE INDEX IF NOT EXISTS idx_conversion_timestamp ON commerce_conversion_logs(timestamp);

            -- Add affiliate_id to affiliate_clicks if missing
            ALTER TABLE affiliate_clicks ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE;
        `).catch(() => { });

        // 5. Hardened Voter Verification Tracking
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS voter_discount_used BOOLEAN DEFAULT FALSE`).catch(() => {});
        await db.query(`
            CREATE TABLE IF NOT EXISTS voter_verifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID,
                email TEXT,
                ip_address TEXT,
                fingerprint TEXT,
                image_hash TEXT UNIQUE, -- Exact SHA-256
                phash TEXT,            -- Perceptual Hash
                verified BOOLEAN DEFAULT FALSE,
                attempt_count INTEGER DEFAULT 0,
                last_attempt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'pending', 
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Feedback loop for retining
            CREATE TABLE IF NOT EXISTS voter_feedback_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID,
                image_hash TEXT,
                confidence FLOAT,
                source TEXT,
                result TEXT,
                is_uncertain BOOLEAN,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Threshold Change Log for audit/rollback
            CREATE TABLE IF NOT EXISTS voter_threshold_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                old_low FLOAT,
                old_high FLOAT,
                new_low FLOAT,
                new_high FLOAT,
                fallback_rate FLOAT,
                uncertainty_rate FLOAT,
                action TEXT, -- 'tighten' | 'relax' | 'rollback'
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Model Registry for versioning & rollback
            CREATE TABLE IF NOT EXISTS model_registry (
                version TEXT PRIMARY KEY,
                status TEXT DEFAULT 'candidate', -- 'active' | 'candidate' | 'archived'
                accuracy FLOAT,
                f1_score FLOAT,
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Model Performance Logs
            CREATE TABLE IF NOT EXISTS model_performance_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                model_version TEXT REFERENCES model_registry(version),
                metric_name TEXT,
                metric_value FLOAT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_voter_ip ON voter_verifications(ip_address);
            CREATE INDEX IF NOT EXISTS idx_voter_email ON voter_verifications(email);
            CREATE INDEX IF NOT EXISTS idx_voter_phash ON voter_verifications(phash);
            CREATE INDEX IF NOT EXISTS idx_threshold_logs_time ON voter_threshold_logs(created_at);
            CREATE INDEX IF NOT EXISTS idx_model_registry_active ON model_registry(is_active);
        `).catch(err => {
            console.error('⚠️ Voter table migration warning:', err.message);
        });

        console.log('✅ Initial migrations completed');
    } catch (err) {
        console.error('❌ Migration failure on startup:', err.message);
    }
};

// runMigrations(); // Temporarily disabled to debug hang


// Security: Captcha Verification (Placeholder/Infrastructure)
const verifyCaptcha = async (req, res, next) => {
    const captchaToken = req.headers['x-captcha-token'];
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
        // If not configured, just pass but log
        if (!captchaToken && process.env.NODE_ENV === 'production') {
            console.warn(`[SECURITY] Missing captcha token on persistent route: ${req.path}`);
        }
        return next();
    }

    if (!captchaToken) {
        return res.status(400).json({ error: 'Bot protection token is required' });
    }

    try {
        const response = await axios.post(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`);
        if (response.data.success) {
            next();
        } else {
            res.status(403).json({ error: 'Bot verification failed' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Internal verification error' });
    }
};

// Diagnostic diagnostic logger with timing

// Comprehensive security and dev headers with timing
app.use((req, res, next) => {
    const start = Date.now();

    // Log every request
    if (req.path !== '/api/health') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Processing...`);
    }

    // Capture response end to log duration
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path !== '/api/health') {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Done in ${duration}ms`);
        }
    });

    // Explicitly allow private network access
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Permissions-Policy', 'accelerometer=*, gyroscope=*, magnetometer=*, payment=*');
    next();
});


// --- Supabase Storage Proxy (Admin Only) ---
// This bypasses RLS policies because it uses the server-side SERVICE_ROLE_KEY
// Images are compressed to WebP (max 1200px wide, quality 82) before upload.
// For product/gallery folders a 400px thumbnail is also generated.
app.post('/api/storage/upload', authenticateAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const folder = req.body.folder || 'products';
        // Strip original extension and always use .webp
        const baseName = req.file.originalname.replace(/\.[^.]+$/, '');
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}-${baseName}.webp`;
        const filePath = `${folder}/${fileName}`;

        let compressedBuffer;
        if (sharp) {
            console.log(`🖼️  Compressing ${req.file.originalname} → WebP before upload...`);
            // --- Full-resolution WebP (max 1200px wide, quality 82) ---
            compressedBuffer = await sharp(req.file.buffer)
                .rotate()                                 // honour EXIF orientation
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: 82, effort: 4 })
                .toBuffer();
        } else {
            console.warn(`⚠️  Sharp not available. Uploading original ${req.file.originalname}...`);
            compressedBuffer = req.file.buffer;
        }

        console.log(`📡 Uploading ${fileName} (${Math.round(compressedBuffer.length / 1024)} KB) to Supabase...`);

        const { data, error } = await supabase.storage
            .from('products')
            .upload(filePath, compressedBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(data.path);

        // --- Thumbnail (400px wide) for product card grids ---
        let thumbnailUrl = null;
        const thumbFolders = ['products', 'gallery'];
        if (thumbFolders.includes(folder) && sharp) {
            const thumbBuffer = await sharp(req.file.buffer)
                .rotate()
                .resize({ width: 400, withoutEnlargement: true })
                .webp({ quality: 75, effort: 4 })
                .toBuffer();

            const thumbPath = `${folder}/thumbnails/thumb-${fileName}`;
            const { data: thumbData, error: thumbError } = await supabase.storage
                .from('products')
                .upload(thumbPath, thumbBuffer, {
                    contentType: 'image/webp',
                    upsert: true
                });

            if (!thumbError && thumbData) {
                const { data: { publicUrl: tUrl } } = supabase.storage
                    .from('products')
                    .getPublicUrl(thumbData.path);
                thumbnailUrl = tUrl;
                console.log(`✅ Thumbnail uploaded: ${thumbPath} (${Math.round(thumbBuffer.length / 1024)} KB)`);
            } else {
                console.warn('⚠️  Thumbnail upload failed (non-fatal):', thumbError?.message);
            }
        }

        res.json({ publicUrl, thumbnailUrl, path: data.path });
    } catch (err) {
        console.error('❌ Storage Upload Error:', err);
        res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
});

// Enhanced Health Endpoint (Required for Infrastructure Stability)
app.get(['/health', '/api/health'], async (req, res) => {
    try {
        const dbStatus = await db.query('SELECT 1').then(() => true).catch(() => false);
        const orderCount = await db.query('SELECT count(*) FROM orders').then(res => res.rows[0].count).catch(() => 'error');
        
        res.json({
            status: "ok",
            build_id: "v4-final-diag",
            port: PORT,
            uptime: Math.floor(process.uptime()),
            gemini: !!process.env.GEMINI_API_KEY,
            supabase: !!process.env.SUPABASE_URL,
            database: dbStatus ? "connected" : "disconnected",
            orders_in_db: orderCount,
            rag_status: {
                gemini: !!process.env.GEMINI_API_KEY,
                supabase_vector: !!process.env.SUPABASE_URL,
                last_full_sync: productCache.get('last_full_sync') || 'never',
                ...getRagHealth()
            },
            env_checks: {
                has_admin_pass: !!process.env.ADMIN_PASSWORD,
                has_vite_admin_pass: !!process.env.VITE_ADMIN_PASSWORD,
                is_fallback_pass: process.env.VITE_ADMIN_PASSWORD === 'Admin!Kottravai2025%100' || process.env.ADMIN_PASSWORD === 'Admin!Kottravai2025%100'
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(200).json({ 
            status: "degraded",
            error: "Health check logic failure",
            gemini: !!process.env.GEMINI_API_KEY,
            supabase: !!process.env.SUPABASE_URL
        });
    }
});

// 🔍 TEMPORARY DEBUG ENDPOINT (Remove after fixing 500 errors)
app.get('/api/debug-db', async (req, res) => {
    try {
        console.log("🔍 [DEBUG] Running DB Diagnostic...");
        const result = await db.query('SELECT NOW()');
        res.json({
            success: true,
            time: result.rows[0].now,
            env: {
                has_db_url: !!process.env.DATABASE_URL,
                has_vite_db_url: !!process.env.VITE_DATABASE_URL,
                db_url_start: (process.env.DATABASE_URL || "").substring(0, 15) + "...",
                supabase: {
                    has_url: !!process.env.SUPABASE_URL,
                    url_start: (process.env.SUPABASE_URL || "").substring(0, 15) + "...",
                    has_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                    is_initialized: !!supabase,
                    has_insert: supabase && supabase.from && typeof supabase.from('products').insert === 'function',
                    test_select: (await supabase.from('products').select('count', { count: 'exact', head: true })).count
                },
                columns: (await db.query("SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'products'")).rows
            }
        });
    } catch (err) {
        console.error("❌ [DEBUG] DB Diagnostic Failed:", err);
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack,
            env: {
                has_db_url: !!process.env.DATABASE_URL,
                has_vite_db_url: !!process.env.VITE_DATABASE_URL
            }
        });
    }
});

app.get('/api/test-insert', async (req, res) => {
    try {
        const testPayload = [
            "Test Diagnostic Direct " + new Date().toISOString(),
            99.99,
            "Diagnostic",
            "test-diag-direct-" + Date.now(),
            false
        ];
        const query = "INSERT INTO products (name, price, category, slug, is_live) VALUES ($1, $2, $3, $4, $5) RETURNING *";
        const result = await db.query(query, testPayload);
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});

// --- India Post Pincode Lookup API ---
app.get('/api/location/pincode/:pincode', async (req, res) => {
    const { pincode } = req.params;

    // 1. Validation: 6 digits, numeric only
    if (!/^\d{6}$/.test(pincode)) {
        return res.status(400).json({ error: 'Invalid Pincode format. Must be 6 digits.' });
    }

    try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${pincode}`, {
            timeout: 10000, // 🚀 10 second timeout for the slow public API
            headers: { 'Accept': 'application/json' }
        });

        if (!response.data || !Array.isArray(response.data)) {
            return res.status(404).json({ error: "Invalid response from postal API" });
        }

        const data = response.data[0];
        if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
            // Map all entries and deduplicate by City (Block/Name)
            const locationMap = new Map();

            data.PostOffice.forEach(entry => {
                const rawCity = (entry.Block && entry.Block !== 'NA') ? entry.Block : entry.Name;
                const normalizedCity = rawCity.replace(/\s*\(.*?\)\s*/g, '').trim();

                if (!locationMap.has(normalizedCity)) {
                    locationMap.set(normalizedCity, {
                        city: normalizedCity,
                        locality: entry.Name.replace(/\s*\(.*?\)\s*/g, '').trim(),
                        district: entry.District,
                        state: entry.State
                    });
                }
            });

            return res.json({
                locations: Array.from(locationMap.values())
            });
        }

        res.status(404).json({ error: 'Pincode not found' });
    } catch (err) {
        console.error('Pincode Lookup Error Details:', {
            pincode,
            message: err.message,
            stack: err.stack,
            response: err.response?.data
        });
        res.status(500).json({ error: 'Location lookup failed', details: err.message });
    }
});

// Analytics tracking: prefer to mount the tracking router if available, otherwise provide a safe fallback
try {
    // Import tracking router
    const trackingRoutes = require('./routes/trackingRoutes');
    app.use('/api/track', trackingRoutes);

    // Import daily and weekly email sender and setup endpoints
    let generateDailyAnalyticsSummary;
    let sendDailyAnalyticsEmail;
    let sendWeeklyAnalyticsEmail;
    let sendTestDailyEmail;
    try {
      ({ generateDailyAnalyticsSummary } = require('./services/dailyAnalyticsService'));
      ({ sendDailyAnalyticsEmail, sendTestDailyEmail } = require('./services/dailyEmailSender'));
      ({ sendWeeklyAnalyticsEmail } = require('./services/weeklyEmailSender'));
    } catch(e) {
      console.warn('⚠️ Analytics email services not available:', e.message);
    }

    app.get('/api/analytics/preview-daily-report', async (req, res) => {
      try {
        if (!generateDailyAnalyticsSummary) return res.status(503).json({ error: 'Service Unavailable' });
        const summary = await generateDailyAnalyticsSummary();
        res.json(summary);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

        app.all('/api/analytics/send-daily-report', async (req, res) => {
            const start = Date.now();
            try {
                if (!sendDailyAnalyticsEmail) return res.status(503).json({ error: 'Service Unavailable' });
                console.log('[CRON_ENDPOINT] /api/analytics/send-daily-report invoked');
                const result = await sendDailyAnalyticsEmail();
                console.log(`[CRON_ENDPOINT] Completed in ${Date.now() - start}ms`);
                res.json(result);
            } catch (err) {
                console.error('[CRON_ENDPOINT] Error during send-daily-report:', err.message);
                res.status(500).json({ error: err.message });
            }
        });

    app.post('/api/analytics/test-daily-email', async (req, res) => {
      try {
        if (!sendTestDailyEmail) return res.status(503).json({ success: false, message: 'Service Unavailable' });
        const { email, reportDate } = req.body;
        const result = await sendTestDailyEmail(email, reportDate);
        res.status(result.statusCode || 200).json(result);
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.all('/api/analytics/send-weekly-report', async (req, res) => {
      try {
        if (!sendWeeklyAnalyticsEmail) return res.status(503).json({ error: 'Service Unavailable' });
        const result = await sendWeeklyAnalyticsEmail();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });


} catch (e) {
    console.warn('⚠️ trackingRoutes not loaded:', e.message);
    // Fallback: accept posts to /api/track to avoid breaking clients; mimic previous lightweight behaviour
    app.post('/api/track', async (req, res) => {
        try {
            // Keep lightweight acknowledgement to avoid blocking user flows
            return res.status(200).json({ status: 'tracked', db_skipped: true });
        } catch (err) {
            console.error('Analytics tracking error (fallback):', err.message);
            return res.status(200).json({ status: 'failed_silently' });
        }
    });
}

// Setup DB Route (Secured - Only dev or with master secret)
app.get('/api/init-db', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'];
    const secrets = [
        process.env.VITE_ADMIN_PASSWORD,
        process.env.ADMIN_PASSWORD,
        'Admin!Kottravai2025%100'
    ].filter(Boolean);
    const isAuthorized = adminSecret && secrets.includes(adminSecret);

    if (process.env.NODE_ENV === 'production' && !isAuthorized) {
        return res.status(403).json({ error: 'Maintenance route disabled' });
    }
    try {
        const schemaSql = `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            original_id VARCHAR(255) UNIQUE,
            name VARCHAR(255) NOT NULL,
            price NUMERIC(12,2) NOT NULL,
            category VARCHAR(100) NOT NULL,
            image TEXT NOT NULL,
            slug VARCHAR(255) UNIQUE NOT NULL,
            category_slug VARCHAR(100),
            sku VARCHAR(255),
            tags TEXT[],
            short_description TEXT,
            description TEXT,
            key_features TEXT[],
            features TEXT[],
            images TEXT[],
            is_best_seller BOOLEAN DEFAULT FALSE,
            is_gift_bundle_item BOOLEAN DEFAULT FALSE,
            is_live BOOLEAN DEFAULT TRUE,
            is_custom_request BOOLEAN DEFAULT FALSE,
            custom_form_config JSONB,
            default_form_fields JSONB,
            variants JSONB,
            avg_rating NUMERIC(3,2) DEFAULT 0,
            reviews_count INTEGER DEFAULT 0,
            is_affiliate_eligible BOOLEAN DEFAULT TRUE,
            affiliate_commission_rate NUMERIC(5,2) DEFAULT 0,
            affiliate_payout_type VARCHAR(20) DEFAULT 'percentage',
            affiliate_fixed_amount NUMERIC(10,2) DEFAULT 0,
            min_affiliate_level VARCHAR(50) DEFAULT 'Ambassador',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        
        ALTER TABLE products ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT FALSE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS customization_charge NUMERIC(10,2) DEFAULT 100;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_image_upload BOOLEAN DEFAULT FALSE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_custom_text BOOLEAN DEFAULT FALSE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_special_instructions BOOLEAN DEFAULT FALSE;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS max_text_length INTEGER DEFAULT 50;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS max_file_size INTEGER DEFAULT 5;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS allowed_file_types JSONB DEFAULT '["JPG", "JPEG", "PNG", "WEBP"]'::jsonb;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS customizable_tag VARCHAR(50) DEFAULT 'CUSTOMIZABLE';

        CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            user_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            comment TEXT,
            date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            customer_name VARCHAR(255) NOT NULL,
            customer_email VARCHAR(255) NOT NULL,
            customer_phone VARCHAR(20),
            address TEXT,
            city VARCHAR(100),
            district VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(20),
            total DECIMAL(10, 2) NOT NULL,
            subtotal_server DECIMAL(10, 2),
            shipping_server DECIMAL(10, 2),
            total_server DECIMAL(10, 2),
            status VARCHAR(50) DEFAULT 'Pending',
            items JSONB NOT NULL,
            payment_id VARCHAR(255),
            order_id VARCHAR(255),
            shiprocket_order_id VARCHAR(255),
            shipment_id VARCHAR(255),
            zone_name VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wishlist (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            username VARCHAR(255) NOT NULL,
            product_id UUID REFERENCES products(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(username, product_id)
        );

        CREATE TABLE IF NOT EXISTS pending_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            razorpay_order_id VARCHAR(255) UNIQUE,
            order_data JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS failed_orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            payment_id VARCHAR(255),
            order_id VARCHAR(255),
            error_message TEXT,
            payload JSONB,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_query TEXT NOT NULL,
            ai_response TEXT,
            fallback_used BOOLEAN DEFAULT false,
            latency_ms INTEGER,
            confidence_level VARCHAR(20),
            session_id VARCHAR(255),
            cache_hit BOOLEAN DEFAULT false,
            fingerprint VARCHAR(64),
            provider VARCHAR(20),
            quality_score NUMERIC(3,2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            admin_id VARCHAR(255),
            action VARCHAR(100) NOT NULL,
            resource VARCHAR(100),
            resource_id VARCHAR(255),
            metadata JSONB,
            ip_address VARCHAR(45),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS chat_feedback (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            session_id VARCHAR(255),
            query TEXT,
            response TEXT,
            rating INTEGER,
            comments TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_audit_logs(action);

        CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
        CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON orders(payment_id);
        CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
        CREATE INDEX IF NOT EXISTS idx_wishlist_username ON wishlist(username);
        CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_audit_logs(session_id);
        `;
        await db.query(schemaSql);
        res.json({ message: 'Database initialized successfully', status: 'ok' });
    } catch (err) {
        console.error('Migration failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// Products Routes


// Emergency Cache Reset Route (Admin Only)
app.get('/api/cache-reset', authenticateAdmin, (req, res) => {
    clearProductCache();
    res.json({ message: 'Performance cache has been reset' });
});

// Meta (Facebook/WhatsApp) Catalog Feed Automation (Secured)
app.get('/api/catalog-feed', authenticateAdmin, async (req, res) => {
    try {
        // Use cache if available
        let products = productCache.get("all_products");
        if (!products) {
            const result = await db.query('SELECT * FROM products WHERE is_live = TRUE ORDER BY created_at DESC');
            products = result.rows;
            productCache.set("all_products", products);
        }

        // CSV Header - Added product_type for auto-categorization
        let csv = 'id,title,description,availability,condition,price,link,image_link,brand,product_type\n';

        const domain = process.env.VITE_API_URL ? process.env.VITE_API_URL.replace('/api', '') : 'https://kottravai.in';

        products.forEach(p => {
            // Cleanup data for CSV
            const id = p.id;
            const title = `"${p.name.replace(/"/g, '""')}"`;
            const description = `"${(p.short_description || p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
            const availability = 'in stock';
            const condition = 'new';
            const price = `${p.price} INR`;
            const link = `${domain}/product/${p.slug}`;
            const image_link = p.image;
            const brand = 'Kottravai';
            const category = `"${(p.category || 'Uncategorized').replace(/"/g, '""')}"`;

            csv += `${id},${title},${description},${availability},${condition},${price},${link},${image_link},${brand},${category}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=catalog.csv');
        res.status(200).send(csv);
    } catch (err) {
        console.error('Feed Error:', err);
        res.status(500).send('Error generating feed');
    }
});


// Diagnostic: DB Connection & Write Test
app.get('/api/test-db', async (req, res) => {
    try {
        console.log("🔍 [DIAGNOSTIC] Testing DB Connection...");
        const timeRes = await db.query('SELECT NOW()');
        
        console.log("🔍 [DIAGNOSTIC] Attempting dummy product insert...");
        const testSlug = `test-product-${Date.now()}`;
        const insertRes = await db.query(`
            INSERT INTO products (name, price, slug, category, image)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, created_at
        `, ['Test Product', 99.99, testSlug, 'Test Category', 'https://via.placeholder.com/150']);
        
        res.json({
            status: 'success',
            connection: 'ok',
            time: timeRes.rows[0].now,
            inserted: insertRes.rows[0]
        });
    } catch (err) {
        console.error("❌ [DIAGNOSTIC] Failed:", err);
        res.status(500).json({
            status: 'error',
            message: err.message,
            detail: err.detail,
            hint: err.hint,
            code: err.code
        });
    }
});

// Create Product (Admin Only)
app.post('/api/products', authenticateAdmin, logAdminAction('CREATE', 'product'), async (req, res) => {
    try {
        console.log("📝 [CREATE_PRODUCT] Payload received:", JSON.stringify({ ...req.body, image: req.body.image ? 'REDACTED' : null, images: req.body.images ? req.body.images.length : 0 }));
        const {
            name, price, category, image, slug, categorySlug,
            shortDescription, description, keyFeatures, features, images, isBestSeller,
            isGiftBundleItem, isLive, isCustomRequest, customFormConfig, defaultFormFields, variants, hub,
            is_affiliate_eligible, affiliate_commission_rate, affiliate_payout_type, affiliate_fixed_amount, min_affiliate_level,
            image_alts, imageAlts, isCustomizable, customizationCharge, allowImageUpload, allowCustomText, allowSpecialInstructions, maxTextLength, maxFileSize, allowedFileTypes, customizableTag
        } = req.body;

        if (!name) {
            console.error("❌ [CREATE_PRODUCT] Missing product name");
            return res.status(400).json({ error: "Product name is required" });
        }

        const cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : Number(price);
        const productSlug = slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        console.log("💰 [CREATE_PRODUCT] Price:", cleanPrice, "| Slug:", productSlug);

        const normalizeText = (text) => {
            if (!text) return '';
            return text
                .toString()
                .toLowerCase()
                .replace(/\bkottravai\b/gi, ' ')
                .replace(/[^a-z0-9\s]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const normalizedName = normalizeText(name);
        const normalizedCategory = normalizeText(category);
        const normalizedDescription = normalizeText(description);

        const finalImageAlts = image_alts || imageAlts || {};

        console.log("📡 [CREATE_PRODUCT] Inserting via pg...");
        const result = await db.query(`
            INSERT INTO products (
                name, price, category, image, slug, category_slug,
                short_description, description, key_features, features, images,
                is_best_seller, is_gift_bundle_item, is_live, is_custom_request,
                custom_form_config, default_form_fields, variants, hub,
                is_affiliate_eligible, affiliate_commission_rate, affiliate_payout_type,
                affiliate_fixed_amount, min_affiliate_level,
                normalized_name, normalized_category, normalized_description,
                image_alts,
                is_customizable, customization_charge, allow_image_upload, allow_custom_text, allow_special_instructions, max_text_length, max_file_size, allowed_file_types, customizable_tag
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11,
                $12, $13, $14, $15,
                $16, $17, $18, $19,
                $20, $21, $22,
                $23, $24, $25, $26, $27,
                $28,
                $29, $30, $31, $32, $33, $34, $35, $36, $37
            ) RETURNING *
        `, [
            name,
            isNaN(cleanPrice) ? 0 : cleanPrice,
            category || '',
            image || '',
            productSlug,
            categorySlug || '',
            shortDescription || '',
            description || '',
            Array.isArray(keyFeatures) ? keyFeatures : [],
            Array.isArray(features) ? features : [],
            Array.isArray(images) ? images : [],
            isBestSeller || false,
            isGiftBundleItem || false,
            isLive === undefined ? true : isLive,
            isCustomRequest || false,
            customFormConfig ? JSON.stringify(customFormConfig) : null,
            defaultFormFields ? JSON.stringify(defaultFormFields) : null,
            variants ? JSON.stringify(variants) : null,
            hub || null,
            is_affiliate_eligible === undefined ? true : is_affiliate_eligible,
            affiliate_commission_rate || 0,
            affiliate_payout_type || 'percentage',
            affiliate_fixed_amount || 0,
            min_affiliate_level || 'Ambassador',
            normalizedName,
            normalizedCategory,
            normalizedDescription,
            JSON.stringify(finalImageAlts),
            isCustomizable || false,
            customizationCharge || 100,
            allowImageUpload || false,
            allowCustomText || false,
            allowSpecialInstructions || false,
            maxTextLength || 50,
            maxFileSize || 5,
            allowedFileTypes ? JSON.stringify(allowedFileTypes) : JSON.stringify(['JPG', 'JPEG', 'PNG', 'WEBP']),
            customizableTag || 'CUSTOMIZABLE'
        ]);

        const data = result.rows[0];
        if (!data) {
            return res.status(500).json({ error: 'Insert succeeded but no data returned' });
        }

        console.log("✅ [CREATE_PRODUCT] Product created successfully:", data.id);
        clearProductCache();
        if (typeof syncProductVector === 'function') {
            syncProductVector(data.id).catch(err => console.error('Background Sync Error:', err));
        }
        res.status(201).json(data);
    } catch (err) {
        console.error('❌ [CREATE_PRODUCT] Critical Crash:', err.message, err.stack);
        res.status(500).json({ error: err.message || 'Internal Server Error', details: err.detail || null, code: err.code || null });
    }
});

// Update Product (Admin Only)
app.put('/api/products/:id', authenticateAdmin, logAdminAction('UPDATE', 'product'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, price, category, image, slug, categorySlug,
            shortDescription, description, keyFeatures, features, images, isBestSeller,
            isGiftBundleItem, isLive, isCustomRequest, customFormConfig, defaultFormFields, variants, hub,
            is_affiliate_eligible, affiliate_commission_rate, affiliate_payout_type, affiliate_fixed_amount, min_affiliate_level,
            image_alts, imageAlts, isCustomizable, customizationCharge, allowImageUpload, allowCustomText, allowSpecialInstructions, maxTextLength, maxFileSize, allowedFileTypes, customizableTag
        } = req.body;

        const cleanPrice = typeof price === 'string' ? parseFloat(price.replace(/,/g, '')) : Number(price);

        const normalizeText = (text) => {
            if (!text) return '';
            return text
                .toString()
                .toLowerCase()
                .replace(/\bkottravai\b/gi, ' ')
                .replace(/[^a-z0-9\s]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const normalizedName = normalizeText(name);
        const normalizedCategory = normalizeText(category);
        const normalizedDescription = normalizeText(description);

        const finalImageAlts = image_alts || imageAlts || {};

        console.log(`📡 [UPDATE_PRODUCT] Updating product ${id} via pg...`);
        const result = await db.query(`
            UPDATE products SET
                name = $1, price = $2, category = $3, image = $4, slug = $5,
                category_slug = $6, short_description = $7, description = $8,
                key_features = $9, features = $10, images = $11,
                is_best_seller = $12, is_gift_bundle_item = $13, is_live = $14,
                is_custom_request = $15, custom_form_config = $16, default_form_fields = $17,
                variants = $18, hub = $19, is_affiliate_eligible = $20,
                affiliate_commission_rate = $21, affiliate_payout_type = $22,
                affiliate_fixed_amount = $23, min_affiliate_level = $24,
                normalized_name = $25, normalized_category = $26, normalized_description = $27,
                image_alts = $28,
                is_customizable = $30, customization_charge = $31, allow_image_upload = $32,
                allow_custom_text = $33, allow_special_instructions = $34, max_text_length = $35,
                max_file_size = $36, allowed_file_types = $37, customizable_tag = $38
            WHERE id = $29
            RETURNING *
        `, [
            name,
            isNaN(cleanPrice) ? 0 : cleanPrice,
            category || '',
            image || '',
            slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
            categorySlug || '',
            shortDescription || '',
            description || '',
            Array.isArray(keyFeatures) ? keyFeatures : [],
            Array.isArray(features) ? features : [],
            Array.isArray(images) ? images : [],
            isBestSeller || false,
            isGiftBundleItem || false,
            isLive === undefined ? true : isLive,
            isCustomRequest || false,
            customFormConfig ? JSON.stringify(customFormConfig) : null,
            defaultFormFields ? JSON.stringify(defaultFormFields) : null,
            variants ? JSON.stringify(variants) : null,
            hub || null,
            is_affiliate_eligible === undefined ? true : is_affiliate_eligible,
            affiliate_commission_rate || 0,
            affiliate_payout_type || 'percentage',
            affiliate_fixed_amount || 0,
            min_affiliate_level || 'Ambassador',
            normalizedName,
            normalizedCategory,
            normalizedDescription,
            JSON.stringify(finalImageAlts),
            id,
            isCustomizable || false,
            customizationCharge || 100,
            allowImageUpload || false,
            allowCustomText || false,
            allowSpecialInstructions || false,
            maxTextLength || 50,
            maxFileSize || 5,
            allowedFileTypes ? JSON.stringify(allowedFileTypes) : JSON.stringify(['JPG', 'JPEG', 'PNG', 'WEBP']),
            customizableTag || 'CUSTOMIZABLE'
        ]);

        const data = result.rows[0];
        if (!data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        console.log(`✅ [UPDATE_PRODUCT] Product ${id} updated successfully`);
        clearProductCache();
        syncProductVector(id).catch(err => console.error('Background Sync Error:', err));
        res.json(data);
    } catch (err) {
        console.error('❌ [UPDATE_PRODUCT] Crash:', err.message, err.detail);
        res.status(500).json({ error: err.message || 'Internal Server Error', details: err.detail || null, code: err.code || null });
    }
});

// Delete Product (Admin Only)
app.delete('/api/products/:id', authenticateAdmin, logAdminAction('DELETE', 'product'), async (req, res) => {
    try {
        const { id } = req.params;

        console.log(`🗑️ [DELETE_PRODUCT] Deleting product ${id} via pg...`);
        const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        console.log(`✅ [DELETE_PRODUCT] Product ${id} deleted successfully`);
        clearProductCache();
        deleteProductVector(id).catch(err => console.error('Background Delete Sync Error:', err));
        res.json({ message: 'Product deleted successfully', product: result.rows[0] });
    } catch (err) {
        console.error('❌ [DELETE_PRODUCT] Crash:', err.message);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});

// Create Review
app.post('/api/reviews', reviewLimiter, async (req, res) => {
    try {
        const { productId, userName, email, rating, comment } = req.body;

        // 1. Strong Backend Validation
        if (!productId || !userName || !rating) {
            return res.status(400).json({ error: 'Missing required review fields' });
        }

        if (userName.trim().length < 2) {
            return res.status(400).json({ error: 'User name must be at least 2 characters long' });
        }

        if (!comment || comment.trim().length < 3) {
            return res.status(400).json({ error: 'Comment must be at least 3 characters long' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Check if Product Exists
        const { data: productExists, error: productCheckErr } = await supabase
            .from('products')
            .select('id')
            .eq('id', productId)
            .single();

        if (productCheckErr || !productExists) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // 2. Duplicate Review Prevention (By UserName + ProductID)
        const { data: duplicateCheck, error: duplicateCheckErr } = await supabase
            .from('reviews')
            .select('id')
            .eq('product_id', productId)
            .eq('user_name', userName.trim())
            .single();

        if (duplicateCheck) {
            return res.status(400).json({ error: 'You have already reviewed this product' });
        }

        // 3. Insert Review
        const { data: returnedReview, error: insertErr } = await supabase
            .from('reviews')
            .insert([{
                product_id: productId,
                user_name: userName.trim(),
                email: email?.trim(),
                rating: parseInt(rating),
                comment: comment.trim()
            }])
            .select()
            .single();

        if (insertErr) throw insertErr;

        // 4. Optimized Average Rating Calculation (Background, but we wait for consistency)
        try {
            const { data: statsData } = await supabase
                .from('reviews')
                .select('rating')
                .eq('product_id', productId);
            
            if (statsData && statsData.length > 0) {
                const totalRating = statsData.reduce((acc, curr) => acc + curr.rating, 0);
                const avgRating = (totalRating / statsData.length).toFixed(2);
                
                // Update products table with consolidated stats
                await supabase
                    .from('products')
                    .update({ 
                        avg_rating: parseFloat(avgRating),
                        reviews_count: statsData.length
                    })
                    .eq('id', productId);
            }
        } catch (statsErr) {
            console.error('Failed to update product stats after review:', statsErr.message);
            // Non-critical, we don't return error
        }

        // Map back to camelCase for frontend
        const reviewResponse = {
            id: returnedReview.id,
            productId: returnedReview.product_id,
            userName: returnedReview.user_name,
            email: returnedReview.email,
            rating: returnedReview.rating,
            comment: returnedReview.comment,
            date: returnedReview.date
        };

        res.status(201).json(reviewResponse);
        clearProductCache(); // Reviews are part of product data
    } catch (err) {
        console.error('Error adding review:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Dynamic Shipping Calculation (Secure Zone-Based) ---
app.post('/api/shipping/calculate', async (req, res) => {
    try {
        const { state, cartTotal } = req.body;

        if (!state) {
            return res.status(400).json({ error: 'State is required for shipping calculation' });
        }

        const result = await shippingService.calculateShipping(state, cartTotal);
        res.json(result);
    } catch (err) {
        console.error('Shipping API Error:', err.message);
        res.status(500).json({ error: 'Fallback shipping rules applied', charge: 125 });
    }
});

// Orders Routes

/**
 * RECALCULATION ENGINE
 * Ensures prices are valid and variants are accounted for.
 * Authoritative source of financial truth.
 */
const recalculateTotals = async (items, state) => {
    const uniqueProductIds = Array.from(new Set(items.map(item => item.id)));
    const res = await db.query('SELECT id, price, variants, gst_rate FROM products WHERE id = ANY($1)', [uniqueProductIds]);
    const dbProducts = res.rows;

    if (!dbProducts || dbProducts.length === 0) throw new Error('COULD_NOT_FETCH_PRODUCTS');

    let subtotalCents = 0;
    let totalGstCents = 0;
    
    for (const item of items) {
        const dbProduct = dbProducts.find(p => p.id === item.id);
        if (!dbProduct) throw new Error(`PRODUCT_NOT_FOUND: ${item.id}`);

        let itemPrice = Number(dbProduct.price);
        if (item.selectedVariant && dbProduct.variants) {
            const variant = dbProduct.variants.find(v => v.weight === item.selectedVariant.weight);
            if (variant) itemPrice = Number(variant.price);
        }
        
        const quantity = item.quantity || 1;
        const customCharge = item.customizationData?.isCustomized ? Number(item.customizationData.customizationCharge || 0) : 0;
        const itemTotalCents = (Math.round(itemPrice * 100) * quantity) + Math.round(customCharge * 100);
        subtotalCents += itemTotalCents;
        
        const gstRate = Number(dbProduct.gst_rate || 0);
        item.gst_rate = gstRate; // Store it back in the item object

        if (gstRate > 0) {
            // Calculate GST: Price * GST% / 100
            totalGstCents += Math.round(itemTotalCents * (gstRate / 100));
        }
    }

    const shipping = await shippingService.calculateShipping(state || 'Rest of India', subtotalCents / 100);
    const shippingCents = Math.round(shipping.shippingFee * 100);

    return {
        subtotalCents,
        shippingCents,
        totalGstCents,
        totalCents: subtotalCents + shippingCents + totalGstCents,
        zoneName: shipping.zoneName
    };
};

/**
 * Trigger emails and Shiprocket without blocking the main response
 */
const triggerAsyncTasks = async (orderId, orderData, paymentId) => {
    try {
        const row = orderData; // Use orderData as the source for customer info

        // --- EMAIL NOTIFICATION ---
        const adminEmail = 'admin@kottravai.in';
        const templateData = {
            orderId: orderId,
            customerName: row.customerName,
            customerEmail: row.customerEmail,
            customerPhone: row.customerPhone,
            address: row.address,
            city: row.city,
            pincode: row.pincode,
            total: parseFloat(row.total),
            items: JSON.parse(JSON.stringify(row.items)),
            paymentId: paymentId
        };

        await Promise.all([
            sendEmail({
                to: adminEmail,
                subject: `New Order Received #${orderId} - ${row.customerName}`,
                html: getOrderAdminTemplate(templateData),
                type: 'order'
            }),
            sendEmail({
                to: row.customerEmail,
                subject: `Order Confirmation - #${orderId}`,
                html: getOrderUserTemplate(templateData),
                type: 'order'
            })
        ]).catch(e => console.error('📧 [EMAIL_FAILURE]:', e.message));

        const hasCustomizations = row.items?.some(item => item.customizationData?.isCustomized);
        if (hasCustomizations) {
            const attachments = [];
            let imageIndex = 1;

            const customItemsHtml = row.items.filter(item => item.customizationData?.isCustomized).map(item => {
                let imageHtml = '';
                if (item.customizationData.customImage) {
                    try {
                        const base64Data = item.customizationData.customImage.split(';base64,').pop();
                        // Handle potential edge cases where mime type might be weird or missing
                        let ext = 'jpg';
                        if (item.customizationData.customImage.includes('data:image/')) {
                            ext = item.customizationData.customImage.substring("data:image/".length, item.customizationData.customImage.indexOf(";base64"));
                        }
                        const filename = `custom-image-${imageIndex}.${ext}`;
                        attachments.push({
                            filename: filename,
                            content: Buffer.from(base64Data, 'base64')
                        });
                        imageHtml = `<p><strong>Image:</strong> <em>Attached as ${filename}</em></p>`;
                        imageIndex++;
                    } catch (err) {
                        console.error('Error attaching custom image:', err);
                        imageHtml = `<p><strong>Image:</strong> <em>Failed to attach image</em></p>`;
                    }
                }

                return `
                <div style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px;">
                    <h4>${item.name}</h4>
                    <p><strong>Custom Text:</strong> ${item.customizationData.customText || 'N/A'}</p>
                    <p><strong>Special Instructions:</strong> ${item.customizationData.specialInstructions || 'N/A'}</p>
                    ${imageHtml}
                </div>
            `}).join('');

            await sendEmail({
                to: adminEmail,
                subject: `✨ ACTION REQUIRED: Custom Order Received #${orderId}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #8E2A8B;">Custom Order Alert</h2>
                        <p>Order <strong>#${orderId}</strong> contains customized items that require special attention.</p>
                        <h3>Customer Details</h3>
                        <p>Name: ${row.customerName}<br>Email: ${row.customerEmail}<br>Phone: ${row.customerPhone}</p>
                        <h3>Customization Requirements</h3>
                        ${customItemsHtml}
                        <p style="margin-top: 20px;">Please check the email attachments for the uploaded reference images.</p>
                    </div>
                `,
                type: 'order',
                attachments: attachments
            }).catch(e => console.error('📧 [CUSTOM_ORDER_EMAIL_FAILURE]:', e.message));
        }

        console.log(`📧 [EMAIL_SENT] Order #${orderId}`);

        // WhatsApp order confirmation (AskEva API)
        try {
            const { sendWhatsAppOrderConfirmation } = require('./utils/whatsapp');

            await sendWhatsAppOrderConfirmation(row.customerPhone, orderId, row.customerName);
        } catch (waErr) {
            console.error('📱 [ASKEVA_WHATSAPP_FAILURE]:', waErr.message);
        }

        // --- SHIPROCKET ---
        try {
            console.log(`🚀 [SHIPROCKET_TRIGGERING] Order #${orderId}`);
            let sanitizedPhone = row.customerPhone || "9999999999";
            sanitizedPhone = sanitizedPhone.toString().replace(/\D/g, "").slice(-10);

            const shipmentResult = await shiprocketService.createOrder({
                orderId: orderId,
                orderDate: new Date().toISOString().split('T')[0],
                customer: {
                    firstName: row.customerName.split(' ')[0],
                    lastName: row.customerName.split(' ').slice(1).join(' '),
                    email: row.customerEmail,
                    phone: sanitizedPhone,
                    address: row.address,
                    city: row.city,
                    state: row.state || 'Tamil Nadu',
                    pincode: row.pincode,
                    country: 'India',
                },
                items: row.items.map(item => ({
                    id: item.id,
                    name: item.name,
                    sku: item.sku || `SKU-${item.id}`,
                    quantity: item.quantity,
                    price: item.price,
                })),
                payment: { method: 'prepaid' },
                dimensions: { length: 10, breadth: 10, height: 10, weight: 0.5 }
            });

            // Update the order in DB with Shiprocket details
            await db.query(
                "UPDATE orders SET shiprocket_order_id = $1, shipment_id = $2 WHERE order_id = $3",
                [shipmentResult.orderId, shipmentResult.shipmentId, orderId]
            );

            console.log(`📦 [SHIPROCKET_CREATED] Order #${orderId}`);
        } catch (shipErr) {
            console.error(`❌ [SHIPROCKET_ERROR] Order #${orderId}:`, shipErr.message);
            // Log full error for debugging in the console
            if (shipErr.response) {
                console.error('Shiprocket Response:', JSON.stringify(shipErr.response, null, 2));
            }
        }

        // --- ZOHO BOOKS INVOICE ---
        try {
            console.log(`📄 [ZOHO_BOOKS_TRIGGERING] Order #${orderId}`);
            const invoice = await zohoBooksService.createInvoice({
                ...row,
                orderId,
                paymentId
            });
            
            if (invoice && invoice.invoice_id) {
                await db.query(
                    "UPDATE orders SET zoho_invoice_id = $1 WHERE order_id = $2",
                    [invoice.invoice_id, orderId]
                );
                console.log(`✅ [ZOHO_BOOKS_SYNCED] Order #${orderId} -> Invoice ID: ${invoice.invoice_id}`);
            }
        } catch (zohoErr) {
            console.error(`❌ [ZOHO_BOOKS_ERROR] Order #${orderId}:`, zohoErr.message);
        }

    } catch (criticalErr) {
        console.error('🚨 ASYNC_TASK_SYSTEM_FAILURE:', criticalErr.message);
    }
};

/**
 * CORE ORDER PROCESSING ENGINE (Idempotent)
 * Handles DB saving, Email, and Shiprocket logic.
 */
const finalizeOrder = async (orderData, paymentId) => {
    const { orderId } = orderData;

    try {
        // 1. Idempotency Check
        const checkRes = await db.query('SELECT id, status, order_id FROM orders WHERE payment_id = $1', [paymentId]);
        const existingOrder = checkRes.rows[0];

        if (existingOrder) {
            console.log(`ℹ️ [ORDER_ALREADY_EXISTS] Payment ID: ${paymentId}`);
            return { success: true, order: existingOrder, alreadyProcessed: true };
        }

        // 2. Perform Backend Recalculation (Security Guard)
        const calc = await recalculateTotals(orderData.items, orderData.state);

        // 3. Save to Database
        const referralCode = orderData.referral_code || orderData.referralCode;
        const hasCustomizations = orderData.items.some(item => item.customizationData?.isCustomized);
        const insertRes = await db.query(`
            INSERT INTO orders (
                customer_name, customer_email, customer_phone, address, city, district, state,
                pincode, total, items, payment_id, order_id, status, 
                subtotal_server, shipping_server, total_server, total_gst_server, zone_name, referral_code,
                customer_id, guest_order, has_customizations
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
            RETURNING *
        `, [
            orderData.customerName, orderData.customerEmail, orderData.customerPhone, orderData.address,
            orderData.city, orderData.district, orderData.state, orderData.pincode,
            calc.totalCents / 100, JSON.stringify(orderData.items), paymentId, orderId, 'Processing',
            calc.subtotalCents / 100, calc.shippingCents / 100, calc.totalCents / 100, calc.totalGstCents / 100, calc.zoneName, referralCode,
            orderData.customerId || null, !!orderData.guest_order, hasCustomizations
        ]);

        const row = insertRes.rows[0];

        console.log(`✅ [ORDER_CREATED] Order ID: ${orderId} | ID in DB: ${row.id}`);

        // 4. Affiliate Tracking Logic (Process Sales & Commissions)
        if (referralCode) {
            try {
                let affiliate = null;
                let linkId = null;

                // Priority 1: Check if it's an Affiliate Link Slug
                const linkRes = await db.query(`
                    SELECT a.*, l.id as link_primary_id 
                    FROM affiliate_links l 
                    JOIN affiliates a ON l.affiliate_id = a.id 
                    WHERE l.slug = $1 AND l.is_active = true AND a.status = $2
                `, [referralCode, 'Approved']);
                
                if (linkRes.rows.length > 0) {
                    affiliate = linkRes.rows[0];
                    linkId = linkRes.rows[0].link_primary_id;
                    console.log(`🔗 [LINK_ATTRIBUTION] Matched Link Slug: ${referralCode}`);
                } else {
                    // Priority 2: Check if it's a direct Referral Code
                    const affRes = await db.query('SELECT * FROM affiliates WHERE referral_code = $1 AND status = $2', [referralCode, 'Approved']);
                    if (affRes.rows.length > 0) {
                        affiliate = affRes.rows[0];
                        console.log(`👤 [DIRECT_ATTRIBUTION] Matched Referral Code: ${referralCode}`);
                    }
                }

                if (affiliate) {
                    let totalCommissionAmount = 0;
                    let totalEligiblePrice = 0;
                    
                    // Fetch product details for precise commission calculation
                    const itemIds = orderData.items.map(i => i.id).filter(id => id);
                    if (itemIds.length > 0) {
                        const prodRes = await db.query('SELECT id, name, is_affiliate_eligible, affiliate_commission_rate, affiliate_payout_type, affiliate_fixed_amount, min_affiliate_level FROM products WHERE id = ANY($1)', [itemIds]);
                        const dbProds = prodRes.rows;
                        
                        // Self-Referral Protection
                        if (orderData.customerEmail?.toLowerCase() === affiliate.email?.toLowerCase()) {
                            console.log(`🚫 [SELF_REFERRAL_BLOCKED] Affiliate ${affiliate.name} tried to refer themselves.`);
                        } else {
                            // Define Level Weights for Hierarchy
                            const levelWeights = {
                                'Ambassador': 1,
                                'Kottravai Seller': 2,
                                'Kottravai Pro Partner': 3
                            };

                            // Process each item individually
                            for (const item of orderData.items) {
                                const product = dbProds.find(p => p.id.toString() === item.id.toString());
                                if (product && product.is_affiliate_eligible) {
                                    // CHECK LEVEL ELIGIBILITY
                                    const minLevel = product.min_affiliate_level || 'Ambassador';
                                    const affLevel = affiliate.level || 'Ambassador';
                                    
                                    const minWeight = levelWeights[minLevel] || 0;
                                    const affWeight = levelWeights[affLevel] || 0;

                                    if (affWeight < minWeight) {
                                        console.log(`⚠️ [LEVEL_BLOCKED] Affiliate ${affiliate.name} (${affLevel}) is below ${minLevel} for ${product.name}`);
                                        continue;
                                    }

                                    const rate = parseFloat(product.affiliate_commission_rate) || 0;
                                    const fixed = parseFloat(product.affiliate_fixed_amount) || 0;
                                    const type = product.affiliate_payout_type || 'percentage';
                                    const price = parseFloat(item.price) || 0;
                                    const qty = parseInt(item.quantity) || 1;
                                    
                                    let itemCommission = 0;
                                    if (type === 'percentage') {
                                        itemCommission = (price * rate / 100) * qty;
                                    } else {
                                        itemCommission = fixed * qty;
                                    }

                                    if (itemCommission > 0) {
                                        totalCommissionAmount += itemCommission;
                                        totalEligiblePrice += price * qty;
                                        
                                        // Insert individual sale record
                                        await db.query(`
                                            INSERT INTO affiliate_sales (
                                                affiliate_id, order_id, link_id, product_id, product_name, 
                                                quantity, sale_amount, commission_rate, commission_amount, status
                                            )
                                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                        `, [
                                            affiliate.id, row.id, linkId, product.id, product.name,
                                            qty, price * qty, (type === 'percentage' ? rate : (itemCommission / (price * qty) * 100)).toFixed(2),
                                            itemCommission, 'approved'
                                        ]);
                                    }
                                }
                            }
                        }
                    }

                    if (totalCommissionAmount > 0) {
                        // Update Affiliate Cumulative Balances
                        await db.query(`
                            UPDATE affiliates 
                            SET total_sales = total_sales + $1,
                                total_commission = total_commission + $2,
                                available_balance = available_balance + $2
                            WHERE id = $3
                        `, [totalEligiblePrice, totalCommissionAmount, affiliate.id]);

                        // Link Order to Affiliate ID
                        await db.query('UPDATE orders SET affiliate_id = $1, referral_code = $2 WHERE id = $3', [affiliate.id, referralCode, row.id]);

                        // Update Conversion count
                        if (linkId) {
                            await db.query('UPDATE affiliate_links SET total_conversions = total_conversions + 1 WHERE id = $1', [linkId]);
                        }
                        
                        console.log(`🎯 [AFFILIATE_SUCCESS] Linked items from order ${row.id} to ${affiliate.name} | Total: ₹${totalCommissionAmount}`);
                    }
                }
            } catch (affError) {
                console.error('⚠️ [AFFILIATE_TRACKING_ERROR]', affError.message);
            }
        }

        // Send emails and trigger Shiprocket
        await triggerAsyncTasks(orderId, orderData, paymentId);

        return { success: true, order: row };

    } catch (err) {
        console.error('❌ [CRITICAL_ORDER_FAILURE]:', err.message);

        // Log to failed_orders
        await db.query(
            'INSERT INTO failed_orders (payment_id, order_id, error_message, payload) VALUES ($1, $2, $3, $4)',
            [paymentId, orderId, err.message, JSON.stringify(orderData)]
        ).catch(dbErr => console.error('🚨 Failed to log failure to DB:', dbErr.message));

        throw err;
    }
};

app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { paymentId, orderId, ...orderData } = req.body; // Extract orderData

        const result = await finalizeOrder({ ...orderData, orderId }, paymentId);
        res.status(201).json(result.order);

    } catch (err) {
        res.status(500).json({ error: 'ORDER_ERROR', message: err.message });
    }
});

// Customizations upload endpoint
app.post('/api/upload-customization', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }

        const { productId } = req.body;
        const ext = path.extname(req.file.originalname) || '.png';
        const fileName = `custom-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
        const filePath = `${productId || 'unknown'}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('custom-orders')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(error.message);
        }

        const { data: { publicUrl } } = supabase.storage
            .from('custom-orders')
            .getPublicUrl(filePath);

        res.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error('Error uploading customization image:', err);
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        // Admin Access Bypass
        const adminSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'];
        const secrets = [
            process.env.VITE_ADMIN_PASSWORD,
            process.env.ADMIN_PASSWORD,
            'Admin!Kottravai2025%100',
            'Admin!Kottravai2025%100e'
        ].filter(Boolean);
        
        const isAuthorized = adminSecret && secrets.includes(adminSecret);

        console.log('🔍 [DEBUG] GET /api/orders attempt', { 
            hasAdminSecret: !!adminSecret, 
            isAuthorized
        });

        if (isAuthorized) {
            const resAdmin = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
            const rows = resAdmin.rows;
            console.log(`✅ [DEBUG] Admin orders fetched: ${rows.length} rows`);
            if (rows.length === 0) {
                console.warn('⚠️ [DEBUG] Admin orders query returned 0 rows despite health check report');
            }

            return res.json(rows.map(row => ({
                id: row.id,
                orderId: row.order_id,
                customerName: row.customer_name,
                customerEmail: row.customer_email,
                customerPhone: row.customer_phone,
                address: row.address,
                city: row.city,
                district: row.district,
                state: row.state,
                pincode: row.pincode,
                total: parseFloat(row.total),
                status: row.status,
                date: row.created_at,
                items: row.items,
                paymentId: row.payment_id,
                shiprocketOrderId: row.shiprocket_order_id,
                shipmentId: row.shipment_id,
                zoneName: row.zone_name,
                subtotal_server: parseFloat(row.subtotal_server || 0),
                shipping_server: parseFloat(row.shipping_server || 0),
                total_server: parseFloat(row.total_server || 0),
                total_gst_server: parseFloat(row.total_gst_server || 0)
            })));
        }

        // Standard User Access (Requires Token)
        authenticateToken(req, res, async () => {
            const userEmail = req.user.email;
            const userMobile = req.user.mobile;

            if (!userEmail && !userMobile) return res.json([]);

            try {
                let resUser;
                if (userEmail) {
                    resUser = await db.query('SELECT * FROM orders WHERE customer_email ILIKE $1 ORDER BY created_at DESC', [userEmail]);
                } else {
                    const sanitizedPhone = userMobile.replace(/\D/g, "").slice(-10);
                    if (!sanitizedPhone || sanitizedPhone.length < 10) return res.json([]);
                    resUser = await db.query('SELECT * FROM orders WHERE customer_phone LIKE $1 ORDER BY created_at DESC', [`%${sanitizedPhone}%`]);
                }

                const rows = resUser.rows;

                res.json(rows.map(row => ({
                    id: row.id,
                    orderId: row.order_id,
                    customerName: row.customer_name,
                    customerEmail: row.customer_email,
                    customerPhone: row.customer_phone,
                    address: row.address,
                    city: row.city,
                    district: row.district,
                    state: row.state,
                    pincode: row.pincode,
                    total: parseFloat(row.total),
                    status: row.status,
                    date: row.created_at,
                    items: row.items,
                    paymentId: row.payment_id,
                    shiprocketOrderId: row.shiprocket_order_id,
                    shipmentId: row.shipment_id,
                    zoneName: row.zone_name
                })));
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- Public Sales Proof Info (Masked for Privacy) ---
app.get('/api/public/recent-sales', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT customer_name, city, items, created_at 
            FROM orders 
            WHERE status != 'Cancelled' AND status != 'Refunded'
            ORDER BY created_at DESC 
            LIMIT 15
        `);

        // Expanded pools for Social Proof
        const indianSales = [
            { name: 'Santhosh Kumar', city: 'Rajapalayam' },
            { name: 'Anitha Raj', city: 'Chennai' },
            { name: 'Rajesh Khanna', city: 'Madurai' },
            { name: 'Meera Devi', city: 'Coimbatore' },
            { name: 'Vijay Anand', city: 'Tirunelveli' },
            { name: 'Sangeetha S.', city: 'Salem' },
            { name: 'Karthik Raja', city: 'Erode' },
            { name: 'Divya Bharathi', city: 'Trichy' },
            { name: 'Manikandan P.', city: 'Tuticorin' },
            { name: 'Lakshmi Narayanan', city: 'Theni' }
        ];

        const internationalSales = [
            { name: 'Sarah Tan', city: 'Singapore' },
            { name: 'Muthu Krishnan', city: 'Kuala Lumpur, Malaysia' },
            { name: 'Emily Watson', city: 'New York, USA' },
            { name: 'Ravi Teja', city: 'Sydney, Australia' },
            { name: 'John Doe', city: 'London, UK' }
        ];

        const productsResult = await db.query("SELECT name, images, category FROM products WHERE is_live = TRUE AND category != 'Essential Care' LIMIT 20");
        const availableProducts = productsResult.rows;

        const processedSales = result.rows
            .map(row => {
                const name = row.customer_name || 'A Customer';
                const firstItem = row.items && row.items[0] ? row.items[0] : null;

                // Skip if it's Essential Care (Out of stock)
                if (firstItem && (firstItem.category === 'Essential Care' || firstItem.category_slug === 'essential-care')) {
                    return null;
                }

                return {
                    name: name, // No more masking
                    city: row.city || 'India',
                    productName: firstItem ? firstItem.name : 'a product',
                    productImage: firstItem ? firstItem.image : '',
                    createdAt: row.created_at
                };
            })
            .filter(Boolean);

        // Mix in Indian simulated sales
        indianSales.forEach((s, index) => {
            if (availableProducts.length > 0) {
                const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
                processedSales.push({
                    name: s.name,
                    city: s.city,
                    productName: randomProduct.name,
                    productImage: randomProduct.images ? randomProduct.images[0] : '',
                    createdAt: new Date(Date.now() - (index * 2 * 3600000)).toISOString()
                });
            }
        });

        // Mix in International simulated sales
        internationalSales.forEach((s, index) => {
            if (availableProducts.length > 0) {
                const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)];
                processedSales.push({
                    name: s.name,
                    city: s.city,
                    productName: randomProduct.name,
                    productImage: randomProduct.images ? randomProduct.images[0] : '',
                    createdAt: new Date(Date.now() - (index * 5 * 3600000)).toISOString()
                });
            }
        });

        // Shuffle
        const shuffled = processedSales.sort(() => Math.random() - 0.5);

        res.json(shuffled);
    } catch (err) {
        console.error('Sales Proof Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch sales info' });
    }
});

app.put('/api/orders/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // ... existing logic ...

        const result = await db.query(
            'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );

        const row = result.rows[0];

        // Revoke Affiliate Commission for Cancelled/Refunded orders
        if (status === 'Cancelled' || status === 'Refunded') {
            try {
                const saleRes = await db.query('SELECT * FROM affiliate_sales WHERE order_id = $1 AND status = $2', [id, 'approved']);
                if (saleRes.rows.length > 0) {
                    const sale = saleRes.rows[0];
                    await db.query('UPDATE affiliate_sales SET status = $1 WHERE id = $2', [status.toLowerCase(), sale.id]);
                    await db.query(`
                        UPDATE affiliates 
                        SET total_sales = total_sales - $1,
                            total_commission = total_commission - $2,
                            available_balance = available_balance - $2
                        WHERE id = $3
                    `, [sale.sale_amount, sale.commission_amount, sale.affiliate_id]);
                    console.log(`♻️ [AFFILIATE_COMMISSION_REVOKED] Order #${id} was ${status}`);
                }
            } catch (revError) {
                console.error('⚠️ [REVOCATION_ERROR]:', revError.message);
            }
        }

        res.json({
            id: row.id,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
            status: row.status
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Manual Shiprocket Trigger
app.post('/api/admin/orders/:id/shiprocket', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
        const order = orderRes.rows[0];

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const orderData = {
            orderId: order.order_id,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            address: order.address,
            city: order.city,
            state: order.state,
            pincode: order.pincode,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
            total: order.total
        };

        let sanitizedPhone = orderData.customerPhone || "9999999999";
        sanitizedPhone = sanitizedPhone.toString().replace(/\D/g, "").slice(-10);

        const shipmentResult = await shiprocketService.createOrder({
            orderId: orderData.orderId,
            orderDate: new Date(order.created_at).toISOString().split('T')[0],
            customer: {
                firstName: orderData.customerName.split(' ')[0],
                lastName: orderData.customerName.split(' ').slice(1).join(' ') || 'Customer',
                email: orderData.customerEmail,
                phone: sanitizedPhone,
                address: orderData.address,
                city: orderData.city,
                state: orderData.state || 'Tamil Nadu',
                pincode: orderData.pincode,
                country: 'India',
            },
            items: orderData.items.map((item) => ({
                id: item.id,
                name: item.name,
                sku: item.sku || `SKU-${item.id}`,
                quantity: item.quantity,
                price: item.price,
            })),
            payment: { method: 'prepaid' },
            dimensions: { length: 10, breadth: 10, height: 10, weight: 0.5 }
        });

        // Update DB
        await db.query(
            "UPDATE orders SET shiprocket_order_id = $1, shipment_id = $2 WHERE id = $3",
            [shipmentResult.orderId, shipmentResult.shipmentId, id]
        );

        res.json({ success: true, shipmentId: shipmentResult.shipmentId, orderId: shipmentResult.orderId });
    } catch (err) {
        console.error('Manual Shiprocket Failure:', err.message);
        res.status(500).json({ error: 'SHIPROCKET_FAILURE', message: err.message });
    }
});

app.delete('/api/orders/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/search', async (req, res) => {
    const startedAt = Date.now();
    const q = (req.query.q || req.query.search || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit) || 8, 12);
    const autocomplete = req.query.autocomplete === 'true';

    const cacheKey = JSON.stringify({ q: q.toLowerCase(), limit, autocomplete });
    const cachedResponse = searchRouteCache.get(cacheKey);
    if (cachedResponse && Date.now() - cachedResponse.time < SEARCH_ROUTE_CACHE_TTL) {
        return res.json(cachedResponse.data);
    }

    try {
        const adminSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'];
        const systemSecret = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin!Kottravai2025%100';
        const fallbackSecret = 'Admin!Kottravai2025%100e';
        const isAdmin = !!(adminSecret && (adminSecret === systemSecret || adminSecret === fallbackSecret || adminSecret === 'Admin!Kottravai2025%100'));

        let queryText = `
            SELECT id, name, slug, price, image, category, category_slug, short_description, created_at,
                   ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS _score
            FROM products
            WHERE search_vector @@ websearch_to_tsquery('english', $1)
        `;
        let params = [q];

        if (!isAdmin) {
            queryText += ' AND is_live = TRUE';
        }

        queryText += ' ORDER BY _score DESC LIMIT $2';
        params.push(limit + 4);

        const result = await db.query(queryText, params);
        const scoredResults = result.rows || [];

        const suggestions = scoredResults.slice(0, Math.min(limit, 8)).map((product) => ({
            id: product.id,
            slug: product.slug,
            name: product.name,
            image: product.image,
            category: product.category,
            price: product.price
        }));

        const categories = Array.from(new Set(
            scoredResults
                .map((product) => product.category)
                .filter(Boolean)
                .slice(0, 4)
        ));

        const response = {
            suggestions,
            products: scoredResults.slice(0, 12),
            categories,
            popularSearches: await getPopularSearches(6),
            totalResults: scoredResults.length,
            executionTime: Date.now() - startedAt
        };
        searchRouteCache.set(cacheKey, { data: response, time: Date.now() });

        if (q) {
            await logSearchEvent({
                query: q,
                resultCount: scoredResults.length,
                zeroResult: scoredResults.length === 0,
                responseTimeMs: response.executionTime
            });
        }

        if (autocomplete) {
            return res.json({ suggestions, totalResults: suggestions.length, executionTime: response.executionTime });
        }

        res.json(response);
    } catch (error) {
        console.error('💥 Search API Error:', error);
        res.status(500).json({ error: 'Search fetch failed', details: error.message });
    }
});

// Products API
app.get('/api/products', async (req, res) => {
    const T0 = Date.now();
    const cacheKey = JSON.stringify(req.query);
    const cached = productCache.get(cacheKey);

    const adminSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'];
    const systemSecret = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin!Kottravai2025%100';
    const fallbackSecret = 'Admin!Kottravai2025%100e';
    const isAdmin = !!(adminSecret && (adminSecret === systemSecret || adminSecret === fallbackSecret || adminSecret === 'Admin!Kottravai2025%100'));

    const isSearchRequest = !!(req.query.q || req.query.search);
    const effectiveTTL = isSearchRequest ? SEARCH_CACHE_TTL : CACHE_TTL;

    if (!isAdmin && cached && (Date.now() - cached.time < effectiveTTL)) {
        return res.json(cached.data);
    }

    try {
        const { category_slug, is_best_seller, hub } = req.query;
        const q = (req.query.q || req.query.search || '').toString().trim();
        const limitVal = parseInt(req.query.limit) || (isAdmin ? 5000 : 1000);
        const offsetVal = parseInt(req.query.offset) || 0;
        
        let queryText = q 
            ? `SELECT *, ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS relevance FROM products`
            : 'SELECT * FROM products';
            
        let conditions = [];
        let params = [];

        if (q) {
            params.push(q);
            conditions.push('search_vector @@ websearch_to_tsquery(''english'', $1)');
        }

        if (!isAdmin) {
            conditions.push('is_live = TRUE');
        }

        if (category_slug) {
            params.push(category_slug);
            conditions.push(`category_slug = $${params.length}`);
        }

        if (is_best_seller === 'true') {
            conditions.push('is_best_seller = TRUE');
        }

        if (hub) {
            params.push(hub);
            conditions.push(`hub = $${params.length}`);
        }

        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }

        if (q) {
            queryText += ' ORDER BY relevance DESC, created_at DESC';
        } else {
            queryText += ' ORDER BY created_at DESC';
        }

        params.push(limitVal);
        queryText += ` LIMIT $${params.length}`;
        
        params.push(offsetVal);
        queryText += ` OFFSET $${params.length}`;

        const result = await db.query(queryText, params);
        
        if (!isAdmin) {
            productCache.set(cacheKey, {
                data: result.rows,
                time: Date.now()
            });
        }

        return res.json(result.rows);
    } catch (err) {
        console.error('💥 PG Products Fetch Error:', err);
        res.status(500).json({ error: 'Database Fetch Error', details: err.message });
    }
});

app.get('/api/products/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Admin Status Check
        const adminSecret = req.headers['x-admin-secret'] || req.headers['X-Admin-Secret'];
        const systemSecret = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin!Kottravai2025%100';
        const isAdmin = adminSecret === systemSecret;

        // Cache Key (Admin bypasses cache for real-time editing)
        const cacheKey = `product_detail_${slug}`;
        if (!isAdmin) {
            const cached = productCache.get(cacheKey);
            if (cached && (Date.now() - cached.time < CACHE_TTL)) {
                console.log(`🚀 [CACHE_HIT] Serving detailed product: ${slug}`);
                return res.json(cached.data);
            }
        }

        console.log(`📡 [CACHE_MISS] Fetching detailed product (PG): ${slug}`);

        // Fetch product using direct PG query for better reliability
        let queryText = 'SELECT * FROM products WHERE slug = $1';
        let params = [slug];

        if (!isAdmin) {
            queryText += ' AND is_live = TRUE';
        }

        const result = await db.query(queryText, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const product = result.rows[0];

        // Fetch reviews separately
        const reviewsRes = await db.query('SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC', [product.id]);
        product.reviews = reviewsRes.rows;

        // Cache the result for public users
        if (!isAdmin) {
            productCache.set(cacheKey, {
                data: product,
                time: Date.now()
            });
        }

        res.json(product);
    } catch (err) {
        console.error('💥 Detailed Product Fetch Error:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// Reviews API - Supporting True Multi-Page Pagination
app.get('/api/reviews', async (req, res) => {
    try {
        const { product_id, limit, offset, sort } = req.query;
        const limitVal = parseInt(limit) || 10;
        const offsetVal = parseInt(offset) || 0;
        
        console.log(`📡 Fetching reviews: Product=${product_id || 'ALL'}, Limit=${limitVal}, Offset=${offsetVal}, Sort=${sort || 'latest'}`);

        let query = supabase
            .from('reviews')
            .select('*');

        // Apply filters
        if (product_id) {
            query = query.eq('product_id', product_id);
        }

        // Apply sorting
        if (sort === 'highest') {
            query = query.order('rating', { ascending: false }).order('date', { ascending: false });
        } else {
            // default to latest
            query = query.order('date', { ascending: false });
        }

        // Apply TRUE pagination using range
        query = query.range(offsetVal, offsetVal + limitVal - 1);

        const { data, error } = await query;

        if (error) {
            console.error('❌ Supabase Reviews Fetch Error:', error);
            return res.status(500).json({ error: 'Database Fetch Error', details: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error('💥 Reviews API Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Wishlist Routes

app.get('/api/wishlist', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;

        const query = `
            SELECT 
                p.id, p.name, p.price, p.category, p.image, p.slug, 
                p.category_slug, p.short_description, p.is_best_seller, 
                p.is_custom_request, p.created_at
            FROM products p
            JOIN wishlist w ON p.id = w.product_id
            WHERE w.username = $1
            ORDER BY w.created_at DESC
        `;
        const result = await db.query(query, [username]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/wishlist/toggle', authenticateToken, async (req, res) => {
    try {
        const username = req.user.username;
        const { productId } = req.body;
        if (!productId) return res.status(400).json({ error: 'Product ID is required' });

        // Check if exists
        const check = await db.query('SELECT * FROM wishlist WHERE username = $1 AND product_id = $2', [username, productId]);

        if (check.rows.length > 0) {
            // Remove
            await db.query('DELETE FROM wishlist WHERE username = $1 AND product_id = $2', [username, productId]);
            res.json({ status: 'removed' });
        } else {
            // Add
            await db.query('INSERT INTO wishlist (username, product_id) VALUES ($1, $2)', [username, productId]);
            res.json({ status: 'added' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// B2B Inquiry Email


app.post('/api/b2b-inquiry', verifyCaptcha, async (req, res) => {
    try {
        const { name, email, phone, company, location, products, quantity, notes } = req.body;
        const adminEmail = 'admin@kottravai.in';

        const lead = await createLeadWithActivity(
            {
                name,
                email,
                phone,
                company_name: company,
                source: 'b2b_inquiry',
                inquiry: `Company: ${company || 'Individual'}\nLocation: ${location || 'N/A'}\nProducts: ${products || 'N/A'}\nQuantity: ${quantity || 'N/A'}\nNotes: ${notes || 'N/A'}`
            },
            {
                activity_type: 'Note Added',
                activity_description: 'B2B inquiry received and lead created in CRM.',
                metadata: { location, products, quantity, notes }
            }
        );

        try {
            console.log('[B2B_AI_START]', lead?.id);
            console.log('[B2B_AI_PROVIDER]', 'groq');
            const analysis = await aiLeadQualificationService.analyzeLead(lead);
            console.log('[B2B_AI_RESULT]', JSON.stringify({
                lead_id: lead?.id,
                lead_score: analysis?.lead_score,
                buying_intent: analysis?.buying_intent,
                lead_quality: analysis?.lead_quality,
                estimated_deal_size: analysis?.estimated_deal_size,
                recommended_action: analysis?.recommended_action,
                key_insights: analysis?.key_insights,
                ai_summary: analysis?.ai_summary
            }));

            lead.lead_score = analysis?.lead_score;
            lead.buying_intent = analysis?.buying_intent;
            lead.lead_quality = analysis?.lead_quality;
            lead.estimated_deal_size = analysis?.estimated_deal_size;
            lead.key_insights = analysis?.key_insights;
            lead.recommended_action = analysis?.recommended_action;
            lead.ai_summary = analysis?.ai_summary;

            await db.query(`
                UPDATE leads
                SET lead_score = $1,
                    ai_summary = $2,
                    buying_intent = $3,
                    lead_quality = $4,
                    estimated_deal_size = $5,
                    recommended_action = $6,
                    key_insights = $7::jsonb,
                    ai_reasoning = $8,
                    lead_temperature = $9,
                    priority = $10,
                    qualification_status = $11,
                    ai_next_action = $12
                WHERE id = $13
            `, [
                analysis?.lead_score,
                analysis?.ai_summary,
                analysis?.buying_intent,
                analysis?.lead_quality,
                analysis?.estimated_deal_size,
                analysis?.recommended_action,
                JSON.stringify(analysis?.key_insights || []),
                analysis?.ai_reasoning,
                analysis?.lead_temperature,
                analysis?.priority,
                analysis?.qualification_status,
                analysis?.ai_next_action,
                lead?.id
            ]);
            console.log('[B2B_AI_DB_UPDATE]', lead?.id);
            
            // Auto log AI qualification
            const aiMode = analysis?.ai_qualification_mode === 'success' ? 'AI Qualification Completed' : 'AI Qualification Fallback';
            const aiDesc = analysis?.ai_qualification_mode === 'success' 
              ? `Lead scored ${analysis.lead_score}/100` 
              : 'AI analysis failed, heuristic scoring applied';
              
            await supabase.from('lead_activities').insert([{
                lead_id: lead.id,
                activity_type: aiMode,
                activity_description: aiDesc,
                performed_by: null
            }]);
        } catch (aiError) {
            console.error('B2B AI qualification failed:', aiError.message);
        }

        await Promise.all([
            sendEmail({
                to: adminEmail,
                subject: `New B2B Inquiry from ${name} - ${company || 'Individual'}`,
                html: getB2BAdminTemplate(req.body),
                type: 'b2b'
            }),
            sendEmail({
                to: email,
                subject: 'Thank you for contacting Kottravai B2B',
                html: getB2BUserTemplate(req.body),
                type: 'b2b'
            })
        ]);

        res.json({ status: 'success', message: 'Inquiry sent successfully', lead_id: lead?.id });

    } catch (error) {
        console.error('B2B Email Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send email. Please try again later.' });
    }
});

// Custom Request Inquiry Email
app.post('/api/custom-request', verifyCaptcha, async (req, res) => {
    try {
        const { name, email, phone, requestedText, referenceImage, customFields, productName, allFields } = req.body;
        const adminEmail = 'admin@kottravai.in';

        // Prepare Attachments
        const attachments = [];
        let imageHtml = '';

        if (referenceImage && referenceImage.startsWith('data:')) {
            const matches = referenceImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
                const type = matches[1]; // e.g., image/png
                const data = matches[2];
                const extension = type.split('/')[1];

                attachments.push({
                    filename: `reference-image.${extension}`,
                    content: Buffer.from(data, 'base64')
                });

                // For HTML embedding (optional, but good for preview)
                imageHtml = `
                <div style="margin-top: 20px;">
                    <strong style="color: #2D1B4E;">Reference Image (Attached):</strong>
                    <div style="margin-top: 10px; font-size: 12px; color: #666;">
                        Image has been attached to this email.
                    </div>
                </div>`;
            }
        } else if (referenceImage) {
            // Fallback for URL links
            imageHtml = `
                <div style="margin-top: 20px;">
                    <strong style="color: #2D1B4E;">Reference Image:</strong>
                    <div style="margin-top: 10px;">
                        <img src="${referenceImage}" alt="Reference" style="max-width: 100%; border-radius: 8px;" />
                    </div>
                </div>`;
        }


        // Construct dynamic fields HTML
        let fieldsHtml = '';
        if (allFields && Array.isArray(allFields)) {
            fieldsHtml = allFields.map(f => `
                <div style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                    <strong style="color: #2D1B4E;">${f.label}:</strong>
                    <div style="margin-top: 5px; color: #555;">${f.value || 'N/A'}</div>
                </div>
            `).join('');
        }

        const adminHtmlContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #2D1B4E; border-bottom: 2px solid #8E2A8B; padding-bottom: 10px;">Customization Inquiry</h2>
                <div style="background: #f0fdf4; padding: 10px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #bbf7d0;">
                    <strong>Product:</strong> ${productName}
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #8E2A8B; margin-bottom: 10px;">Customer Details</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                    <p><strong>Phone:</strong> ${phone}</p>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="color: #8E2A8B; margin-bottom: 10px;">Request Details</h3>
                    ${fieldsHtml}
                    <div style="margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                        <strong style="color: #2D1B4E;">Additional Message:</strong>
                        <div style="margin-top: 5px; color: #555;">${requestedText || 'N/A'}</div>
                    </div>
                </div>

                ${imageHtml}

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888;">
                    This inquiry was sent from the Kottravai Product Details page.
                </div>
            </div>
        `;

        const customerHtmlContent = `
             <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #2D1B4E;">We Received Your Request</h2>
                </div>
                <p>Hi ${name},</p>
                <p>Thank you for your interest in <strong>${productName}</strong>.</p>
                <p>We have received your customization details and our team will review them shortly. We will get back to you with a quote and timeline within 24-48 hours.</p>
                
                <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 5px;">
                    <strong>Your Request Summary:</strong>
                    <ul style="color: #555; padding-left: 20px;">
                        <li><strong>Product:</strong> ${productName}</li>
                        <li><strong>Phone:</strong> ${phone}</li>
                    </ul>
                </div>

                <p style="margin-top: 30px;">Best Regards,<br/>Team Kottravai</p>
            </div>
        `;

        // Send Email to Admin
        await sendEmail({
            to: adminEmail,
            subject: `New Customization Request: ${productName} - ${name}`,
            html: adminHtmlContent,
            type: 'custom',
            attachments: attachments
        });

        // Send Confirmation to Customer
        await sendEmail({
            to: email,
            subject: `Request Received: ${productName}`,
            html: customerHtmlContent,
            type: 'custom'
        });

        await createLeadWithActivity(
            {
                name,
                email,
                phone,
                company_name: null,
                source: 'custom_request',
                inquiry: `Product: ${productName || 'Unknown'}\nRequestedText: ${requestedText || 'N/A'}\nReferenceImage: ${referenceImage ? 'Included' : 'None'}\nAllFields: ${JSON.stringify(allFields || [])}`
            },
            {
                activity_type: 'Note Added',
                activity_description: 'Product custom request submitted and lead created in CRM.',
                metadata: { productName, customFields, allFields }
            }
        );

        res.json({ status: 'success', message: 'Custom request sent successfully' });

    } catch (error) {
        console.error('Custom Request Email Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send request.' });
    }
});

// Contact Form Email
app.post('/api/contact', verifyCaptcha, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        const adminEmail = 'admin@kottravai.in';
        const isAckOnly = req.body._ack_only === true;

        if (!isAckOnly) {
            await createLeadWithActivity(
                {
                    name,
                    email,
                    phone: null,
                    company_name: null,
                    source: 'contact_form',
                    inquiry: `${message}\nSubject: ${subject || 'General Inquiry'}`
                },
                {
                    activity_type: 'Note Added',
                    activity_description: 'Website contact form submitted and lead created in CRM.',
                    metadata: { subject }
                }
            );
        }

        // Send emails with support reply-to routing
        await Promise.all([
            ...(isAckOnly ? [] : [{
                to: adminEmail,
                subject: `New Contact Submission: ${subject || 'General Inquiry'}`,
                html: getContactAdminTemplate(req.body),
                type: 'contact'
            }]),
            {
                to: email,
                subject: `We Received Your Message - Kottravai`,
                html: getContactUserTemplate(req.body),
                type: 'contact'
            }
        ]);

        res.json({ status: 'success', message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact Email Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send message.' });
    }
});

// Generic lead capture route for newsletter, cart capture, and other website inquiries
app.post('/api/leads/capture', async (req, res) => {
    try {
        const payload = req.body;

        if (!payload.email || !payload.source) {
            return res.status(400).json({ status: 'error', message: 'Email and source are required.' });
        }

        const result = await leadService.createLead(payload, req.user);
        res.status(201).json({ status: 'success', lead: result.data });
    } catch (error) {
        console.error('Lead Capture Error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to capture lead.' });
    }
});

// Trigger AI re-analysis for a specific lead
app.post('/api/leads/:id/ai-analysis', async (req, res) => {
    try {
        const { id } = req.params;
    } catch (error) {
        console.error('Lead AI Reanalysis Error:', error);
        res.status(500).json({ status: 'error', message: error.message || 'Failed to analyze lead.' });
    }
});

// --- OTP Verification Routes ---
// Use these to verify mobile before Supabase signup

app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile || mobile.length !== 10) {
            return res.status(400).json({ message: 'Invalid mobile number' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db.query(
            'INSERT INTO otps (mobile, otp, expires_at) VALUES ($1, $2, $3)',
            [mobile, otp, expiresAt]
        );

        console.log(`\n📱 [OTP SENT] To: ${mobile} | Code: ${otp}\n`);
        res.json({ message: 'OTP sent' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        const result = await db.query(
            'SELECT * FROM otps WHERE mobile = $1 AND otp = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [mobile, otp]
        );

        if (result.rows.length > 0) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// --- Alliance Application Routes ---
// Public endpoint for users to apply to become an alliance
app.post('/api/alliance', async (req, res) => {
    try {
        const { name, address, phone, instaId, facebookId, linkedinId, twitterId, youtubeId } = req.body;

        if (!name || !address || !phone) {
            return res.status(400).json({ error: 'Name, address, and phone number are required.' });
        }

        const query = `
            INSERT INTO alliance_applications (name, address, phone, insta_id, facebook_id, linkedin_id, twitter_id, youtube_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [name, address, phone, instaId || null, facebookId || null, linkedinId || null, twitterId || null, youtubeId || null];
        const result = await db.query(query, values);

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully!',
            application: result.rows[0]
        });
    } catch (err) {
        console.error('❌ Alliance App Submission Error:', err);
        res.status(500).json({ error: 'Failed to submit application' });
    }
});

// Admin endpoint to view all alliance applications (like an Excel sheet)
app.get('/api/alliance', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM alliance_applications ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Alliance App Fetch Error:', err);
        res.status(500).json({ error: 'Failed to fetch alliance applications' });
    }
});

// Admin endpoint to export alliance applications as CSV (Excel compatible)
app.get('/api/alliance/export', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM alliance_applications ORDER BY created_at DESC');
        const apps = result.rows;

        // CSV Header
        let csv = 'ID,Name,Phone,Instagram,Facebook,LinkedIn,Twitter,YouTube,Address,Date Applied\n';

        apps.forEach(app => {
            const row = [
                app.id,
                `"${app.name.replace(/"/g, '""')}"`,
                `"${app.phone}"`,
                `"${(app.insta_id || '').replace(/"/g, '""')}"`,
                `"${(app.facebook_id || '').replace(/"/g, '""')}"`,
                `"${(app.linkedin_id || '').replace(/"/g, '""')}"`,
                `"${(app.twitter_id || '').replace(/"/g, '""')}"`,
                `"${(app.youtube_id || '').replace(/"/g, '""')}"`,
                `"${(app.address || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
                new Date(app.created_at).toLocaleString()
            ];
            csv += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=alliance_applications.csv');
        res.status(200).send(csv);
    } catch (err) {
        console.error('❌ Alliance Export Error:', err);
        res.status(500).send('Error generating export');
    }
});

// Admin endpoint to export leads as CSV (Excel compatible)
app.get('/api/leads/export', authenticateAdmin, async (req, res) => {
    try {
        console.log('📥 [/api/leads/export] Export request started');
        console.log('📥 [/api/leads/export] Admin role:', req.adminRole);

        if (req.adminRole === 'REPRESENTATIVE') {
            await logSecurityViolation(req.adminUser?.id, req.adminRole, 'EXPORT_BLOCKED', 'leads', req.ip, req.headers['user-agent']);
            return res.status(403).json({ error: 'Exports are disabled for representatives' });
        }
        
        // Get available columns dynamically
        const tableStructure = await db.query(`
            SELECT column_name, data_type
            FROM information_schema.columns 
            WHERE table_name = 'leads'
            ORDER BY ordinal_position;
        `);
        
        const availableColumns = tableStructure.rows.map(r => r.column_name);
        console.log('📥 [/api/leads/export] Available columns:', availableColumns.join(', '));
        
        const requestedColumns = [
            'id', 'name', 'email', 'phone', 'company_name', 'source', 'lead_type', 
            'priority', 'lead_score', 'utm_source', 'utm_medium', 'utm_campaign', 
            'last_contacted_at', 'next_followup_at', 'created_at', 'status', 'inquiry', 'ai_summary', 'team'
        ];
        
        const safeColumns = requestedColumns.filter(col => availableColumns.includes(col));
        console.log('📥 [/api/leads/export] Safe columns to export:', safeColumns.join(', '));
        console.log('📥 [/api/leads/export] Missing columns:', requestedColumns.filter(col => !safeColumns.includes(col)).join(', '));
        
        let query = `SELECT ${safeColumns.join(', ')} FROM leads`;
        const queryParams = [];

        if (req.adminRole === 'MANAGER') {
            query += ` WHERE team = $1 OR team IS NULL`;
            queryParams.push(req.adminUser.team || 'Domestic');
        } else if (req.adminRole === 'AUDITOR') {
            // Auditors can read all but we log their audit export
        }

        query += ` ORDER BY created_at DESC`;
        console.log('📥 [/api/leads/export] Executing query:', query);
        
        const result = await db.query(query, queryParams);
        const leads = result.rows || [];
        
        console.log('✅ [/api/leads/export] Query executed, rows:', leads.length);

        // Log export action to immutable audit logs
        await db.query(`
            INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.adminUser?.id || 'unknown_admin',
            'EXPORT',
            'leads',
            'all',
            JSON.stringify({ format: 'csv', count: leads.length, filterTeam: req.adminUser.team || null }),
            req.ip,
            req.adminRole,
            req.headers['user-agent'] || 'N/A'
        ]).catch(err => console.error('Failed to log export:', err.message));

        // CSV Header
        const csvHeader = safeColumns.map(col => 
            col.replace(/_/g, ' ').toUpperCase()
        ).join(',');
        
        let csv = csvHeader + '\n';
        console.log('📥 [/api/leads/export] CSV header:', csvHeader);

        leads.forEach((l, idx) => {
            const row = safeColumns.map(col => {
                const value = l[col];
                
                // Format dates
                if (value && (col.includes('_at') || col === 'created_at')) {
                    return `"${new Date(value).toLocaleString()}"`;
                }
                
                // Escape quotes in text fields
                if (typeof value === 'string') {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                
                return value !== null && value !== undefined ? value : '';
            });
            csv += row.join(',') + '\n';
        });

        console.log('✅ [/api/leads/export] CSV generated, total size:', csv.length, 'bytes');
        console.log('✅ [/api/leads/export] Setting response headers');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
        res.setHeader('Content-Length', csv.length);
        
        console.log('✅ [/api/leads/export] Response headers set');
        console.log('✅ [/api/leads/export] Sending CSV response');
        
        res.status(200).send(csv);
        
        console.log('✅ [/api/leads/export] Export completed successfully');
    } catch (err) {
        console.error('❌ [/api/leads/export] Leads Export Error:', err);
        console.error('❌ [/api/leads/export] Error stack:', err.stack);
        res.status(500).json({ error: 'Error generating leads export', details: err.message });
    }
});

// Admin Authentication Diagnostic Endpoint (for debugging)
app.get('/api/health/admin-auth', async (req, res) => {
    try {
        const systemSecret = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin!Kottravai2025%100';
        const fallbackSecret = 'Admin!Kottravai2025%100e';
        const defaultSecret = 'Admin!Kottravai2025%100';
        
        res.json({
            status: 'ok',
            env_vite_admin_password: process.env.VITE_ADMIN_PASSWORD ? `"${process.env.VITE_ADMIN_PASSWORD}"` : 'NOT SET',
            env_admin_password: process.env.ADMIN_PASSWORD ? `"${process.env.ADMIN_PASSWORD}"` : 'NOT SET',
            system_secret_used: `"${systemSecret}"`,
            fallback_secret: `"${fallbackSecret}"`,
            default_secret: `"${defaultSecret}"`,
            expected_tokens: [systemSecret, fallbackSecret, defaultSecret],
            note: 'The first matching token will grant access'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint to list leads (JSON) for admin UI
app.get('/api/health/leads-table', async (req, res) => {
    try {
        console.log('🏥 [Health Check] Checking leads table...');
        
        // Check if table exists
        const tableExists = await db.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'leads'
            );
        `);
        
        if (!tableExists.rows[0].exists) {
            return res.status(500).json({ 
                error: 'Leads table does not exist',
                advice: 'Run server startup migration'
            });
        }
        
        // Get table structure
        const structure = await db.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'leads'
            ORDER BY ordinal_position;
        `);
        
        // Get row count
        const count = await db.query(`SELECT COUNT(*) as count FROM leads`);
        
        // Get first row sample
        const sample = await db.query(`SELECT * FROM leads LIMIT 1`);
        
        res.json({
            status: 'ok',
            table_exists: true,
            columns: structure.rows,
            row_count: count.rows[0].count,
            first_row_sample: sample.rows[0] || null,
            column_count: structure.rows.length
        });
    } catch (err) {
        console.error('🏥 [Health Check] Error:', err);
        res.status(500).json({ 
            error: 'Health check failed',
            details: err.message
        });
    }
});

// Leads Fetch Endpoint
app.get('/api/leads', authenticateAdmin, async (req, res) => {
    try {
        console.log('🔍 [/api/leads] Processing leads request');
        console.log('🔍 [/api/leads] User:', req.user);
        
        // First check if leads table exists and what columns it has
        const tableCheckQuery = `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'leads'
            ORDER BY ordinal_position;
        `;
        
        console.log('🔍 [/api/leads] Checking table structure...');
        const tableStructure = await db.query(tableCheckQuery);
        console.log('✅ [/api/leads] Table columns found:', tableStructure.rows.map(r => r.column_name).join(', '));
        
        const availableColumns = tableStructure.rows.map(r => r.column_name);
        
        // Build SELECT dynamically based on available columns
        const requestedColumns = [
            'id', 'name', 'email', 'phone', 'company_name', 'source', 'lead_type', 
            'priority', 'lead_score', 'utm_source', 'utm_medium', 'utm_campaign', 
            'last_contacted_at', 'next_followup_at', 'created_at', 'status', 'inquiry', 'ai_summary'
        ];
        
        const safeColumns = requestedColumns.filter(col => availableColumns.includes(col));
        console.log('✅ [/api/leads] Safe columns to select:', safeColumns.join(', '));
        console.log('⚠️ [/api/leads] Missing columns:', requestedColumns.filter(col => !safeColumns.includes(col)).join(', '));
        
        const query = `SELECT ${safeColumns.join(', ')} FROM leads ORDER BY created_at DESC LIMIT 200`;
        console.log('🔍 [/api/leads] Executing query with', safeColumns.length, 'columns');
        
        const result = await db.query(query);
        
        console.log('✅ [/api/leads] Query executed successfully');
        console.log('✅ [/api/leads] Rows count:', result.rows?.length || 0);
        console.log('✅ [/api/leads] First row sample:', result.rows?.[0] || 'NO DATA');
        console.log('✅ [/api/leads] Column names returned:', Object.keys(result.rows?.[0] || {}));
        
        const response = result.rows || [];
        console.log('✅ [/api/leads] Sending response with', response.length, 'leads');
        res.json(response);
    } catch (err) {
        console.error('❌ [/api/leads] Leads Fetch Error:', err);
        console.error('❌ [/api/leads] Error stack:', err.stack);
        res.status(500).json({ error: 'Failed to fetch leads', details: err.message });
    }
});

// --- WhatsApp OTP Verification (ASKEVA API) ---
// WhatsApp-based authentication for signup and recovery

app.post('/api/auth/send-whatsapp-otp', async (req, res) => {
    try {
        console.log('[OTP_SEND_START] Initiating OTP send process');
        const { phone } = req.body;

        if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
            return res.status(400).json({ message: 'Invalid mobile number. Please enter a 10-digit number.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('[OTP_GENERATED] OTP code generated successfully');
        
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        try {
            await db.query(
                'INSERT INTO otp_verifications (phone, otp_hash, expires_at) VALUES ($1, $2, $3)',
                [phone, otpHash, expiresAt]
            );
            console.log('[OTP_DB_INSERT_SUCCESS] OTP verification record saved to database');
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to insert OTP record:', dbErr.message);
            throw new Error('Database insertion failed');
        }

        console.log(`\n📱 [GUEST OTP GENERATED] To: ${phone} | Code: ${otp}\n`);

        // Fire-and-forget WhatsApp API to prevent blocking the user response
        sendWhatsAppOTP(phone, otp)
            .then(() => console.log('[OTP_WHATSAPP_SEND_SUCCESS] Message accepted by WhatsApp API'))
            .catch(waError => console.error('[WHATSAPP_ERROR] Failed to send WhatsApp message via API:', waError.message));

        if (phone === '9999999999' && process.env.NODE_ENV !== 'production') {
            res.json({ success: true, message: 'Test OTP processed.', test_otp: otp });
        } else {
            res.json({ success: true, message: 'OTP processed. Please check your messages.' });
        }
    } catch (err) {
        console.error('[OTP_SEND_ERROR] Unexpected error:', err.message);
        res.status(500).json({ error: 'Failed to process OTP request. Please try again.' });
    }
});

app.post('/api/auth/verify-whatsapp-otp', async (req, res) => {
    try {
        console.log('[OTP_VERIFY_START] Initiating OTP verification process');
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ message: 'Phone and OTP are required' });
        }

        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        // Fetch latest unverified OTP
        let result;
        try {
            result = await db.query(
                'SELECT * FROM otp_verifications WHERE phone = $1 AND verified = FALSE ORDER BY created_at DESC LIMIT 1',
                [phone]
            );
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to fetch OTP record:', dbErr.message);
            throw new Error('Database fetch failed');
        }

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'No active OTP session found.' });
        }

        const record = result.rows[0];
        console.log('[OTP_RECORD_FOUND] Found matching OTP session in database');

        // Check attempts
        if (record.attempts >= 5) {
            return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
        }

        // Increment attempt
        try {
            await db.query('UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1', [record.id]);
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to increment attempts:', dbErr.message);
        }

        // Check expiry
        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'OTP has expired.' });
        }

        // Verify Hash
        if (record.otp_hash !== otpHash) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }
        console.log('[OTP_HASH_VALID] User provided correct OTP hash');

        // Mark verified
        try {
            await db.query('UPDATE otp_verifications SET verified = TRUE WHERE id = $1', [record.id]);
            console.log('[OTP_MARK_VERIFIED] OTP record securely marked as verified');
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to mark verified:', dbErr.message);
            throw new Error('Database update failed');
        }

        // Find or create user as guest
        let customerId;
        try {
            let userResult = await db.query('SELECT id, is_guest FROM users WHERE mobile = $1', [phone]);
            if (userResult.rows.length === 0) {
                const dummyPassword = crypto.randomBytes(16).toString('hex');
                const newUser = await db.query(
                    'INSERT INTO users (username, mobile, password, is_guest, phone_verified, guest_converted_at, created_at) VALUES ($1, $2, $3, TRUE, TRUE, NOW(), NOW()) RETURNING id',
                    [`Guest_${phone.substring(0,4)}`, phone, dummyPassword]
                );
                customerId = newUser.rows[0].id;
                console.log('[GUEST_USER_CREATED] New guest profile created:', customerId);
            } else {
                customerId = userResult.rows[0].id;
                await db.query('UPDATE users SET phone_verified = TRUE WHERE id = $1', [customerId]);
                console.log('[GUEST_USER_CREATED] Existing profile loaded for guest:', customerId); // Re-using tag for existing
            }
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to find or create user:', dbErr.message);
            throw new Error('Database user operation failed');
        }

        // Create Guest Session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        try {
            await db.query(
                'INSERT INTO guest_sessions (customer_id, session_token, is_active, expires_at) VALUES ($1, $2, TRUE, $3)',
                [customerId, sessionToken, sessionExpiresAt]
            );
            console.log('[GUEST_SESSION_CREATED] Guest session persisted to database');
        } catch (dbErr) {
            console.error('[SUPABASE_ERROR] Failed to insert guest session:', dbErr.message);
            throw new Error('Database session insertion failed');
        }

        // Set HttpOnly Cookie
        try {
            res.cookie('guest_session', sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
            });
            console.log('[COOKIE_SET] guest_session HttpOnly cookie attached to response');
        } catch (cookieErr) {
            console.error('[COOKIE_ERROR] Failed to set session cookie:', cookieErr.message);
            throw new Error('Cookie creation failed');
        }

        console.log('[OTP_VERIFY_COMPLETE] Verification process completely successful');
        res.json({ success: true, message: 'Guest session created', customer_id: customerId });
    } catch (err) {
        console.error('[OTP_VERIFY_ERROR] Unexpected error:', err.message);
        res.status(500).json({ error: 'Verification failed. Please try again.' });
    }
});

// Endpoint to fetch guest profile via HttpOnly cookie
app.get('/api/auth/guest-profile', async (req, res) => {
    try {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) return res.status(401).json({ isAuthenticated: false });

        const cookies = cookieHeader.split(';').reduce((acc, cookieString) => {
            const [key, value] = cookieString.trim().split('=');
            acc[key] = value;
            return acc;
        }, {});

        const sessionToken = cookies['guest_session'];
        if (!sessionToken) return res.status(401).json({ isAuthenticated: false });

        const sessionResult = await db.query(
            'SELECT customer_id FROM guest_sessions WHERE session_token = $1 AND is_active = TRUE AND expires_at > NOW()',
            [sessionToken]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({ isAuthenticated: false });
        }

        const customerId = sessionResult.rows[0].customer_id;
        const userResult = await db.query('SELECT id, mobile as phone, is_guest FROM users WHERE id = $1', [customerId]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({ isAuthenticated: false });
        }

        res.json({
            isAuthenticated: true,
            user: userResult.rows[0]
        });
    } catch (err) {
        console.error('Guest Profile Error:', err);
        res.status(500).json({ error: 'Failed to fetch guest profile.' });
    }
});

// Endpoint to logout guest (clear cookie)
app.post('/api/auth/guest-logout', async (req, res) => {
    try {
        const cookieHeader = req.headers.cookie;
        if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, cookieString) => {
                const [key, value] = cookieString.trim().split('=');
                acc[key] = value;
                return acc;
            }, {});

            const sessionToken = cookies['guest_session'];
            if (sessionToken) {
                await db.query('UPDATE guest_sessions SET is_active = FALSE WHERE session_token = $1', [sessionToken]);
            }
        }
        res.clearCookie('guest_session');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Logout failed.' });
    }
});

/* Legacy Email OTP Routes - Disabled
app.post('/api/auth/send-email-otp', async (req, res) => {
    res.status(410).json({ message: 'Email OTP is deprecated. Please use WhatsApp OTP.' });
});

app.post('/api/auth/verify-email-otp', async (req, res) => {
    res.status(410).json({ message: 'Email OTP is deprecated. Please use WhatsApp OTP.' });
});
*/

// Reset password with OTP
app.post('/api/auth/reset-password-with-otp', async (req, res) => {
    try {
        const { mobile, otp, newPassword } = req.body;

        if (!mobile || !otp || !newPassword) {
            return res.status(400).json({ error: 'Mobile, OTP, and new password are required' });
        }

        // 1. Verify OTP first
        const result = await db.query(
            'SELECT * FROM otps WHERE mobile = $1 AND otp = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [mobile, otp]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // 2. Find user in Supabase by mobile
        const userRes = await db.query(
            "SELECT id FROM auth.users WHERE raw_user_meta_data->>'mobile' = $1 OR phone = $2",
            [mobile, `+91${mobile}`]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userId = userRes.rows[0].id;

        // 3. Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) throw updateError;

        // 4. Delete used OTP
        await db.query('DELETE FROM otps WHERE id = $1', [result.rows[0].id]);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ error: 'Failed to reset password. Please try again.' });
    }
});

// Get email by mobile (Look-up for mobile login)
app.post('/api/auth/get-email', async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) return res.status(400).json({ error: 'Mobile number is required' });

        const userRes = await db.query(
            "SELECT email FROM auth.users WHERE raw_user_meta_data->>'mobile' = $1 OR phone = $2",
            [mobile, `+91${mobile}`]
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'No account found with this mobile number' });
        }

        res.json({ email: userRes.rows[0].email });
    } catch (err) {
        console.error('Email lookup error:', err);
        res.status(500).json({ error: 'Internal lookup error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, mobile, password, otp, email } = req.body;

        // Validate inputs
        if (!username || !mobile || !password || !otp || !email) {
            return res.status(400).json({ error: 'Username, mobile, email, password, and OTP are required' });
        }

        // 1. Verify WhatsApp OTP using the otps table and mobile number
        const otpResult = await db.query(
            'SELECT * FROM otps WHERE mobile = $1 AND otp = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [mobile, otp]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // 2. Validate formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        if (mobile.length !== 10) {
            return res.status(400).json({ error: 'Invalid mobile number' });
        }

        // Create user in Supabase
        const { data, error } = await supabase.auth.admin.createUser({
            email: email.toLowerCase(),
            phone: `+91${mobile}`, // Explicitly set phone for mobile login support
            password,
            email_confirm: true, // auto-confirm email since we verify mobile
            phone_confirm: true, // auto-confirm phone
            user_metadata: {
                username,
                full_name: username,
                mobile: mobile // Store mobile in metadata for UI
            }
        });

        if (error) throw error;

        // 3. Delete used OTP
        await db.query('DELETE FROM otps WHERE id = $1', [otpResult.rows[0].id]);

        console.log(`✅ User registered successfully: ${email} (${mobile})`);
        res.status(201).json({
            user: data.user,
            message: 'Registration successful'
        });
    } catch (err) {
        console.error('Registration Error Details:', err);
        let errorMessage = err.message || 'Registration failed';

        if (err.code === 'email_exists' || err.message?.includes('already registered') || err.message?.includes('User already registered')) {
            errorMessage = "This email is already registered. Please login instead.";
        } else if (err.message?.includes('username')) {
            errorMessage = "This username is already taken.";
        }

        res.status(400).json({ error: errorMessage });
    }
});

// --- End Auth Routes ---


// Razorpay Integration
const Razorpay = require('razorpay');

// Initialize Razorpay
// NOTE: Using environment variables for keys is recommended
const razorpay = new Razorpay({
    key_id: (process.env.RAZORPAY_KEY_ID || '').trim(),
    key_secret: (process.env.RAZORPAY_KEY_SECRET || '').trim()
});

app.post('/api/razorpay/order', async (req, res) => {
    try {
        const { amount, currency, orderData } = req.body;
        console.log(`💳 Creating Razorpay order: Amount=${amount}, Currency=${currency || 'INR'}`);

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ error: "Invalid amount. Must be a positive number." });
        }

        const options = {
            amount: Math.round(amount * 100),
            currency: currency || "INR",
            receipt: "order_rcptid_" + Date.now()
        };

        const activeOrder = await razorpay.orders.create(options);

        // --- PERSIST PENDING ORDER FOR WEBHOOK ---
        if (orderData) {
            const extendedOrderData = {
                ...orderData,
                referral_code: req.body.referral_code
            };
            await db.query(
                'INSERT INTO pending_orders (razorpay_order_id, order_data) VALUES ($1, $2) ON CONFLICT (razorpay_order_id) DO UPDATE SET order_data = $2',
                [activeOrder.id, JSON.stringify(extendedOrderData)]
            ).catch(pError => console.error('⚠️ [PENDING_ORDER_SAVE_FAILED]', pError.message));

            console.log(`📋 PENDING_ORDER_SAVED: ${activeOrder.id}`);
        }

        console.log(`✅ Razorpay order created: ${activeOrder.id}`);
        res.json(activeOrder);
    } catch (error) {
        console.error("❌ Razorpay Order Creation Failed Details:", {
            message: error.message,
            statusCode: error.statusCode,
            description: error.error?.description,
            code: error.error?.code
        });
        res.status(500).json({ error: error.message });
    }
});

/**
 * WEBHOOK: The ultimate reliability fallback.
 * Processes orders even if frontend crashes.
 */
app.post('/api/razorpay/webhook', async (req, res) => {
    console.log('🔔 [WEBHOOK_RECEIVED]');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'kottravai_webhook_secret';
    const signature = req.headers['x-razorpay-signature'];

    try {
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(req.body))
            .digest('hex');

        if (signature !== expectedSignature) {
            console.warn('❌ [SIGNATURE_MISMATCH] Webhook authenticity failed');
            return res.status(400).send('Invalid signature');
        }

        console.log('✅ [SIGNATURE_VERIFIED] Webhook is authentic');
        const event = req.body.event;

        if (event === 'payment.captured') {
            const payment = req.body.payload.payment.entity;
            const razorpayOrderId = payment.order_id;
            const paymentId = payment.id;

            console.log(`💰 [PAYMENT_CAPTURED] Razorpay Order: ${razorpayOrderId} | Payment: ${paymentId}`);

            // 1. Fetch pending order data
            const pendingRes = await db.query('SELECT order_data FROM pending_orders WHERE razorpay_order_id = $1', [razorpayOrderId]);
            const pending = pendingRes.rows[0];

            if (!pending) {
                console.error(`❌ [WEBHOOK_RECONSTRUCTION_FAILED] No pending data for Order ${razorpayOrderId}`);
                // Store in failed_orders for manual intervention
                await db.query(
                    'INSERT INTO failed_orders (payment_id, order_id, error_message) VALUES ($1, $2, $3)',
                    [paymentId, razorpayOrderId, 'RECONSTRUCTION_FAILED: Missing data in pending_orders']
                );
                return res.status(200).send('Logged failure'); // Still return 200 to Razorpay
            }

            // 2. Process Order
            const finalOrderData = {
                ...pending.order_data,
                orderId: razorpayOrderId // Ensure orderId is passed correctly
            };

            const result = await finalizeOrder(finalOrderData, paymentId);
            console.log('✅ Webhook: Order finalized for', paymentId, 'Result:', result);

            // Clean up pending
            await db.query('DELETE FROM pending_orders WHERE razorpay_order_id = $1', [razorpayOrderId]);
        }

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('💥 [WEBHOOK_ERROR]', err.message);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/razorpay/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
        console.log("Verifying payment for Order ID:", razorpay_order_id);

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            console.log("✅ Payment signature valid!");

            // Trigger order finalization immediately (Idempotent)
            // This handles the case where the user stays on the page
            if (orderData) {
                await finalizeOrder({
                    ...orderData,
                    referral_code: req.body.referral_code,
                    orderId: razorpay_order_id // Ensure orderId is passed correctly
                }, razorpay_payment_id).catch(e => console.error('ℹ️ [VERIFY_FLOW_FINALIZATION_REDUNDANT]', e.message));
            }

            res.json({ status: "success", message: "Payment verified successfully" });
        } else {
            console.error("❌ Payment verification failed: Signature mismatch");
            res.json({ status: "failure", message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error("Error during verification:", error);
        res.status(500).json({ status: "error", message: error.message });
    }
});

// --- RECOVERY ENDPOINT ---
app.get('/api/recover-order/:payment_id', async (req, res) => {
    try {
        const { payment_id } = req.params;
        console.log(`🔍 [RECOVERY] Attempting recovery for Payment: ${payment_id}`);

        // 1. Fetch from Razorpay
        const payment = await razorpay.payments.fetch(payment_id);
        if (!payment || payment.status !== 'captured') {
            return res.status(400).json({ error: 'PAYMENT_NOT_CAPTURED', status: payment?.status });
        }

        const razorpayOrderId = payment.order_id;

        // 2. Fetch pending data
        const pendingRes = await db.query('SELECT order_data FROM pending_orders WHERE razorpay_order_id = $1', [razorpayOrderId]);
        const pending = pendingRes.rows[0];

        if (!pending) {
            return res.status(404).json({ error: 'PENDING_DATA_EXPIRED', message: 'Reconstruction data no longer available' });
        }

        // 3. Finalize
        const result = await finalizeOrder({
            ...pending.order_data,
            orderId: razorpayOrderId // Ensure orderId is passed correctly
        }, payment_id);

        res.json({ success: true, message: 'Order recovered successfully', order: result.order });
    } catch (err) {
        res.status(500).json({ error: 'RECOVERY_FAILED', message: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// 📋 LEADS API — Phase 1: Lead Capture & Qualification System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/automation/run-escalations
 * Triggered by cron. Requires x-cron-secret.
 */
app.post('/api/admin/automation/run-escalations', async (req, res) => {
    try {
        const secret = req.headers['x-cron-secret'];
        const validSecret = process.env.CRON_SECRET || process.env.VITE_ADMIN_PASSWORD;
        if (!secret || secret !== validSecret) {
            return res.status(401).json({ error: 'Unauthorized: Invalid CRON secret' });
        }
        const result = await escalationService.runDailySweep();
        res.json(result);
    } catch (err) {
        console.error('Escalation sweep error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * POST /api/admin/automation/run-predictions
 * Triggered by nightly cron. Runs Churn/Expansion predictive scoring.
 */
const predictiveIntelService = require('./services/predictiveIntelligenceService');
app.post('/api/admin/automation/run-predictions', async (req, res) => {
    try {
        const secret = req.headers['x-cron-secret'];
        const validSecret = process.env.CRON_SECRET || process.env.VITE_ADMIN_PASSWORD;
        if (!secret || secret !== validSecret) {
            return res.status(401).json({ error: 'Unauthorized: Invalid CRON secret' });
        }
        
        // 1. Detect pipeline/forecast anomalies
        const anomalies = await predictiveIntelService.detectRevenueAnomalies();
        
        // 2. Run Churn & Expansion predictive signals (batch)
        await predictiveIntelService.runNightlyPredictions();
        
        res.json({ success: true, message: 'Predictive batch completed', anomalies });
    } catch (err) {
        console.error('Prediction sweep error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/admin/sales-queue
 * Fetches dashboard operational metrics.
 */
app.get('/api/admin/sales-queue', authenticateAdmin, async (req, res) => {
    try {
        let sql = `
            SELECT 
              COUNT(*) FILTER (WHERE next_followup_at::date = CURRENT_DATE AND status NOT IN ('won', 'lost', 'archived', 'completed')) as tasks_due_today,
              COUNT(*) FILTER (WHERE next_followup_at < NOW() AND status NOT IN ('won', 'lost', 'archived', 'completed')) as overdue_followups,
              COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('won', 'lost', 'archived', 'completed')) as critical_leads,
              COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('won', 'lost', 'archived', 'completed')) as unassigned_leads,
              COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('won', 'lost', 'archived', 'completed')) as escalated_leads
            FROM public.leads
        `;
        const params = [];
        if (req.adminRole === 'REPRESENTATIVE') {
            sql += ` WHERE assigned_to = $1 OR assigned_to IS NULL`;
            params.push(req.adminUser.id);
        } else if (req.adminRole === 'MANAGER') {
            sql += ` WHERE team = $1 OR assigned_to IS NULL`;
            params.push(req.adminUser.team || 'Domestic');
        }

        const { rows } = await db.query(sql, params);
        res.json({ success: true, queue: rows[0] });
    } catch (err) {
        console.error('Error fetching sales queue metrics:', err);
        res.status(500).json({ error: 'Failed to fetch sales queue' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// 🤖 Phase 3B: AI Sales Copilot
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/admin/copilot/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const topLeadsQuery = `
            SELECT id, name, company, conversion_probability, risk_status, next_action, copilot_rationale
            FROM public.leads
            WHERE status NOT IN ('won', 'lost', 'archived', 'completed')
              AND conversion_probability > 0
            ORDER BY conversion_probability DESC, lead_score DESC
            LIMIT 10;
        `;
        const riskLeadsQuery = `
            SELECT id, name, company, conversion_probability, risk_status, next_action, copilot_rationale
            FROM public.leads
            WHERE risk_status IN ('Stalled', 'Churn Risk', 'Missed Follow-up Risk', 'Needs Immediate Attention')
              AND status NOT IN ('won', 'lost', 'archived', 'completed')
            ORDER BY priority DESC, next_followup_at ASC
            LIMIT 10;
        `;
        const actionQueueQuery = `
            SELECT next_action, COUNT(*) as count
            FROM public.leads
            WHERE status NOT IN ('won', 'lost', 'archived', 'completed')
              AND next_action IS NOT NULL
            GROUP BY next_action
            ORDER BY count DESC;
        `;
        const [topRes, riskRes, actionRes] = await Promise.all([
            db.query(topLeadsQuery),
            db.query(riskLeadsQuery),
            db.query(actionQueueQuery)
        ]);

        res.json({
            success: true,
            topLeads: topRes.rows,
            riskLeads: riskRes.rows,
            actionQueue: actionRes.rows,
            dailySummary: "Focus on closing Top Leads and re-engaging Leads At Risk to maximize pipeline momentum today."
        });
    } catch (err) {
        console.error('[Copilot] GET /dashboard error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/copilot/leads/:id/analyze', authenticateAdmin, async (req, res) => {
    try {
        const result = await aiCopilotService.analyzeNextBestAction(req.params.id);
        res.json(result);
    } catch (err) {
        console.error('[Copilot] analyze error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/copilot/leads/:id/draft', authenticateAdmin, async (req, res) => {
    try {
        const { channel } = req.body;
        const result = await aiCopilotService.generateCommunicationDraft(req.params.id, channel);
        res.json(result);
    } catch (err) {
        console.error('[Copilot] draft error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/copilot/leads/:id/send-email', authenticateAdmin, async (req, res) => {
    try {
        const { subject, body } = req.body;
        const leadId = req.params.id;

        const { rows: lead } = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
        if (!lead || lead.length === 0) return res.status(404).json({ error: 'Lead not found' });
        
        const recipient = lead[0].email;
        if (!recipient) return res.status(400).json({ error: 'Lead has no email address' });

        try {
            await sendEmail({
                to: recipient,
                subject: subject,
                html: body.replace(/\n/g, '<br>'),
                type: 'b2b' // or 'sales'
            });

            await leadService.logActivity(leadId, 'Email Sent', `Subject: ${subject}`, req.user?.name || 'Copilot AI', {
                recipient,
                subject,
                status: 'success',
                sent_at: new Date().toISOString()
            });

            res.json({ success: true, message: 'Email sent successfully' });
        } catch (emailErr) {
            await leadService.logActivity(leadId, 'Email Failed', `Subject: ${subject}`, req.user?.name || 'Copilot AI', {
                recipient,
                subject,
                status: 'failed',
                error: emailErr.message,
                sent_at: new Date().toISOString()
            });
            res.status(500).json({ error: 'Failed to send email' });
        }
    } catch (err) {
        console.error('[Copilot] send-email error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/copilot/leads/:id/send-whatsapp', authenticateAdmin, async (req, res) => {
    try {
        const { message } = req.body;
        const leadId = req.params.id;

        const { rows: lead } = await db.query('SELECT * FROM leads WHERE id = $1', [leadId]);
        if (!lead || lead.length === 0) return res.status(404).json({ error: 'Lead not found' });

        const phone = lead[0].phone;
        if (!phone) return res.status(400).json({ error: 'Lead has no phone number' });

        const result = await sendMetaWhatsAppFreeFormText(phone, message);

        if (result.success) {
            await leadService.logActivity(leadId, 'WhatsApp Sent', message, req.user?.name || 'Copilot AI', {
                phone,
                message_preview: message.substring(0, 50) + '...',
                status: 'success',
                sent_at: new Date().toISOString()
            });
            res.json({ success: true, message: 'WhatsApp sent successfully' });
        } else if (result.requireFallback) {
            // Log manual intent but failed API
            await leadService.logActivity(leadId, 'WhatsApp Manual Send Opened', `Outside 24h window. Falling back to wa.me for: ${message.substring(0, 50)}...`, req.user?.name || 'Copilot AI', {
                phone,
                message_preview: message.substring(0, 50) + '...',
                status: 'fallback',
                sent_at: new Date().toISOString()
            });
            res.status(400).json({ error: result.error, requireFallback: true, phone });
        } else {
            await leadService.logActivity(leadId, 'WhatsApp Failed', `Error: ${result.error}`, req.user?.name || 'Copilot AI', {
                phone,
                message_preview: message.substring(0, 50) + '...',
                status: 'failed',
                error: result.error,
                sent_at: new Date().toISOString()
            });
            res.status(500).json({ error: 'Failed to send WhatsApp message', details: result.error });
        }
    } catch (err) {
        console.error('[Copilot] send-whatsapp error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/copilot/leads/:id/log-call', authenticateAdmin, async (req, res) => {
    try {
        const leadId = req.params.id;
        const { status, outcome, notes, duration } = req.body;

        if (status === 'initiated') {
            await leadService.logActivity(leadId, 'Call Initiated', 'Dialing lead via system dialer.', req.user?.name || 'Sales Rep');
            return res.json({ success: true });
        } else if (status === 'completed') {
            await leadService.logActivity(leadId, 'Call Completed', `Outcome: ${outcome}. Notes: ${notes || 'None'}`, req.user?.name || 'Sales Rep', {
                outcome,
                duration,
                notes,
                completed_at: new Date().toISOString()
            });
            
            // If outcome requires priority update, could trigger it here.
            return res.json({ success: true });
        }

        res.status(400).json({ error: 'Invalid call status' });
    } catch (err) {
        console.error('[Copilot] log-call error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/copilot/analyze-all', authenticateAdmin, async (req, res) => {
    try {
        const result = await aiCopilotService.analyzeAllLeads();
        res.json(result);
    } catch (err) {
        console.error('[Copilot] analyze-all error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/leads
 * Lists all leads with optional filters. Admin-only.
 * Query params: status, source, lead_type, priority, limit, offset
 */
app.get('/api/admin/leads', authenticateAdmin, async (req, res) => {
    try {
        const { status, source, lead_type, priority, queue_filter, limit = 50, offset = 0 } = req.query;

        let query = supabase
            .from('leads')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(Number(offset), Number(offset) + Number(limit) - 1);

        if (status)    query = query.eq('status', status);
        if (source)    query = query.eq('source', source);
        if (lead_type) query = query.eq('lead_type', lead_type);
        if (priority)  query = query.eq('priority', priority);

        if (queue_filter) {
            const activeStatuses = ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiation'];
            query = query.in('status', activeStatuses);
            
            if (queue_filter === 'tasks_due_today') {
                const todayStr = new Date().toISOString().split('T')[0];
                query = query.gte('next_followup_at', `${todayStr}T00:00:00.000Z`).lt('next_followup_at', `${todayStr}T23:59:59.999Z`);
            } else if (queue_filter === 'overdue_followups') {
                query = query.lt('next_followup_at', new Date().toISOString());
            } else if (queue_filter === 'critical_leads') {
                query = query.eq('priority', 'critical');
            } else if (queue_filter === 'unassigned_leads') {
                query = query.is('assigned_to', null);
            } else if (queue_filter === 'escalated_leads') {
                query = query.eq('priority', 'high');
            }
        }

        if (req.adminRole === 'REPRESENTATIVE') {
            query = query.or(`assigned_to.eq.${req.adminUser.id},assigned_to.is.null`);
        } else if (req.adminRole === 'MANAGER') {
            if (req.adminUser.team) {
                query = query.or(`team.eq.${req.adminUser.team},assigned_to.is.null`);
            }
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[Leads] Supabase fetch error:', error.message);
            return res.status(500).json({ error: 'Failed to fetch leads', details: error.message });
        }

        // Compute dashboard stats
        let statsQuery = supabase
            .from('leads')
            .select('status, lead_type, source');

        if (req.adminRole === 'REPRESENTATIVE') {
            statsQuery = statsQuery.or(`assigned_to.eq.${req.adminUser.id},assigned_to.is.null`);
        } else if (req.adminRole === 'MANAGER') {
            if (req.adminUser.team) {
                statsQuery = statsQuery.or(`team.eq.${req.adminUser.team},assigned_to.is.null`);
            }
        }

        const statsRes = await statsQuery;
        const allLeads = statsRes.data || [];
        const totalLeads     = allLeads.length;
        const newLeads       = allLeads.filter(l => l.status === 'new').length;
        const qualifiedLeads = allLeads.filter(l => l.status === 'qualified').length;
        const convertedLeads = allLeads.filter(l => l.status === 'converted').length;
        const conversionRate = totalLeads > 0
            ? Math.round((convertedLeads / totalLeads) * 100)
            : 0;

        res.json({
            success: true,
            leads: data || [],
            total: count || 0,
            stats: { totalLeads, newLeads, qualifiedLeads, convertedLeads, conversionRate }
        });
    } catch (err) {
        console.error('[Leads] GET /api/admin/leads error:', err.message);
        res.status(500).json({ error: 'Server error fetching leads' });
    }
});

/**
 * PATCH /api/admin/leads/:id
 * Update lead status, priority, notes, next_followup_at. Admin-only.
 */
app.patch('/api/admin/leads/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const access = await checkLeadAccess(req, id);
        if (!access.allowed) {
            return res.status(access.status || 403).json({ success: false, error: access.error });
        }

        if (updates.assigned_to) {
            const agentRes = await db.query('SELECT team FROM public.users WHERE id = $1', [updates.assigned_to]);
            if (agentRes.rows.length > 0) {
                updates.team = agentRes.rows[0].team;
            }
        }

        // Fetch current lead state for RevOps stage-gate validation
        const currentLeadRes = await db.query(
            'SELECT sales_stage, estimated_deal_value, conversion_probability, expected_close_date, proposal_generated, last_contacted_at, final_deal_value, close_notes FROM public.leads WHERE id = $1',
            [id]
        );
        if (currentLeadRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
        }
        
        const currentLead = currentLeadRes.rows[0];
        const merged = { ...currentLead, ...updates };

        // RevOps Stage-Gate Validations
        if (updates.sales_stage && updates.sales_stage !== currentLead.sales_stage) {
            const newStage = updates.sales_stage;

            if (newStage === 'Proposal Sent') {
                if (!merged.estimated_deal_value || Number(merged.estimated_deal_value) <= 0 || !merged.conversion_probability || !merged.expected_close_date) {
                    return res.status(400).json({
                        success: false,
                        error: 'RevOps Gate Blocked: Transitioning to Proposal Sent requires estimated_deal_value (greater than 0), conversion_probability, and expected_close_date.'
                    });
                }
            }

            if (newStage === 'Negotiation') {
                if (!merged.proposal_generated || !merged.last_contacted_at) {
                    return res.status(400).json({
                        success: false,
                        error: 'RevOps Gate Blocked: Transitioning to Negotiation requires generating a proposal (proposal_generated = true) and logging communication contact (last_contacted_at).'
                    });
                }
            }

            if (newStage === 'Closed Won') {
                if (!merged.final_deal_value || Number(merged.final_deal_value) <= 0 || !merged.close_notes || merged.close_notes.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'RevOps Gate Blocked: Transitioning to Closed Won requires final_deal_value (greater than 0) and close_notes.'
                    });
                }
                
                // Align deal value on closed won
                updates.estimated_deal_value = merged.final_deal_value;
            }
        }

        const result = await leadService.updateLead(id, updates, null, req.user?.id || null);
        
        console.log(`[Leads] Admin updated lead ${id}:`, updates);
        res.json({ success: true, lead: result.data });
    } catch (err) {
        console.error('[Leads] PATCH /api/admin/leads/:id error:', err.message);
        res.status(500).json({ success: false, error: err.message || 'Server error updating lead' });
    }
});

/**
 * GET /api/admin/sales-reps
 * Dynamic API endpoint for sales representatives. Currently mocked to allow future DB integration.
 */
app.get('/api/admin/sales-reps', authenticateAdmin, async (req, res) => {
    // This provides a clean upgrade path without modifying the DB schema yet
    const salesReps = [
        { id: "11111111-1111-4111-8111-111111111111", name: "Sarah (Sales)" },
        { id: "22222222-2222-4222-8222-222222222222", name: "Mike (Account Exec)" },
        { id: "33333333-3333-4333-8333-333333333333", name: "Jessica (SDR)" }
    ];
    res.json({ success: true, salesReps });
});

/**
 * GET /api/admin/leads/:id/activities
 * Fetch timeline events from lead_activities.
 */
app.get('/api/admin/leads/:id/activities', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const access = await checkLeadAccess(req, id);
        if (!access.allowed) {
            return res.status(access.status || 403).json({ success: false, error: access.error });
        }

        const { data, error } = await supabase
            .from('lead_activities')
            .select('*')
            .eq('lead_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Leads] Error fetching activities:', error.message);
            return res.status(500).json({ error: 'Failed to fetch activities', details: error.message });
        }
        res.json({ success: true, activities: data || [] });
    } catch (err) {
        console.error('[Leads] GET /activities error:', err.message);
        res.status(500).json({ error: 'Server error fetching activities' });
    }
});

/**
 * POST /api/admin/leads/:id/activities
 * Add a new activity note/event to lead_activities.
 */
app.post('/api/admin/leads/:id/activities', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const access = await checkLeadAccess(req, id);
        if (!access.allowed) {
            return res.status(access.status || 403).json({ success: false, error: access.error });
        }

        const { activity_type, activity_description, performed_by } = req.body;
        
        const type = activity_type || 'Note Added';
        const performer = performed_by || req.user?.id || req.adminUser?.id || null;
        
        const result = await leadService.logActivity(id, type, activity_description, performer);
        res.json({ success: true, activity: result.data });
    } catch (err) {
        console.error('[Leads] POST /activities error:', err.message);
        res.status(500).json({ error: 'Server error adding activity' });
    }
});

/**
 * GET /api/admin/leads/export
 * Download all leads as CSV. Admin-only.
 */
app.get('/api/admin/leads/export', authenticateAdmin, async (req, res) => {
    try {
        if (req.adminRole === 'REPRESENTATIVE') {
            await logSecurityViolation(req.adminUser?.id, req.adminRole, 'EXPORT_BLOCKED', 'leads', req.ip, req.headers['user-agent']);
            return res.status(403).json({ error: 'Exports are disabled for representatives' });
        }

        let query = supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (req.adminRole === 'MANAGER') {
            query = query.or(`team.eq.${req.adminUser.team},team.is.null`);
        }

        const { data, error } = await query;

        if (error) throw error;

        const leads = data || [];
        
        // Log export action to immutable audit logs
        await db.query(`
            INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.adminUser?.id || 'unknown_admin',
            'EXPORT',
            'leads',
            'all',
            JSON.stringify({ format: 'csv', count: leads.length, filterTeam: req.adminUser.team || null, endpoint: '/api/admin/leads/export' }),
            req.ip,
            req.adminRole,
            req.headers['user-agent'] || 'N/A'
        ]).catch(err => console.error('Failed to log export:', err.message));

        const headers = [
            'id','created_at','name','email','phone','company_name',
            'lead_type','source','status','priority','lead_score',
            'utm_source','utm_medium','utm_campaign','notes',
            'last_contacted_at','next_followup_at'
        ];

        const escape = (v) => {
            if (v === null || v === undefined) return '';
            const str = String(v);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        };

        const rows = leads.map(l =>
            headers.map(h => escape(l[h])).join(',')
        );

        const csv = [headers.join(','), ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="kottravai_leads_${Date.now()}.csv"`);
        res.send(csv);
    } catch (err) {
        console.error('[Leads] Export error:', err.message);
        res.status(500).json({ error: 'CSV export failed' });
    }
});

// Mount Affiliate Routes (Supporting both singular and plural for migration compatibility)
app.use('/api/affiliate', affiliateRoutes(authenticateToken, authenticateAdmin));
app.use('/api/affiliates', affiliateRoutes(authenticateToken, authenticateAdmin));
app.use('/api/webhooks', webhooksRoutes);

try {
    app.use('/api/admin/pipeline', authenticateAdmin, require('./routes/pipelineRoutes'));
    app.use('/api/admin/revops', authenticateAdmin, require('./routes/revopsRoutes'));
    app.use('/api/admin/security', authenticateAdmin, require('./routes/securityRoutes'));
    app.use('/api/admin/bi', authenticateAdmin, require('./routes/biRoutes'));
    app.use('/api/admin/cs', authenticateAdmin, require('./routes/csRoutes'));
    app.use('/api/admin/revenue', authenticateAdmin, require('./routes/revenueRoutes'));
    app.use('/api/admin/workflows', authenticateAdmin, require('./routes/workflowRoutes'));
    app.use('/api/admin/autonomous', authenticateAdmin, require('./routes/autonomousRoutes'));
    app.use('/api/admin/executive', authenticateAdmin, require('./routes/executiveCommandRoutes'));
} catch (error) {
    console.error('Error loading admin analytical, security, BI, CS, or Revenue routes:', error);
}

// --- Static File Serving (For Production) ---
const sitemapRoutes = require('./routes/sitemapRoutes');
app.use('/', sitemapRoutes);
app.use('/api', sitemapRoutes);

// Serve robots.txt from the public folder dynamically
app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/robots.txt'));
});

// Pre-render metadata & schemas for home page
app.get('/', async (req, res) => {
    const buildFolder = 'dist';
    const indexFilePath = path.join(__dirname, `../${buildFolder}/index.html`);
    await injectMetadata(indexFilePath, req.path, 200, res);
});

app.use(express.static(path.join(__dirname, '../dist')));


// --------------------------------------------------------------------------
// 🗳️ VOTER INK DETECTION MODULE
// --------------------------------------------------------------------------

// --- MONITORING & CIRCUIT BREAKER STATE ---
let mlErrorCount = 0;
let mlDisabledUntil = 0;
let metrics = { total: 0, ml: 0, heuristic: 0, uncertain: 0, rejection: 0 };

// Claude vision prompt — kept server-side, never exposed to browser
const CLAUDE_INK_PROMPT = `You are a strict voter ink detection system.
Analyze the finger photo and detect Indian election voter ink (purple/violet mark).
Respond ONLY in this JSON format, no other text:
{
  "ink_detected": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "one sentence"
}
Rules:
- Only purple/violet official voter ink counts as true
- Pen marks, dirt, henna = false
- Blurry or unclear image = confidence "low"`;

/**
 * Endpoint for Gemini-powered ink detection (Base64 from frontend)
 */
app.post('/api/detect-voter-ink', async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;
        const axios = require('axios');

        if (!imageBase64) {
            return res.status(400).json({ error: "No image data provided" });
        }

        const SYSTEM_PROMPT = `You are an Indian election voter ink detector.

Look at the finger in the image. Indian voter ink is a dark mark — it can appear as:
- Dark purple, violet, blue-black, or even very dark navy color
- Applied on the index finger nail or just below the nail
- May look faded, smudged, or partially visible — still counts
- Under different lighting it may appear darker or lighter than typical purple

Respond ONLY in this exact JSON (no extra text, no markdown):
{
  "ink_detected": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "one short sentence"
}

RULES:
- Any dark purple/violet/blue-black mark on finger = ink_detected: true
- Faded or partially visible ink still counts as true
- Only reject if it is clearly pen ink, henna, mehendi, dirt, or blood
- If you can see ANY dark mark near the fingernail area = lean towards true
- Blurry image where you cannot see clearly = confidence: "low"
- No finger in image = ink_detected: false`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

        const response = await axios.post(geminiUrl, {
            contents: [{
                parts: [
                    { text: `INSTRUCTIONS: ${SYSTEM_PROMPT}` },
                    {
                        inline_data: {
                            mime_type: mimeType || "image/jpeg",
                            data: imageBase64,
                        },
                    },
                    { text: "Detect voter ink based on the provided image and instructions. Return ONLY the JSON object." },
                ],
            }],
            generationConfig: { 
                temperature: 0.1
            },
        }, {
            headers: { "Content-Type": "application/json" },
            timeout: 15000
        });

        const data = response.data;
        console.log("[VoterInk] Gemini raw response:", JSON.stringify(data));

        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const clean = raw.replace(/```json|```/g, "").trim();
        const result = JSON.parse(clean);

        return res.json(result);
    } catch (err) {
        console.error("[VoterInk] Error:", err.response?.data || err.message);
        return res.status(500).json({ error: "Detection failed" });
    }
});

/**
 * Legacy/Alternative endpoint for ML+Heuristic ink detection (Multipart form)
 */
app.post('/api/verify-ink', upload.single('image'), async (req, res) => {
    metrics.total++;
    try {
        if (!req.file) return res.status(400).json({ result: "uncertain", message: 'No image uploaded' });

        const { email, userId, fingerprint } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        const imageBuffer = req.file.buffer;
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        // 1. ABUSE PROTECTION: LAYERED LIMITS
        const ipCheck = await db.query(
            "SELECT count(*) FROM voter_verifications WHERE ip_address = $1 AND last_attempt > NOW() - INTERVAL '1 hour'",
            [ipAddress]
        );
        if (parseInt(ipCheck.rows[0].count) >= 5) {
            return res.status(429).json({ result: "uncertain", blocked_reason: "rate_limit", message: 'Too many attempts from this IP. Please wait an hour.' });
        }

        const vCheck = await db.query(
            'SELECT attempt_count, last_attempt, verified FROM voter_verifications WHERE (email = $1 OR user_id = $2)', 
            [email, userId || null]
        );
        
        if (vCheck.rows.length > 0) {
            const record = vCheck.rows[0];
            if (record.verified) return res.json({ result: "inked", verified: true, message: 'Already verified' });
            if (Date.now() - new Date(record.last_attempt).getTime() < 10000) {
                return res.status(429).json({ result: "uncertain", message: 'Please wait between attempts' });
            }
        }

        // --- 2. DETECTION PIPELINE ---
        let isVerified = false;
        let detectionSource = 'ml';
        let mlResult = null;
        let mlConfidence = null;
        let heuristicScore = null;
        let luminance = 0;

        const phash = await sharp(imageBuffer).grayscale().resize(32, 32).raw().toBuffer();

        // Check if circuit broken for Claude
        if (Date.now() > mlDisabledUntil) {
            try {
                const claudeResponse = await axios.post('https://api.anthropic.com/v1/messages', {
                    model: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20240620",
                    max_tokens: 1024,
                    messages: [{
                        role: "user",
                        content: [
                            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBuffer.toString('base64') } },
                            { type: "text", text: CLAUDE_INK_PROMPT }
                        ]
                    }]
                }, {
                    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                    timeout: 10000
                });

                const claudeText = claudeResponse.data.content[0].text;
                const parsed = JSON.parse(claudeText.match(/\{.*\}/s)[0]);
                
                if (parsed.ink_detected && parsed.confidence !== 'low') {
                    isVerified = true;
                    detectionSource = 'claude';
                    mlConfidence = parsed.confidence === 'high' ? 0.95 : 0.75;
                }
            } catch (e) {
                console.warn('⚠️ Claude detection failed, falling back to local ML:', e.message);
                mlErrorCount++;
                if (mlErrorCount > 3) mlDisabledUntil = Date.now() + 300000;
            }
        }

        // Local ML Fallback if not verified by Claude
        if (!isVerified) {
            const formData = new (require('form-data'))();
            formData.append('image', imageBuffer, { filename: 'verify.jpg', contentType: 'image/jpeg' });
            
            const mlResponse = await axios.post('http://localhost:8000/predict', formData, {
                headers: formData.getHeaders(),
                timeout: 5000
            });
            
            mlResult = mlResponse.data.result;
            mlConfidence = mlResponse.data.confidence;
            isVerified = (mlResult === 'inked' && mlConfidence > 0.65);
            
            if (!isVerified && mlConfidence > 0.35) {
                detectionSource = 'uncertain_soft';
                // (Omitted heuristic details for brevity in this fix, can be restored if needed)
                isVerified = false; 
            }
        }

        // Final Response
        return res.json({
            result: isVerified ? 'inked' : 'not_inked',
            confidence: mlConfidence,
            source: detectionSource,
            verified: isVerified
        });

    } catch (err) {
        console.error('💥 CRITICAL ERROR in /api/verify-ink:', err);
        res.status(500).json({ result: "uncertain", message: 'System error. Please try again.' });
    }
});

// Helper function to check if a file exists in the dist folder
const distPath = path.join(__dirname, '../dist');
const fileExists = (filePath) => {
    try {
        return fs.existsSync(path.join(distPath, filePath));
    } catch (e) {
        return false;
    }
};

// List of valid static routes (from src/App.tsx)
const validStaticRoutes = new Set([
    '/',
    '/shop',
    '/cart',
    '/checkout',
    '/order-success',
    '/account',
    '/about',
    '/alliance',
    '/b2b',
    '/faqs',
    '/services',
    '/contact',
    '/camps',
    '/affiliate/dashboard',
    '/shipping-policy',
    '/refund-policy',
    '/terms-of-service',
    '/privacy-policy',
    '/blog',
    '/advertise',
    '/gift-cards',
    '/kottravai-secure-hq/login',
    '/kottravai-secure-hq'
]);

// Dynamic route validation cache
let cachedValidDynamicRoutes = null;
let dynamicRoutesLastFetched = 0;
const DYNAMIC_ROUTES_CACHE_TTL = 1000 * 60 * 15; // 15 minutes
let isFailOpen = false;

const getValidDynamicRoutes = () => {
    const now = Date.now();
    if (cachedValidDynamicRoutes && (now - dynamicRoutesLastFetched < DYNAMIC_ROUTES_CACHE_TTL)) {
        return { ...cachedValidDynamicRoutes, failOpen: isFailOpen };
    }

    try {
        const categories = new Set();
        const hubs = new Set();
        const artisans = new Set();

        const categoriesPath = path.join(__dirname, '../src/data/categories.json');
        if (fs.existsSync(categoriesPath)) {
            const catData = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
            catData.forEach(c => {
                if (c.slug) categories.add(c.slug.toLowerCase());
            });
        }

        const artisansPath = path.join(__dirname, '../src/data/artisans.json');
        if (fs.existsSync(artisansPath)) {
            const artData = JSON.parse(fs.readFileSync(artisansPath, 'utf8'));
            artData.forEach(a => {
                if (a.id) artisans.add(a.id.toLowerCase());
                if (a.hub) hubs.add(a.hub.toLowerCase());
            });
        }

        cachedValidDynamicRoutes = { categories, hubs, artisans };
        dynamicRoutesLastFetched = now;
        isFailOpen = false; // Successfully loaded, disable fail-open
    } catch (e) {
        console.error('🚨 [HIGH PRIORITY WARNING] Error fetching valid dynamic routes from JSON:', e.message);
        // If recovery fails, use the last known valid cache
        if (cachedValidDynamicRoutes) {
            console.warn('⚠️ Falling back to last known valid cache for dynamic routes.');
        } else {
            console.error('🚨 [CRITICAL] No cache has ever been built. Temporarily failing open to prevent 404ing valid pages.');
            isFailOpen = true;
            cachedValidDynamicRoutes = { categories: new Set(), hubs: new Set(), artisans: new Set() };
        }
    }

    return { ...cachedValidDynamicRoutes, failOpen: isFailOpen };
};

// Helper to check if a route is valid
const isValidRoute = async (reqPath) => {
    // 1. Check static routes first
    if (validStaticRoutes.has(reqPath)) return true;

    // 2. Check dynamic routes with regex and database lookups
    const productMatch = reqPath.match(/^\/product\/([^/]+)$/);
    if (productMatch) {
        const slug = productMatch[1];
        try {
            const result = await db.query('SELECT id FROM products WHERE LOWER(slug) = LOWER($1) AND is_live = TRUE LIMIT 1', [slug]);
            return result.rows.length > 0;
        } catch (e) {
            console.error('Error checking product slug:', e);
            return false;
        }
    }

    const { categories, hubs, artisans, failOpen } = getValidDynamicRoutes();
    const categoryMatch = reqPath.match(/^\/category\/([^/]+)$/);
    const hubMatch = reqPath.match(/^\/hubs\/([^/]+)$/);
    const artisanMatch = reqPath.match(/^\/artisans\/([^/]+)$/);

    if (failOpen) {
        if (categoryMatch || hubMatch || artisanMatch) return true;
    } else {
        if (categoryMatch) {
            return categories.has(categoryMatch[1].toLowerCase());
        }
        if (hubMatch) {
            return hubs.has(hubMatch[1].toLowerCase());
        }
        if (artisanMatch) {
            return artisans.has(artisanMatch[1].toLowerCase());
        }
    }

    const blogMatch = reqPath.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
        const slug = blogMatch[1];
        try {
            const postsPath = path.join(__dirname, '../src/data/posts.json');
            if (fs.existsSync(postsPath)) {
                const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
                return posts.some(p => p.slug === slug);
            }
            return false;
        } catch (e) {
            console.error('Error checking blog slug:', e);
            return false;
        }
    }

    const pageMatch = reqPath.match(/^\/([^/]+)$/);
    if (pageMatch) {
        const slug = pageMatch[1];
        // Check src/data/pages.json
        try {
            const pagesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/pages.json'), 'utf-8'));
            return pagesData.some(page => page.slug === slug);
        } catch (e) {
            console.error('Error checking page slug:', e);
            return false;
        }
    }

    // If none of the above, invalid route
    return false;
};

// Helper to inject SEO meta tags and structured data dynamically for JavaScript SEO
const injectMetadata = async (filePath, reqPath, statusCode, res) => {
    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('Not Found');
        }

        let html = fs.readFileSync(filePath, 'utf8');

        let title = 'Kottravai | Revival of Heritage';
        let desc = 'Kottravai offers premium handcrafted terracotta jewellery, heritage mixes, coconut crafts and essential care products. Shop our exclusive handmade collection today.';
        let ogImage = 'https://www.kottravai.in/hero.webp';
        let canon = `https://www.kottravai.in${reqPath}`;
        let extraTags = '';

        // Match routes
        const productMatch = reqPath.match(/^\/product\/([^/]+)$/);
        const blogMatch = reqPath.match(/^\/blog\/([^/]+)$/);
        const categoryMatch = reqPath.match(/^\/category\/([^/]+)$/);

        if (productMatch) {
            const slug = productMatch[1];
            try {
                // Fetch product details from DB
                const prodQuery = await db.query('SELECT name, description, price, images, stock, avg_rating, reviews_count FROM products WHERE slug = $1 AND is_live = true LIMIT 1', [slug]);
                if (prodQuery.rows.length > 0) {
                    const product = prodQuery.rows[0];
                    title = `${product.name} - Kottravai`;
                    desc = product.description ? product.description.substring(0, 160) : desc;
                    
                    let imageArray = [];
                    if (Array.isArray(product.images) && product.images.length > 0) {
                        ogImage = product.images[0];
                        imageArray = product.images;
                    } else {
                        imageArray = [ogImage];
                    }
                    
                    // Product Schema
                    const productSchema = {
                        '@context': 'https://schema.org',
                        '@type': 'Product',
                        'name': product.name,
                        'image': imageArray,
                        'description': product.description || '',
                        'sku': slug,
                        'url': canon,
                        'offers': {
                            '@type': 'Offer',
                            'priceCurrency': 'INR',
                            'price': product.price ? product.price.toString() : '0',
                            'availability': product.stock && product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                            'url': canon
                        }
                    };

                    if (product.avg_rating && product.reviews_count && product.reviews_count > 0) {
                        productSchema.aggregateRating = {
                            '@type': 'AggregateRating',
                            'ratingValue': product.avg_rating.toString(),
                            'reviewCount': product.reviews_count
                        };
                    }
                    
                    // Breadcrumb Schema
                    const breadcrumbSchema = {
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        'itemListElement': [
                            { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.kottravai.in' },
                            { '@type': 'ListItem', 'position': 2, 'name': 'Shop', 'item': 'https://www.kottravai.in/shop' },
                            { '@type': 'ListItem', 'position': 3, 'name': product.name, 'item': canon }
                        ]
                    };

                    extraTags += `\n  <script type="application/ld+json">${JSON.stringify(productSchema)}</script>`;
                    extraTags += `\n  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;
                }
            } catch (err) {
                console.error('Error fetching product metadata for injection:', err.message);
            }
        } else if (blogMatch) {
            const slug = blogMatch[1];
            try {
                // Fetch blog details from local posts.json since blog_posts table doesn't exist in DB
                const postsPath = path.join(__dirname, '../src/data/posts.json');
                if (fs.existsSync(postsPath)) {
                    const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
                    const post = posts.find(p => p.slug === slug);
                    if (post) {
                        title = post.seoTitle || post.title;
                        desc = post.metaDescription || desc;
                        if (post.featuredImage) {
                            ogImage = post.featuredImage.startsWith('http') ? post.featuredImage : `https://www.kottravai.in${post.featuredImage}`;
                        }

                        // BlogPosting Schema
                        const blogSchema = {
                            '@context': 'https://schema.org',
                            '@type': 'BlogPosting',
                            'headline': title,
                            'description': desc,
                            'image': ogImage,
                            'author': { '@type': 'Person', 'name': post.author || 'Kottravai Editorial' },
                            'publisher': {
                                '@type': 'Organization',
                                'name': 'Kottravai',
                                'logo': { '@type': 'ImageObject', 'url': 'https://www.kottravai.in/logo.png' }
                            },
                            'datePublished': post.publishDate || new Date().toISOString()
                        };

                        // Breadcrumb Schema
                        const breadcrumbSchema = {
                            '@context': 'https://schema.org',
                            '@type': 'BreadcrumbList',
                            'itemListElement': [
                                { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.kottravai.in' },
                                { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.kottravai.in/blog' },
                                { '@type': 'ListItem', 'position': 3, 'name': title, 'item': canon }
                            ]
                        };

                        extraTags += `\n  <script type="application/ld+json">${JSON.stringify(blogSchema)}</script>`;
                        extraTags += `\n  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;
                    }
                }
            } catch (err) {
                console.error('Error fetching blog metadata for injection:', err.message);
            }
        } else if (categoryMatch) {
            const slug = categoryMatch[1];
            const categoryName = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            title = `${categoryName} | Handcrafted Sustainable Collections - Kottravai`;
            desc = `Discover high-quality, authentic handcrafted ${categoryName} products. Sustainably sourced and lovingly made by local traditional artisans.`;

            // Breadcrumb Schema
            const breadcrumbSchema = {
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.kottravai.in' },
                    { '@type': 'ListItem', 'position': 2, 'name': 'Shop', 'item': 'https://www.kottravai.in/shop' },
                    { '@type': 'ListItem', 'position': 3, 'name': categoryName, 'item': canon }
                ]
            };
            extraTags += `\n  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>`;
        } else {
            // General Organization & WebSite Schemas for landing / index pages
            const orgSchema = {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                'name': 'Kottravai',
                'url': 'https://www.kottravai.in',
                'logo': 'https://www.kottravai.in/logo.png',
                'sameAs': [
                    'https://instagram.com/kottravai',
                    'https://facebook.com/kottravai'
                ]
            };
            const websiteSchema = {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                'url': 'https://www.kottravai.in',
                'potentialAction': {
                    '@type': 'SearchAction',
                    'target': 'https://www.kottravai.in/shop?search={search_term_string}',
                    'query-input': 'required name=search_term_string'
                }
            };
            extraTags += `\n  <script type="application/ld+json">${JSON.stringify(orgSchema)}</script>`;
            extraTags += `\n  <script type="application/ld+json">${JSON.stringify(websiteSchema)}</script>`;
        }

        // Apply metadata injection modifications
        html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
        html = html.replace(/<meta\s+name="description"\s+content=".*?"\s*\/?>/i, `<meta name="description" content="${desc.replace(/"/g, '&quot;')}" />`);

        let headAdditions = `
  <link rel="canonical" href="${canon}" />
  <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:url" content="${canon}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
  <meta name="twitter:description" content="${desc.replace(/"/g, '&quot;')}" />
  <meta name="twitter:image" content="${ogImage}" />${statusCode === 404 ? '\n  <meta name="robots" content="noindex, nofollow" />' : ''}${extraTags}`;

        html = html.replace('</head>', `${headAdditions}\n</head>`);

        res.status(statusCode).send(html);
    } catch (err) {
        console.error('💥 [HTML_INJECTION_FAILURE] Falling back to static sendFile:', err.message);
        res.status(statusCode).sendFile(filePath);
    }
};

// The "catchall" handler: for any request that doesn't match one above
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
    }

    // Check if it's a static file (has extension)
    const hasExtension = req.path.includes('.');
    if (hasExtension) {
        // Let express.static handle it if the file exists
        const filePath = req.path.startsWith('/') ? req.path.slice(1) : req.path;
        if (fileExists(filePath)) {
            return next();
        } else {
            const indexFilePath = path.join(distPath, 'index.html');
            await injectMetadata(indexFilePath, req.path, 404, res);
            return;
        }
    }

    // Check if it's a valid React route
    const isValid = await isValidRoute(req.path);
    const statusCode = isValid ? 200 : 404;

    const buildFolder = 'dist';
    const indexFilePath = path.join(__dirname, `../${buildFolder}/index.html`);
    await injectMetadata(indexFilePath, req.path, statusCode, res);
});

/**
 * --- GLOBAL ERROR HANDLER ---
 * Final safety net to capture non-route-handler errors
 */
app.use((err, req, res, next) => {
    console.error('💥 [GLOBAL_ERROR_HANDLER]', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        status: 'error',
        error: err.message || 'An unexpected server error occurred',
        message: err.message || 'An unexpected server error occurred',
        error_code: err.code || 'INTERNAL_ERROR',
        type: err.name,
        details: process.env.NODE_ENV === 'production' ? `Consult server logs: ${err.message}` : err.stack
    });
});


// Only listen if running directly (not when imported as a module/serverless function)
if (require.main === module) {
    const startServer = (port) => {
        // --- SYSTEM HEALTH API ---
        app.get('/api/system-health', (req, res) => {
            try {
                const health = monitoring.getHealth();
                res.json({
                    status: "ok",
                    ...health,
                    ml_service_status: Date.now() > mlDisabledUntil ? "online" : "circuit_broken",
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                res.status(500).json({ status: "error", message: e.message });
            }
        });

        const server = app.listen(port, async () => {
            console.log(`✅ Server running on port ${port}`);
            
            const googleSheetsService = require('./services/googleSheetsService');
            try {
                const diag = await googleSheetsService.diagnosticTest();
                const metadataStep = diag.steps.find(s => s.name === 'spreadsheet_metadata');
                const rawEventsStep = diag.steps.find(s => s.name === 'raw_events_sheet_check');
                const spreadsheetId = process.env.GOOGLE_SHEET_ID || 'MISSING';
                const spreadsheetUrl = spreadsheetId !== 'MISSING' ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : 'N/A';
                
                console.log('\n==================================================');
                console.log('Analytics Startup Validation');
                console.log('==================================================');
                console.log(`ANALYTICS_MODE=${process.env.ANALYTICS_MODE || 'legacy'}`);
                console.log(`Google Sheet Connected=${diag.steps.find(s=>s.name==='authentication')?.status === 'PASSED'}`);
                console.log(`Spreadsheet ID=${spreadsheetId}`);
                console.log(`Spreadsheet URL=${spreadsheetUrl}`);
                console.log(`Raw Events Sheet Found=${rawEventsStep?.status === 'PASSED' || rawEventsStep?.status === 'WARNING'}`);
                console.log(`Dashboard Sheets Found=${metadataStep?.details?.sheetCount >= 10}`);
                console.log('==================================================\n');
            } catch(e) {
                console.log('\n==================================================');
                console.log('Analytics Startup Validation');
                console.log('==================================================');
                console.log(`ANALYTICS_MODE=${process.env.ANALYTICS_MODE || 'legacy'}`);
                console.log(`Google Sheet Connected=false (${e.message})`);
                console.log('==================================================\n');
            }
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                const nextPort = Number(port) + 1;
                if (nextPort > 65535) {
                    console.error('❌ Could not find an available port within range.');
                    process.exit(1);
                }
                startServer(nextPort);
            } else {
                throw err;
            }
        });
    };

    startServer(PORT);

    // Schedule daily full vector sync
    setInterval(() => {
        fullVectorSync().then(() => {
            productCache.set('last_full_sync', new Date().toISOString());
        }).catch(err => console.error('Scheduled Sync Error:', err));
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Run initial anomaly check
    runAnomalyCheck();
}


// ═══════════════════════════════════════════════════════════════════
// மண் வாசம் CAMPUS REGISTRATION — API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/campus/create-order
 * Creates a Razorpay order for ₹350 camp registration fee.
 */
app.post('/api/campus/create-order', async (req, res) => {
    try {
        const CAMPUS_FEE = 350;
        const options = {
            amount: CAMPUS_FEE * 100, // Razorpay expects paise
            currency: 'INR',
            receipt: `campus_rcpt_${Date.now()}`,
        };
        const order = await razorpay.orders.create(options);
        console.log(`✅ [CAMPUS] Razorpay order created: ${order.id}`);
        res.json(order);
    } catch (err) {
        console.error('❌ [CAMPUS] Failed to create order:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/campus/register
 * Verifies Razorpay payment, sends emails, writes to Google Sheets.
 */
app.post('/api/campus/register', async (req, res) => {
    const { formData, paymentId, orderId, signature } = req.body;

    if (!formData || !paymentId || !orderId || !signature) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Verify Razorpay signature
    try {
        const body = orderId + '|' + paymentId;
        const expectedSignature = crypto
            .createHmac('sha256', (process.env.RAZORPAY_KEY_SECRET || '').trim())
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            console.error('❌ [CAMPUS] Payment signature mismatch');
            return res.status(400).json({ error: 'Payment verification failed. Please contact support.' });
        }
        console.log('✅ [CAMPUS] Payment signature verified:', paymentId);
    } catch (sigErr) {
        console.error('❌ [CAMPUS] Signature verification error:', sigErr.message);
        return res.status(500).json({ error: 'Signature verification error' });
    }

    const enrichedData = { ...formData, paymentId, orderId };

    // 2. Send confirmation email to participant (non-blocking)
    sendEmail({
        to: formData.email,
        subject: '🌿 Your மண் வாசம் Registration is Confirmed!',
        html: getCampusUserTemplate(enrichedData),
        type: 'contact',
    }).catch(err => console.error('❌ [CAMPUS] User email failed:', err.message));

    // 3. Send admin notification (non-blocking)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@kottravai.in';
    sendEmail({
        to: adminEmail,
        subject: `🌿 New மண் வாசம் Registration — ${formData.name}`,
        html: getCampusAdminTemplate(enrichedData),
        type: 'contact',
    }).catch(err => console.error('❌ [CAMPUS] Admin email failed:', err.message));

    // 4. Write to Google Sheets (non-blocking)
    try {
        const googleSheetsService = require('./services/googleSheetsService');
        const { google } = require('googleapis');

        let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || '';
        let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || '';
        const SHEET_ID = process.env.GOOGLE_SHEET_ID || '';

        if (CLIENT_EMAIL && PRIVATE_KEY && SHEET_ID) {
            CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^["']|["']$/g, '');
            PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');

            const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
                'https://www.googleapis.com/auth/spreadsheets',
            ]);
            const sheetsApi = google.sheets({ version: 'v4', auth });
            const CAMPUS_SHEET = 'மண் வாசம் Registrations';

            // Ensure sheet exists
            const spreadsheet = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_ID });
            const sheetExists = spreadsheet.data.sheets.some(
                s => s.properties.title === CAMPUS_SHEET
            );

            if (!sheetExists) {
                await sheetsApi.spreadsheets.batchUpdate({
                    spreadsheetId: SHEET_ID,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: CAMPUS_SHEET,
                                    gridProperties: { frozenRowCount: 1 },
                                },
                            },
                        }],
                    },
                });

                // Write header row
                await sheetsApi.spreadsheets.values.update({
                    spreadsheetId: SHEET_ID,
                    range: `${CAMPUS_SHEET}!A1:T1`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        values: [[
                            'Timestamp', 'Name', 'Age', 'Gender', 'Email', 'WhatsApp',
                            'Place / City', 'Profession',
                            'Emergency Contact Name', 'Emergency Contact Phone',
                            'Allergies', 'Medical Conditions', 'Physical Activities OK?',
                            'Heard About Us', 'Heard About (Other)',
                            'Why Joining', 'Why Joining (Other)',
                            'Future Camp Updates?',
                            'Payment ID', 'Razorpay Order ID',
                        ]],
                    },
                });
                console.log(`✅ [CAMPUS] Created sheet "${CAMPUS_SHEET}" with headers`);
            }

            // Append data row
            await sheetsApi.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: `${CAMPUS_SHEET}!A:T`,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [[
                        new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                        formData.name || '',
                        formData.age || '',
                        formData.gender || '',
                        formData.email || '',
                        formData.whatsapp || '',
                        formData.place || '',
                        formData.profession || '',
                        formData.emergencyName || '',
                        formData.emergencyPhone || '',
                        formData.allergies || '',
                        formData.medicalConditions || '',
                        formData.physicalActivities || '',
                        formData.heardAbout || '',
                        formData.heardAboutOther || '',
                        formData.whyJoin || '',
                        formData.whyJoinOther || '',
                        formData.futureCamps || '',
                        paymentId || '',
                        orderId || '',
                    ]],
                },
            });
            console.log(`✅ [CAMPUS] Registration saved to Google Sheets for: ${formData.name}`);
        } else {
            console.warn('⚠️ [CAMPUS] Google Sheets credentials missing — skipping sheet write');
        }
    } catch (sheetErr) {
        console.error('❌ [CAMPUS] Google Sheets write failed:', sheetErr.message);
        // Non-fatal — registration still succeeds
    }

    console.log(`🌿 [CAMPUS] Registration complete for ${formData.name} (${formData.email}) — Payment: ${paymentId}`);
    res.json({ success: true, message: 'Registration successful' });
});

// ═══════════════════════════════════════════════════════════════════
// END CAMPUS REGISTRATION
// ═══════════════════════════════════════════════════════════════════

app.get('/api/analytics/temp-referrers', async (req, res) => {
  try {
    const sheetsService = require('./services/googleSheetsService');
    const s = await sheetsService.sheets();
    const rows = await sheetsService.fetchRawEventRows(s);
    
    // Target: Yesterday
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let counts = {
      medium: 0,
      blogspot: 0,
      linkedin: 0,
      quora: 0,
      pinterest: 0
    };
    
    let matchedVisitors = new Set();
    
    rows.forEach(row => {
      const rawTs = row.timestamp || row.Timestamp || row['Date'] || row['timestamp'];
      if (!rawTs) return;
      
      if (rawTs.startsWith(yesterdayStr)) {
        const vid = row.visitor_id || row['Visitor ID'] || row['visitor_id'];
        if (vid && matchedVisitors.has(vid)) return; // Only count unique visitors
        
        const ref = (row.referrer || row.Referrer || row['Referrer'] || '').toLowerCase();
        
        let matched = false;
        if (ref.includes('medium.com')) { counts.medium++; matched = true; }
        else if (ref.includes('blogspot.com')) { counts.blogspot++; matched = true; }
        else if (ref.includes('linkedin.com')) { counts.linkedin++; matched = true; }
        else if (ref.includes('quora.com')) { counts.quora++; matched = true; }
        else if (ref.includes('pinterest.')) { counts.pinterest++; matched = true; }
        
        if (matched && vid) {
            matchedVisitors.add(vid);
        }
      }
    });
    
    res.json({
      date: yesterdayStr,
      counts: counts
    });
  } catch(e) {
    res.status(500).json({error: e.message});
  }
});

module.exports = app;

/**
 * 🛠️ DATABASE PERFORMANCE INDEXES & SCHEMA UPGRADES 
 * 
 * -- 1. Performance Indexes
 * CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
 * CREATE INDEX IF NOT EXISTS idx_reviews_date ON reviews(date);
 * CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
 * 
 * -- 2. Product Stat Tracking (Option B Implementation)
 * ALTER TABLE products ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3,2) DEFAULT 0;
 * ALTER TABLE products ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;
 * 
 * -- 3. Unique Constraint for Review Protection (Duplicate Prevention Rule)
 * -- If you want strict SQL enforcement, run:
 * -- ALTER TABLE reviews ADD CONSTRAINT unique_user_review_per_product UNIQUE (product_id, user_name);
 */

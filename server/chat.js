const express = require('express');
const router = express.Router();
const db = require('./db');
const supabase = require('./supabase');
const crypto = require('crypto');
const { embeddingCache, responseCache, normalizeQuery, getCacheKey } = require('./utils/aiCache');
const aiProvider = require('./services/aiProvider');
const productService = require('./services/productService');
const chatAnalytics = require('./services/chatAnalytics');
const aiMonitoring = require('./utils/aiMonitoring');
const userPreferenceService = require('./services/userPreferenceService');

// --- Ensure chat_escalations table exists ---
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS chat_escalations (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                customer_name VARCHAR(255),
                customer_email VARCHAR(255),
                customer_phone VARCHAR(100),
                contact_raw VARCHAR(500),
                reason TEXT,
                history JSONB,
                status VARCHAR(50) DEFAULT 'open',
                agent_notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE
            )
        `);
        // Add columns if upgrading from older schema
        await db.query(`ALTER TABLE chat_escalations ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(100)`).catch(() => {});
        await db.query(`ALTER TABLE chat_escalations ADD COLUMN IF NOT EXISTS contact_raw VARCHAR(500)`).catch(() => {});
        console.log('✅ [ESCALATION] chat_escalations table ready');
    } catch (err) {
        console.error('❌ [ESCALATION] Failed to create chat_escalations table:', err.message);
    }
})();



const LOCAL_FAQS = [
  {
    q: "How do I place an order on Kottravai?",
    keywords: ["place order", "how to buy", "how to order", "order from kottravai", "place an order", "checkout", "how buy", "purchase"],
    a: "Ordering from Kottravai is simple! Browse our handcrafted collections, add your favorite items to the cart, and proceed to checkout. You’ll receive an order confirmation via email and SMS once the payment is successful."
  },
  {
    q: "What payment methods do you accept?",
    keywords: ["payment methods", "accept payment", "pay with", "payment options", "credit card", "upi", "net banking", "cash on delivery", "cod", "payment"],
    a: "We accept secure online payments including:\n• UPI (Google Pay, PhonePe, Paytm, etc.)\n• Credit & Debit Cards (Visa, Mastercard, RuPay)\n• Net Banking\n\nAll transactions are secured with SSL encryption through our payment gateway. We do not support Cash on Delivery (COD) at the moment."
  },
  {
    q: "How long does delivery take?",
    keywords: ["delivery time", "shipping time", "how long", "shipping duration", "deliver within", "days to deliver", "delivery duration", "dispatch time"],
    a: "Orders are typically delivered within 5–10 business days depending on your delivery address. Since our products are lovingly handcrafted by rural women artisans, some items may require additional preparation time before dispatch."
  },
  {
    q: "Do you ship across India?",
    keywords: ["ship to", "shipping locations", "ship across india", "deliver to my location", "outside tamil nadu", "pan india", "delivery address"],
    a: "Yes! We ship across India. For bulk orders, custom hampers, or corporate inquiries, feel free to contact us before placing your order."
  },
  {
    q: "What is your return policy?",
    keywords: ["return policy", "replace product", "damaged product", "refund policy", "returns", "exchange", "cancel order", "cancellation"],
    a: "We accept returns only for damaged products or incorrect items delivered. Please raise a request within 48 hours of delivery with supporting unboxing images/videos via our contact form or support email."
  },
  {
    q: "When will I receive my refund?",
    keywords: ["refund time", "receive refund", "refund processed", "money back", "refund duration"],
    a: "Once approved, refunds are processed back to the original payment method within 7–10 working days."
  },
  {
    q: "What materials are used in Kottravai handicrafts?",
    keywords: ["materials used", "organic materials", "eco-friendly materials", "coconut shells", "palm leaves", "clay", "natural fibers", "terracotta", "banana fiber"],
    a: "Our products are crafted using natural, sustainable, and eco-friendly materials such as:\n• Coconut shells\n• Banana fibers\n• Palm leaves\n• Clay & Terracotta\n\nEach piece is handmade by skilled rural women artisans in Tamil Nadu."
  },
  {
    q: "How do I care for handmade products?",
    keywords: ["care instructions", "how to clean", "maintain products", "care for handmade", "washing", "cleaning"],
    a: "• Clean gently with a dry or slightly damp cloth.\n• Avoid prolonged exposure to water, high moisture, or direct sunlight.\n• Handmade items may have minor natural variations—this is part of their unique charm!"
  },
  {
    q: "Who makes Kottravai products?",
    keywords: ["who makes", "who crafts", "who are the artisans", "women empowerment", "rural women", "artisan hub"],
    a: "Kottravai works directly with rural women artisans across Tamil Nadu. By sourcing directly from them, we help these traditional craftspeople earn a sustainable livelihood and support women empowerment."
  },
  {
    q: "How does my purchase make an impact?",
    keywords: ["social impact", "empowerment", "women support", "why kottravai", "social cause"],
    a: "Every purchase supports rural women artisans, preserves traditional crafting techniques, and encourages eco-friendly living. Your order contributes directly to rural economic growth and women empowerment."
  },
  {
    q: "How can I contact Kottravai for support?",
    keywords: ["contact details", "email id", "phone number", "support team", "customer care", "help line", "phone", "email", "whatsapp", "number"],
    a: "You can reach our customer support team via:\n• Email: support@kottravai.in\n• Phone/WhatsApp: +91 97870 30811\n\nWe respond to all inquiries within 24–48 hours."
  }
];

// --- Phase 10 Trace & Diagnostics ---
const MAX_CONCURRENT = 20;
let activeRequests = 0;
const conversationalState = new Map();

// --- Memory Cleanup (Phase 11) ---
const cleanupOldSessions = () => {
    const now = Date.now();
    for (const [sid, state] of conversationalState.entries()) {
        if (now - state.lastTimestamp > 1800000) { // 30 minutes
            conversationalState.delete(sid);
        }
    }
};
setInterval(cleanupOldSessions, 600000); // Run every 10 minutes

// --- Refinement Patterns ---
const refinementPatterns = [
  "something cheaper",
  "something better",
  "show another",
  "another one",
  "less expensive",
  "premium option",
  "more affordable",
  "budget option",
  "show more",
  "better quality",
  "cheaper",
  "more expensive",
  "anything else"
];

// --- Semantic Category Mappings (Phase 11) ---
const categoryMappings = {
  bathroom: ["home essentials", "wellness", "household", "bath care"],
  soap: ["wellness", "bath care", "essential care"],
  kitchen: ["cookware", "home", "heritage mixes"],
  gift: ["curated", "special occasion", "hampers", "handicrafts"],
  kids: ["children", "family", "health mixes"],
  wellness: ["essential care", "health mixes"],
  home: ["household", "handicrafts"]
};

const STOP_WORDS = [
  "can", "could", "would", "should", "please", "show", "give", "get", "find", 
  "need", "want", "looking", "search", "for", "some", "any", "me", "i", "we", 
  "our", "the", "a", "an", "is", "are", "with", "to", "today", "suggest", 
  "recommend", "tell", "about", "products", "items"
];

const PRICE_INTENTS = {
  cheapest: ["cheap", "cheaper", "lowest", "budget", "low price", "affordable", "less price", "value"],
  expensive: ["premium", "expensive", "luxury", "costly", "high price", "best quality"]
};

const CATEGORY_DOMAINS = {
  food: ["mix", "health", "drink", "millet", "rice", "idly", "idli", "dosa", "podi", "heritage mixes", "breakfast", "spices", "sathu maavu", "masala"],
  jewellery: ["jewellery", "necklace", "earrings", "bangles", "temple jewellery", "jewelry", "fashion"],
  decor: ["decor", "home", "art", "terracotta", "wall", "craft"],
  gifts: ["gift", "hamper", "hampers", "present", "combo", "bundle", "gift box", "gift combo", "eco hampers", "premium gifts"]
};

const TRENDING_INTENTS = {
  trending: ["trending", "popular", "best seller", "best selling", "favorites", "most loved"],
  newest: ["new", "latest", "recent", "fresh", "new arrivals"]
};

const LIFESTYLE_FRAMING = {
  food: "These products are popular among customers looking for healthy breakfast alternatives.",
  gifts: "These handcrafted gifts are often chosen for festive and return-gift occasions.",
  jewellery: "These traditional products are loved for their homemade-style authenticity."
};

const synonymMap = {
  idly: ["idly", "idli", "podi", "powder", "mix"],
  dosa: ["dosa", "dosai"],
  spice: ["spice", "masala", "spices", "turmeric", "pepper"],
  gift: ["gift", "hamper", "present", "combo", "bundle"],
  healthy: ["healthy", "organic", "natural", "wellness", "nutrition"],
  terracotta: ["terracotta", "jewellery", "jewelry"]
};

// --- Conversational Marketing Personality (Phase 11) ---
const CONVERSATIONAL_TEMPLATES = {
  food: [
    "These traditional mixes are popular for quick homemade meals and healthy breakfasts.",
    "Many customers love these heritage mixes for their authentic homemade-style taste.",
    "These mixes are a great choice if you enjoy traditional and healthy food options."
  ],
  gifts: [
    "These hampers are popular for thoughtful gifting and festive occasions.",
    "If you're looking for meaningful eco-friendly gifts, these are worth exploring.",
    "These curated hampers are customer favorites for birthdays and celebrations."
  ],
  jewellery: [
    "These handcrafted jewellery collections are among our premium traditional designs.",
    "Customers love these pieces for their elegant handmade finish and cultural touch.",
    "These jewellery products are perfect if you enjoy traditional handcrafted styles."
  ],
  general: [
    "These are some customer favorites you might enjoy exploring.",
    "Here are some of our most loved traditional products curated just for you.",
    "I've picked out a few items from our collection that reflect Kottravai's handmade identity."
  ]
};

const FOLLOW_UP_PHRASES = {
  pricing: "Would you like budget-friendly options or premium picks?",
  variety: "Would you like to explore similar products or gift combos?",
  interest: "Would you like recommendations based on healthy options, gifting, or traditional foods?",
  general: "Should I show you more varieties from this collection?"
};

const RESTRICTED_QUERIES = [
  "analytics", "revenue", "profit", "sales metrics", "dashboard", 
  "database", "internal", "admin", "api", "logs", "system", 
  "performance", "latency", "secret", "confidential", "company data", 
  "business metrics", "conversion rate", "financial", "orders count", 
  "supplier", "backend", "server", "token", "api key", "credentials"
];

const SAFE_REDIRECTIONS = [
  "I’m mainly here to help you explore Kottravai products and collections.",
  "I can help you discover healthy mixes, eco-friendly gifts, handcrafted jewellery, and traditional products.",
  "For shopping recommendations and product discovery, I’d be happy to help."
];

router.post('/', async (req, res) => {
    console.log("\n🚀 [RCA] REQUEST_RECEIVED:", req.body.message);
    const startTime = Date.now();
    const { message, history = [], sessionId = 'anonymous' } = req.body;
    
    if (activeRequests >= MAX_CONCURRENT) {
        console.error("❌ [RCA] CONCURRENCY_EXCEEDED");
        return res.status(530).json({ error: "System optimizing. Try again." });
    }
    activeRequests++;

    const normalized = normalizeQuery(message);
    console.log("✅ [RCA] QUERY_NORMALIZED:", normalized);
    const cacheKey = getCacheKey(normalized);

    const sessionState = conversationalState.get(sessionId) || null;

    // --- Order Tracking Intent Detection & Handling ---
    const trackingKeywords = ["track", "order status", "where is my order", "order #", "order id", "shipment"];
    const isTrackingIntent = trackingKeywords.some(keyword => normalized.includes(keyword));
    const isWaitingForTracking = sessionState?.waiting_for_tracking_info;
    
    if (isTrackingIntent || isWaitingForTracking) {
        console.log("📦 [TRACKING] ORDER_TRACKING_REQUEST_DETECTED");
        
        let orderId = null;
        let email = null;
        let phone = null;

        // Extract Order ID (Razorpay format 'order_xxxx', UUID, or general digits)
        const razorpayMatch = message.match(/order_[a-zA-Z0-9]+/i);
        const uuidMatch = message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        const genericMatch = message.match(/(?:kt-)?\b\d{4,15}\b/i);

        if (razorpayMatch) {
            orderId = razorpayMatch[0];
        } else if (uuidMatch) {
            orderId = uuidMatch[0];
        } else if (genericMatch) {
            orderId = genericMatch[0];
        }

        // Extract Email
        const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
            email = emailMatch[0];
        }

        // Extract Phone (last 10 digits of any 10-12 digit sequence)
        const phoneMatch = message.match(/\b\d{10,12}\b/);
        if (phoneMatch) {
            phone = phoneMatch[0].slice(-10);
        }

        // Merge with session state
        const activeOrderId = orderId || sessionState?.trackingOrderId || null;
        const activeEmail = email || sessionState?.trackingEmail || null;
        const activePhone = phone || sessionState?.trackingPhone || null;

        if (activeOrderId && (activeEmail || activePhone)) {
            try {
                console.log(`🔍 [TRACKING] DB Lookup for Order: ${activeOrderId} | Verification: ${activeEmail || activePhone}`);
                
                let queryStr = `SELECT * FROM orders WHERE (order_id = $1 OR id::text = $1)`;
                let params = [activeOrderId];

                if (activeEmail && activePhone) {
                    queryStr += " AND (customer_email ILIKE $2 OR customer_phone LIKE '%' || $3)";
                    params.push(activeEmail, activePhone);
                } else if (activeEmail) {
                    queryStr += " AND customer_email ILIKE $2";
                    params.push(activeEmail);
                } else {
                    queryStr += " AND customer_phone LIKE '%' || $2";
                    params.push(activePhone);
                }

                const orderRes = await db.query(queryStr, params);

                if (orderRes.rows.length > 0) {
                    const order = orderRes.rows[0];
                    let reply = `📦 **Order Status for #${order.order_id || order.id}**\n\n`;
                    reply += `*   **Status:** ${order.status}\n`;
                    reply += `*   **Order Date:** ${new Date(order.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
                    reply += `*   **Customer:** ${order.customer_name}\n`;
                    reply += `*   **Shipping Address:** ${order.address}, ${order.city} - ${order.pincode}\n`;
                    reply += `*   **Total Amount:** ₹${parseFloat(order.total).toLocaleString('en-IN')}\n\n`;

                    if (Array.isArray(order.items)) {
                        reply += `**Items Ordered:**\n`;
                        order.items.forEach(item => {
                            reply += `*   ${item.name} (x${item.quantity}) - ₹${item.price * item.quantity}\n`;
                        });
                        reply += `\n`;
                    }

                    // Shiprocket Tracking Integration
                    if (order.shipment_id) {
                        try {
                            console.log(`📡 [TRACKING] Calling Shiprocket for shipment ID: ${order.shipment_id}`);
                            const shiprocketService = require('./services/shiprocketService');
                            const trackingData = await shiprocketService.trackShipment(order.shipment_id);
                            const shipmentTrack = trackingData[order.shipment_id];
                            
                            if (shipmentTrack && shipmentTrack.tracking_data) {
                                const trackInfo = shipmentTrack.tracking_data;
                                const shipmentStatus = trackInfo.track_status || trackInfo.status;
                                const etd = trackInfo.etd || trackInfo.edd;

                                reply += `🚚 **Live Shipment Tracking (via Shiprocket):**\n`;
                                reply += `*   **Courier Status:** ${shipmentStatus || 'In Transit'}\n`;
                                if (trackInfo.courier_name) reply += `*   **Carrier:** ${trackInfo.courier_name}\n`;
                                if (trackInfo.awb_code) reply += `*   **AWB Code:** ${trackInfo.awb_code}\n`;
                                if (etd) reply += `*   **Estimated Delivery:** ${new Date(etd).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`;
                                if (trackInfo.scans && trackInfo.scans.length > 0) {
                                    const latestScan = trackInfo.scans[0];
                                    reply += `*   **Latest Scan:** ${latestScan.activity} at ${latestScan.location} (${new Date(latestScan.date).toLocaleDateString()})\n`;
                                }
                            } else {
                                reply += `🚚 **Courier Info:** Shipment is registered with courier (ID: ${order.shipment_id}). Live status updates will appear shortly.`;
                            }
                        } catch (shipErr) {
                            console.error("❌ [TRACKING] Shiprocket fetch failed:", shipErr.message);
                            reply += `🚚 **Courier Info:** Shipment ID: ${order.shipment_id} (Live updates currently unavailable. Please check back later).`;
                        }
                    } else {
                        reply += `ℹ️ **Shipping Info:** Your order is currently being processed in our warehouse and has not been dispatched yet. We will notify you with the tracking details as soon as it is shipped!`;
                    }

                    // Clean tracking state on successful lookup
                    conversationalState.delete(sessionId);

                    activeRequests--;
                    return res.json({ reply, confidence: "HIGH" });
                } else {
                    console.log(`❌ [TRACKING] Order not found:`, { activeOrderId, activeEmail, activePhone });
                    activeRequests--;
                    return res.json({
                        reply: "I couldn't find an order matching those details. Please double-check your **Order ID** and the **Email** or **Phone number** associated with it and try again.",
                        confidence: "HIGH"
                    });
                }
            } catch (dbErr) {
                console.error("❌ [TRACKING] Database lookup failed:", dbErr.message);
                activeRequests--;
                return res.status(500).json({ reply: "I encountered an error while searching for your order. Please try again in a few moments." });
            }
        } else {
            // Store intermediate state to handle multi-turn input gathering
            conversationalState.set(sessionId, {
                waiting_for_tracking_info: true,
                trackingOrderId: activeOrderId,
                trackingEmail: activeEmail,
                trackingPhone: activePhone,
                lastTimestamp: Date.now()
            });

            let promptMessage = "";
            if (!activeOrderId) {
                promptMessage = "I'd be happy to check your order status! Please enter your **Order ID** (for example, `order_OpX12345` or your receipt number).";
            } else {
                promptMessage = `To verify order **${activeOrderId}**, please enter the **Email** or **Phone number** associated with the purchase.`;
            }

            activeRequests--;
            return res.json({
                reply: promptMessage,
                confidence: "HIGH"
            });
        }
    }

    // --- Add to Cart Intent Detection & Handling ---
    const cartKeywords = ["add to cart", "add to basket", "put in cart", "buy this", "add this to cart", "add it to cart", "add to my cart", "add to cart."];
    const isCartIntent = cartKeywords.some(keyword => normalized.includes(keyword)) || (normalized.startsWith("add ") && normalized.includes("cart"));
    
    if (isCartIntent) {
        console.log("🛒 [CART] ADD_TO_CART_REQUEST_DETECTED");
        
        let targetProduct = null;
        let quantity = 1;

        // Try to extract quantity (e.g. "add 2 handcrafted cups" or "add 5 idli podi")
        const qtyMatch = message.match(/\b(\d+)\b/);
        if (qtyMatch) {
            const val = parseInt(qtyMatch[1], 10);
            if (val > 0 && val <= 100) {
                quantity = val;
            }
        }

        // Try to find target product:
        // Case A: Contextual reference (user says "this", "it", "that", "them" or similar)
        const isContextual = normalized.includes("this") || normalized.includes(" it ") || normalized.endsWith(" it") || normalized.includes("that") || normalized.includes("them");
        
        if (isContextual && sessionState?.lastProducts && sessionState.lastProducts.length > 0) {
            const firstId = sessionState.lastProducts[0];
            const allActive = await productService.getAllActiveProducts();
            targetProduct = allActive.find(p => p.id === firstId);
        }

        // Case B: Search reference (strip keywords and match against the product catalog)
        if (!targetProduct) {
            let cleanQuery = message.toLowerCase()
                .replace(/add to cart/g, "")
                .replace(/add to basket/g, "")
                .replace(/put in cart/g, "")
                .replace(/buy this/g, "")
                .replace(/add/g, "")
                .replace(/to cart/g, "")
                .replace(/to my cart/g, "")
                .replace(/in my cart/g, "")
                .replace(/\b\d+\b/g, "") // remove quantity numbers
                .replace(/[^\w\s]/g, " ")
                .trim();

            if (cleanQuery.length > 2) {
                console.log(`🛒 [CART] Searching for product matching: "${cleanQuery}"`);
                const allActive = await productService.getAllActiveProducts();
                
                const tokens = cleanQuery.split(" ").filter(t => t.length > 2 && !STOP_WORDS.includes(t));
                const scored = allActive.map(p => {
                    const searchable = `${p.name} ${p.category}`.toLowerCase();
                    let score = 0;
                    tokens.forEach(t => {
                        if (searchable.includes(t)) score += 1;
                    });
                    if (p.name.toLowerCase().includes(cleanQuery)) score += 5;
                    return { ...p, score };
                }).filter(p => p.score > 0);

                if (scored.length > 0) {
                    scored.sort((a, b) => b.score - a.score);
                    targetProduct = scored[0];
                }
            }
        }

        if (targetProduct) {
            console.log(`🛒 [CART] Successfully matched product: "${targetProduct.name}" (ID: ${targetProduct.id})`);
            activeRequests--;

            const replyText = `I've added ${quantity} x **${targetProduct.name}** to your cart! You can see it in your cart now. Would you like to check out or explore more products?`;

            return res.json({
                reply: replyText,
                confidence: "HIGH",
                actions: [
                    {
                        type: "ADD_TO_CART",
                        productId: targetProduct.id,
                        quantity: quantity
                    }
                ]
            });
        } else {
            console.log("🛒 [CART] Product match failed");
            activeRequests--;
            return res.json({
                reply: "I couldn't quite figure out which product you'd like to add to your cart. Could you please specify the name of the product?",
                confidence: "HIGH"
            });
        }
    }

    // --- Guided Gifting / Shopping Quiz ---
    // Quiz flow: entry → step1 (occasion) → step2 (budget) → step3 (recipient) → results
    const quizStartKeywords = ["gifting quiz", "gift quiz", "help me choose", "help me pick", "gift advisor", "suggest a gift", "help find a gift", "not sure what to buy", "recommend something", "quiz"];
    const isQuizStart = quizStartKeywords.some(kw => normalized.includes(kw)) ||
        (normalized.includes("gift") && (normalized.includes("recommend") || normalized.includes("help") || normalized.includes("suggest")));
    const isInQuiz = sessionState?.quiz_step != null;

    if (isQuizStart && !isInQuiz) {
        console.log("🎁 [QUIZ] GIFTING_QUIZ_STARTED");
        conversationalState.set(sessionId, {
            quiz_step: 1,
            quiz_data: {},
            lastTimestamp: Date.now()
        });
        activeRequests--;
        return res.json({
            reply: "🎁 Welcome to the **Kottravai Gift Advisor**! I'll help you find the perfect handmade gift in just 3 quick questions.\n\n**Step 1 of 3:** What is the occasion?",
            confidence: "HIGH",
            options: [
                { label: "🎂 Birthday", value: "__quiz_occasion_birthday" },
                { label: "💍 Wedding / Engagement", value: "__quiz_occasion_wedding" },
                { label: "🪔 Festival (Diwali, Pongal...)", value: "__quiz_occasion_festival" },
                { label: "🙏 Return Gift / Pooja", value: "__quiz_occasion_return_gift" },
                { label: "💝 Just Because / Surprise", value: "__quiz_occasion_surprise" }
            ]
        });
    }

    if (isInQuiz) {
        console.log(`🎁 [QUIZ] QUIZ_IN_PROGRESS, step=${sessionState.quiz_step}, msg="${message}"`);
        const quizData = sessionState.quiz_data || {};

        if (sessionState.quiz_step === 1) {
            // Capture occasion from either button value or natural text
            let occasion = message.replace("__quiz_occasion_", "");
            if (message.startsWith("__quiz_occasion_")) {
                const occasionMap = {
                    birthday: "Birthday", wedding: "Wedding / Engagement",
                    festival: "Festival", return_gift: "Return Gift / Pooja", surprise: "Surprise"
                };
                occasion = occasionMap[occasion] || occasion;
            }
            conversationalState.set(sessionId, {
                quiz_step: 2,
                quiz_data: { ...quizData, occasion },
                lastTimestamp: Date.now()
            });
            activeRequests--;
            return res.json({
                reply: `Great choice for a **${occasion}** occasion! 🎉\n\n**Step 2 of 3:** What is your budget?`,
                confidence: "HIGH",
                options: [
                    { label: "💰 Under ₹300", value: "__quiz_budget_300" },
                    { label: "🛍️ ₹300 – ₹700", value: "__quiz_budget_700" },
                    { label: "🎀 ₹700 – ₹1,500", value: "__quiz_budget_1500" },
                    { label: "✨ ₹1,500 – ₹3,000", value: "__quiz_budget_3000" },
                    { label: "👑 Premium (₹3,000+)", value: "__quiz_budget_premium" }
                ]
            });
        }

        if (sessionState.quiz_step === 2) {
            // Capture budget
            let minPrice = 300;
            let maxPrice = 700;
            let budgetLabel = "₹300–₹700";
            if (message.includes("300")) { minPrice = 0; maxPrice = 300; budgetLabel = "under ₹300"; }
            else if (message.includes("700")) { minPrice = 300; maxPrice = 700; budgetLabel = "₹300–₹700"; }
            else if (message.includes("1500") || message.includes("1,500")) { minPrice = 700; maxPrice = 1500; budgetLabel = "₹700–₹1,500"; }
            else if (message.includes("3000") || message.includes("3,000")) { minPrice = 1500; maxPrice = 3000; budgetLabel = "₹1,500–₹3,000"; }
            else if (message.includes("premium")) { minPrice = 3000; maxPrice = 999999; budgetLabel = "Premium (₹3,000+)"; }

            conversationalState.set(sessionId, {
                quiz_step: 3,
                quiz_data: { ...quizData, minPrice, maxPrice, budgetLabel },
                lastTimestamp: Date.now()
            });
            activeRequests--;
            return res.json({
                reply: `Perfect! Budget set to **${budgetLabel}**. 💫\n\n**Step 3 of 3:** Who is this gift for?`,
                confidence: "HIGH",
                options: [
                    { label: "👩 Woman / Sister / Mother", value: "__quiz_for_woman" },
                    { label: "👨 Man / Brother / Father", value: "__quiz_for_man" },
                    { label: "👶 Child / Family", value: "__quiz_for_child" },
                    { label: "👫 Couple", value: "__quiz_for_couple" },
                    { label: "🏢 Corporate / Team", value: "__quiz_for_corporate" }
                ]
            });
        }

        if (sessionState.quiz_step === 3) {
            // Capture recipient
            let recipient = "someone special";
            if (message.includes("woman") || message.includes("sister") || message.includes("mother")) recipient = "women";
            else if (message.includes("man") || message.includes("brother") || message.includes("father")) recipient = "men";
            else if (message.includes("child") || message.includes("family")) recipient = "family";
            else if (message.includes("couple")) recipient = "couples";
            else if (message.includes("corporate") || message.includes("team")) recipient = "corporate";

            const { occasion, minPrice, maxPrice, budgetLabel } = { ...quizData, ...sessionState.quiz_data };

            console.log(`🎁 [QUIZ] FINDING_RESULTS: occasion=${occasion}, minPrice=${minPrice}, maxPrice=${maxPrice}, recipient=${recipient}`);

            // Fetch matching products
            const allActive = await productService.getAllActiveProducts();

            // Calculate matching score for each product
            let candidates = allActive.map(p => {
                let score = 0;
                const price = Number(p.price) || 0;
                
                // 1. Price check (essential fit)
                if (price >= minPrice && price <= maxPrice) {
                    score += 100;
                } else if (price <= maxPrice && price >= (minPrice - 150)) {
                    // Slight leeway below minPrice gets a smaller boost
                    score += 40;
                } else {
                    // Out of price bounds completely
                    return null;
                }

                const nameLower = (p.name || "").toLowerCase();
                const catLower = (p.category || "").toLowerCase();

                // 2. Occasion Boosting
                const occ = (occasion || "").toLowerCase();
                if (occ.includes("wedding") || occ.includes("marriage") || occ.includes("engagement")) {
                    if (catLower.includes("bridal") || catLower.includes("jewel") || catLower.includes("hamper") || nameLower.includes("necklace") || nameLower.includes("traditional")) {
                        score += 30;
                    }
                } else if (occ.includes("festival") || occ.includes("diwali") || occ.includes("pongal")) {
                    if (catLower.includes("festival") || catLower.includes("jewel") || nameLower.includes("festive") || nameLower.includes("dhoop") || nameLower.includes("lamp") || nameLower.includes("pooja") || nameLower.includes("temple")) {
                        score += 30;
                    }
                } else if (occ.includes("return") || occ.includes("pooja") || occ.includes("housewarming")) {
                    if (catLower.includes("coconut") || catLower.includes("fiber") || nameLower.includes("dhoop") || nameLower.includes("holder") || nameLower.includes("basket") || price < 500) {
                        score += 30;
                    }
                } else if (occ.includes("birthday") || occ.includes("anniversary")) {
                    if (catLower.includes("hamper") || nameLower.includes("gift") || nameLower.includes("cup") || nameLower.includes("mug") || catLower.includes("jewel")) {
                        score += 30;
                    }
                }

                // 3. Recipient Matching and Filtering
                if (recipient === "women") {
                    if (nameLower.includes("men's") || nameLower.includes("for men")) {
                        return null;
                    }
                    if (catLower.includes("jewel") || catLower.includes("bridal") || catLower.includes("wear") || nameLower.includes("necklace") || nameLower.includes("earrings") || nameLower.includes("pendant")) {
                        score += 40;
                    }
                } else if (recipient === "men") {
                    if (catLower.includes("jewel") || catLower.includes("bridal") || nameLower.includes("earrings") || nameLower.includes("necklace") || nameLower.includes("pendant")) {
                        return null;
                    }
                    if (nameLower.includes("wine") || nameLower.includes("mug") || nameLower.includes("holder") || nameLower.includes("stand") || nameLower.includes("desk")) {
                        score += 40;
                    }
                } else if (recipient === "family") {
                    if (catLower.includes("hamper") || catLower.includes("mix") || catLower.includes("podi") || nameLower.includes("basket") || nameLower.includes("family")) {
                        score += 40;
                    }
                } else if (recipient === "couples") {
                    if (nameLower.includes("set") || nameLower.includes("pair") || catLower.includes("hamper") || nameLower.includes("showpiece") || nameLower.includes("nativity")) {
                        score += 40;
                    }
                } else if (recipient === "corporate") {
                    if (nameLower.includes("holder") || nameLower.includes("organizer") || catLower.includes("fiber") || catLower.includes("hamper") || nameLower.includes("box")) {
                        score += 40;
                    }
                }

                // 4. Best seller bonus
                if (p.is_best_seller) {
                    score += 15;
                }

                return { product: p, score };
            })
            .filter((c) => c !== null && c.score > 0);

            // Sort by match score descending
            candidates.sort((a, b) => b.score - a.score);

            // Select top 3 candidates ensuring category diversity
            const top = [];
            const seenCategories = new Set();
            for (const candidate of candidates) {
                const cat = candidate.product.category || "General";
                if (!seenCategories.has(cat)) {
                    top.push(candidate.product);
                    seenCategories.add(cat);
                }
                if (top.length === 3) break;
            }
            // If we have less than 3 distinct categories, fill up with the remaining highest scoring candidates
            if (top.length < 3) {
                for (const candidate of candidates) {
                    if (!top.some(p => p.id === candidate.product.id)) {
                        top.push(candidate.product);
                    }
                    if (top.length === 3) break;
                }
            }

            // Clear quiz state
            conversationalState.delete(sessionId);

            if (top.length > 0) {
                const productTags = top.map(p => `[PRODUCT:${p.id}]`).join('\n');
                activeRequests--;
                return res.json({
                    reply: `✨ Based on your answers, here are my top picks for **${occasion}** gifting (budget: **${budgetLabel}**) for **${recipient}**! These are all handcrafted with love from Kottravai.\n\n${productTags}\n\nWould you like to explore more options or add any of these to your cart?`,
                    confidence: "HIGH"
                });
            } else {
                activeRequests--;
                return res.json({
                    reply: `I couldn't find exact matches for your preferences right now, but let me show you our best handcrafted gift collections! You can also browse our **Hampers** and **Handicrafts** sections for wonderful gifting options.`,
                    confidence: "MEDIUM"
                });
            }
        }
    }

    let context = "";
    let similarityScores = [];
    let fallbackUsed = false;
    let confidenceLevel = "LOW";
    let intent = 'discovery';
    let matchedProductIds = [];
    let detectedCategory = null;
    let fallbackUsage = false;

    // 1. Refinement Intelligence (Phase 11)
    const isRefinementQuery = refinementPatterns.some(p => normalized.includes(p));

    if (isRefinementQuery) {
        console.log("🔍 [REFINEMENT] REFINEMENT_INTENT_DETECTED");
        console.log("🔍 [REFINEMENT] ANCHOR_FOUND:", !!sessionState);
        
        if (!sessionState) {
            console.log("🔍 [REFINEMENT] CLARIFICATION_TRIGGERED");
            activeRequests--;
            return res.json({ 
                reply: "I'd love to help you find something specific! Are you looking for health mixes, eco-friendly gifts, traditional spices, or something else?",
                confidence: "HIGH",
                clarification_needed: true
            });
        }
        intent = 'refinement';
    }

    try {
        // 1. Intent Intelligence
        if (normalized.includes('buy') || normalized.includes('price')) intent = 'transactional';
        else if (normalized.includes('how') || normalized.includes('what')) intent = 'informational';

        // 2. Cache Check
        if (history.length === 0 && responseCache.has(cacheKey)) {
            console.log("⚡ [RCA] RESPONSE_CACHE_HIT");
            activeRequests--;
            return res.json({ ...responseCache.get(cacheKey), cached: true });
        }

        // 2.5 Greeting Bypass (Phase 11 Optimization)
        const greetings = ["hi", "hello", "hey", "hii", "good morning", "good evening", "thozhi", "vanakkam"];
        if (greetings.some(g => normalized.includes(g) && normalized.length < 15)) {
            console.log("⚡ [RCA] GREETING_BYPASS_TRIGGERED");
            const reply = "Vanakkam! I'm Thozhi, your Kottravai assistant. I'm here to help you discover authentic traditional foods, handcrafted jewellery, and thoughtful eco-friendly gifts. What can I help you find today?";
            activeRequests--;
            return res.json({ reply, confidence: "HIGH" });
        }

        // 2.6 Local FAQ Matcher (RAG-less Knowledgebase Engine)
        let matchedFAQ = null;
        for (const faq of LOCAL_FAQS) {
            const matchedKeyword = faq.keywords.find(keyword => normalized.includes(keyword));
            if (matchedKeyword || normalized.includes(faq.q.toLowerCase())) {
                matchedFAQ = faq;
                break;
            }
        }

        if (matchedFAQ) {
            console.log("✅ [KNOWLEDGEBASE] FAQ_MATCH_FOUND:", matchedFAQ.q);
            activeRequests--;
            return res.json({
                reply: matchedFAQ.a,
                confidence: "HIGH",
                intelligence: { intent: 'faq', matched_question: matchedFAQ.q }
            });
        }

        // 2.7 Local Product Catalog Keyword Matcher
        const localQueryTokens = normalized.split(" ").filter(word => word.length > 2 && !STOP_WORDS.includes(word));
        if (localQueryTokens.length > 0) {
            const allProducts = await productService.getAllActiveProducts();
            
            const scoredProducts = allProducts.map(p => {
                const searchable = `${p.name} ${p.category} ${p.description}`.toLowerCase();
                let score = 0;
                localQueryTokens.forEach(token => {
                    if (searchable.includes(token)) score += 1;
                });
                
                if (p.name.toLowerCase().includes(normalized)) score += 3;
                
                return { ...p, score };
            }).filter(p => p.score > 0);

            if (scoredProducts.length > 0) {
                scoredProducts.sort((a, b) => b.score - a.score);
                const matchedProducts = scoredProducts.slice(0, 3);
                const matchedProductIds = matchedProducts.map(p => p.id);

                console.log(`✅ [KNOWLEDGEBASE] PRODUCT_MATCH_FOUND: Matched ${matchedProducts.length} items`);
                
                const productTags = matchedProducts.map(p => `[PRODUCT:${p.id}]`).join('\n');
                const replyText = `Vanakkam! Based on your interest in our collections, here are some recommendations from our catalog:\n\n${productTags}\n\nWould you like to add any of these to your cart or explore more?`;

                conversationalState.set(sessionId, {
                    lastCategory: matchedProducts[0].category,
                    lastProducts: matchedProductIds,
                    lastQuery: normalized,
                    lastTimestamp: Date.now()
                });

                activeRequests--;
                return res.json({
                    reply: replyText,
                    confidence: "HIGH",
                    intelligence: { intent: 'product_lookup', matched_count: matchedProducts.length }
                });
            }
        }

        // 2.8 Local Fallback Reply
        console.log("⚠️ [KNOWLEDGEBASE] NO_DIRECT_MATCHES_FOUND");
        activeRequests--;
        return res.json({
            reply: "Vanakkam! I'm Thozhi, your Kottravai companion. I couldn't find an exact match for your question. You can ask me about our **delivery status**, **shipping policy**, **payment options**, or explore our popular collections like **Health Mixes** or **Handcrafted Jewellery**! You can also request to **speak with support**.",
            confidence: "LOW",
            intelligence: { intent: 'fallback', success_score: 0.5 }
        });

        // 2.6 Hard Security Boundaries (Phase 12 Security)
        const isRestrictedQuery = RESTRICTED_QUERIES.some(keyword => normalized.includes(keyword));
        if (isRestrictedQuery) {
            console.log("🔒 RESTRICTED_QUERY_BLOCKED", {
                query: normalized,
                timestamp: Date.now(),
                sessionId
            });

            // Log security attempt
            chatAnalytics.logRestrictedQuery({
                sessionId,
                query: message,
                blockedReason: 'restricted_intent_match'
            });

            const reply = SAFE_REDIRECTIONS[Math.floor(Math.random() * SAFE_REDIRECTIONS.length)];
            activeRequests--;
            return res.json({ 
                reply, 
                confidence: "HIGH", 
                intelligence: { intent: 'restricted', security_blocked: true } 
            });
        }

        const filters = { category: sessionState?.lastCategory || null };
        if (normalized.includes('bag')) filters.category = 'Handicrafts/Bags';
        if (normalized.includes('food')) filters.category = 'Heritage Mixes';

        // Apply Semantic Category Mapping (Phase 11)
        let augmentedQuery = message;
        for (const [key, synonyms] of Object.entries(categoryMappings)) {
            if (normalized.includes(key)) {
                console.log("🔍 [SEMANTIC] CATEGORY_MAPPING_APPLIED:", key);
                augmentedQuery += " " + synonyms.join(" ");
                break; 
            }
        }

        // Price refinement logic
        let priceFilter = null;
        if (isRefinementQuery) {
            if (normalized.includes('cheaper') || normalized.includes('less expensive') || normalized.includes('budget')) {
                priceFilter = 'low';
            } else if (normalized.includes('premium') || normalized.includes('better')) {
                priceFilter = 'high';
            }
        }
        
        // 2.7 Deterministic Matching Layer (Phase 11)
        console.log("🔍 [HYBRID] MATCH_STARTED");
        console.log("🔍 [HYBRID] NORMALIZED_QUERY:", normalized);
        
        const allProducts = await productService.getAllActiveProducts();

        if (!Array.isArray(allProducts)) {
            console.error("❌ [HYBRID] allProducts is not an array");
            activeRequests--;
            return res.status(500).json({ error: "Product dataset unavailable" });
        }

        console.log("📦 PRODUCT_COUNT:", allProducts.length);

        // Step 4: Validate Product Structure (Phase 11)
        allProducts.forEach(p => {
            if (!p.id || !p.name) console.warn("⚠️ [HYBRID] MALFORMED_PRODUCT:", p);
        });

        // Step 6: Emergency Product Dataset Protection (Phase 11)
        if (allProducts.length === 0) {
            console.error("❌ [HYBRID] CHAT_PRODUCT_DATASET_EMPTY");
            fallbackUsed = true;
            context = "NOTICE: Product catalog is currently unavailable. Guide the user to browse Health Mixes and Gifts on our website.";
        }

        // Step 0: Normalize & Tokenize (Phase 11)
        const userQuery = message.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
        const queryTokens = userQuery.split(" ").filter(word => word.length > 1 && !STOP_WORDS.includes(word));
        const expandedTokens = queryTokens.flatMap(token => synonymMap[token] || [token]);
        const cleanedIntent = queryTokens.join(" ");

        // Step 1: Detect Category Domain (Phase 11)
        const detectedDomain = Object.entries(CATEGORY_DOMAINS).find(([domain, keywords]) => 
            keywords.some(keyword => normalized.includes(keyword))
        )?.[0];

        // Step 1.1: Context Reset Logic (Phase 11)
        const previousDomain = sessionState?.lastDomain || null;
        if (detectedDomain && previousDomain && detectedDomain !== previousDomain) {
            console.log("🧠 CATEGORY_OVERRIDE:", { previousDomain, detectedDomain });
            // The new domain intent overrides previous history
            context = ""; // Clear old RAG context
        }

        // Step 2: Detect Pricing Intent (Phase 11)
        const isCheapestQuery = PRICE_INTENTS.cheapest.some(keyword => userQuery.includes(keyword));
        const isPremiumQuery = PRICE_INTENTS.expensive.some(keyword => userQuery.includes(keyword)) || 
                               normalized.includes("highest price") || 
                               normalized.includes("most expensive");

        // Step 2.1: Detect Trending/Newest Intent (Phase 11)
        const isTrendingQuery = TRENDING_INTENTS.trending.some(keyword => userQuery.includes(keyword));
        const isNewestQuery = TRENDING_INTENTS.newest.some(keyword => userQuery.includes(keyword));
        
        // Step 3: Hard Negative Filters (Phase 11)
        const forbiddenTerms = detectedDomain === 'food' ? ["necklace", "jewellery", "earrings", "bangles", "fashion", "temple jewelry"] : [];

        console.log("🧠 PRICE_INTENT:", isCheapestQuery ? "CHEAPEST" : (isPremiumQuery ? "PREMIUM" : "NONE"));
        console.log("🧠 TRENDING_INTENT:", isTrendingQuery ? "TRENDING" : (isNewestQuery ? "NEWEST" : "NONE"));

        // Fetch User Preferences (Phase 13)
        const userPreferences = await userPreferenceService.getPreferences(sessionId);
        console.log("🧠 USER_PREFERENCES_LOADED:", !!userPreferences);

        const safeText = (val) => typeof val === "string" ? val.toLowerCase() : "";

        // Step 4: Restricted Matching & Boosting (Phase 13)
        let deterministicMatches = allProducts.map(p => {
            const name = safeText(p.name);
            const category = safeText(p.category);
            const description = safeText(p.description);
            const searchableText = `${name} ${category} ${description}`;
            
            let score = 0;
            
            // Hard Domain Locking
            if (detectedDomain === 'food') {
                const isFoodCategory = category.includes("mix") || category.includes("food") || category.includes("health") || category.includes("spice");
                if (!isFoodCategory) return { ...p, score: -1 }; // Hard Lock
                
                // Boost Food Specifics
                if (searchableText.includes("health mix") || searchableText.includes("heritage mix") || searchableText.includes("podi")) score += 10;
            }

            // Negative Filters
            if (forbiddenTerms.some(term => searchableText.includes(term))) {
                return { ...p, score: -1 };
            }

            // Direct Intent Match
            if (cleanedIntent.length > 2 && searchableText.includes(cleanedIntent)) {
                score += 5;
            }

            // Token/Synonym Based Matching
            expandedTokens.forEach(token => {
                if (token.length > 2 && searchableText.includes(token)) {
                    score += 1;
                }
            });

            return { ...p, score };
        })
        .filter(p => p.score > 0);

        // Apply Behavioral Boosting (Phase 13)
        deterministicMatches = userPreferenceService.boostProductScores(deterministicMatches, userPreferences);

        // Deterministic Sorting (Price, Trending, Newest)
        if (isCheapestQuery) {
            console.log("⚖️ [HYBRID] SORTING_BY_LOW_PRICE");
            deterministicMatches.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        } else if (isPremiumQuery) {
            console.log("⚖️ [HYBRID] SORTING_BY_HIGH_PRICE");
            deterministicMatches.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        } else if (isTrendingQuery) {
            console.log("⚖️ [HYBRID] SORTING_BY_TRENDING");
            // Personalized Trending: If trending within preferred category, boost it (handled by boostProductScores above)
            deterministicMatches.sort((a, b) => (b.is_best_seller ? 1 : 0) - (a.is_best_seller ? 1 : 0) || b.score - a.score);
        } else if (isNewestQuery) {
            console.log("⚖️ [HYBRID] SORTING_BY_NEWEST");
            deterministicMatches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.score - a.score);
        } else {
            deterministicMatches.sort((a, b) => b.score - a.score);
        }

        const topMatches = deterministicMatches.slice(0, 3);
        
        console.log("✅ [HYBRID] MATCH_COUNT:", topMatches.length);
        console.log("✅ [HYBRID] FINAL_PRODUCTS:", topMatches.map(p => ({ name: p.name, category: p.category, score: p.score })));

        // Step 5: Smart Conversational Responses (Phase 11)
        if (topMatches.length > 0) {
            console.log("🔗 [HYBRID] RETURNING_COMPARATIVE_RESULTS (Bypassing Gemini)");
            activeRequests--;
            
            // Pick a warm, conversational intro
            const templates = CONVERSATIONAL_TEMPLATES[detectedDomain] || CONVERSATIONAL_TEMPLATES.general;
            const intro = templates[Math.floor(Math.random() * templates.length)];
            
            // Add Lifestyle Framing
            const framing = LIFESTYLE_FRAMING[detectedDomain] || "";

            // Behavioral Intro (Phase 13)
            const behavioralIntro = userPreferenceService.getBehavioralIntro(userPreferences, detectedDomain);
            const finalIntro = behavioralIntro || intro;
            
            // Smart Commerce Suggestions
            let suggestion = "";
            if (detectedDomain === 'gifts' || detectedDomain === 'food') {
                suggestion = "\nYou might also like to explore our curated combos or customer favorites for more options.";
                // Add Cross-Selling Suggestions (Phase 13)
                if (detectedDomain === 'food' && normalized.includes('podi')) suggestion += "\nMany customers also enjoy our traditional dosa mixes and healthy breakfast drinks with these mixes.";
                if (detectedDomain === 'gifts') suggestion += "\nYou can also pair these with our handcrafted eco-friendly products for a complete gifting experience.";
            }

            // Pick a persuasive follow-up
            let followUp = FOLLOW_UP_PHRASES.general;
            if (isCheapestQuery || isPremiumQuery) followUp = FOLLOW_UP_PHRASES.pricing;
            else if (detectedDomain === 'gifts') followUp = FOLLOW_UP_PHRASES.variety;
            else if (detectedDomain === 'food') followUp = FOLLOW_UP_PHRASES.interest;
            
            const productTags = topMatches.map(p => `[PRODUCT:${p.id}]`).join('\n');
            
            // Save state for next turn
            conversationalState.set(sessionId, {
                lastDomain: detectedDomain || previousDomain,
                lastProducts: topMatches.map(p => p.id),
                lastTimestamp: Date.now()
            });

            matchedProductIds = topMatches.map(p => p.id);
            detectedCategory = detectedDomain;

            // Update user preference memory (Phase 13)
            userPreferenceService.updatePreferences(sessionId, {
                preferredCategory: detectedCategory,
                pricingTendency: isCheapestQuery ? 'budget' : (isPremiumQuery ? 'premium' : null),
                exploredProductId: matchedProductIds[0]
            });

            // Log Interaction
            const responseLatency = Date.now() - startTime;
            aiMonitoring.trackLatency(responseLatency);
            chatAnalytics.logInteraction({
                sessionId,
                userQuery: message,
                normalizedIntent: intent,
                detectedCategory: detectedCategory,
                matchedProducts: matchedProductIds,
                responseLatency,
                fallbackUsage: false,
                pricingIntent: isCheapestQuery ? 'cheapest' : (isPremiumQuery ? 'premium' : 'standard'),
                conversationalDomain: detectedDomain
            });

            return res.json({
                reply: `${finalIntro}\n\n${framing}\n\n${productTags}\n${suggestion}\n\n${followUp}`,
                confidence: "HIGH",
                intelligence: { 
                    intent: isCheapestQuery || isPremiumQuery ? 'comparative' : 'deterministic', 
                    success_score: 1.0, 
                    price_sorted: isCheapestQuery || isPremiumQuery,
                    domain: detectedDomain
                }
            });
        }

        // Step 4: Deterministic Category Fallback (Phase 11)
        const isCommerceQuery = queryTokens.some(token => 
            ["mix", "powder", "gift", "kitchen", "spice", "drink", "soap", "oil", "food", "healthy"].includes(token)
        );

        if (isCommerceQuery) {
            console.log("⚠️ [HYBRID] COMMERCE_FALLBACK_TRIGGERED (Bypassing Gemini)");
            activeRequests--;

            chatAnalytics.logFailure({
                sessionId,
                originalQuery: message,
                cleanedIntent,
                detectedDomain: detectedDomain || 'general',
                failureReason: 'zero_matches'
            });

            return res.json({
                reply: "I couldn't find exact matches for those items right now, but I can help you explore our popular collections like Health Mixes, Eco-friendly Gifts, or Handcrafted Jewellery. What would you like to see?",
                confidence: "LOW",
                intelligence: { intent: 'fallback', success_score: 0.5 }
            });
        }

        // 3. Embedding Trace
        let queryEmbedding;
        const embCacheKey = `emb:${normalizeQuery(augmentedQuery)}`;
        if (embeddingCache.has(embCacheKey)) {
            console.log("⚡ [RCA] EMBEDDING_CACHE_HIT");
            queryEmbedding = embeddingCache.get(embCacheKey);
        } else {
            console.log("🔄 [RCA] GENERATING_EMBEDDING...");
            queryEmbedding = await aiProvider.getEmbedding(augmentedQuery);
            console.log("✅ [RCA] EMBEDDING_GENERATED");
            embeddingCache.set(embCacheKey, queryEmbedding);
        }

        // 4. Vector Retrieval Trace
        console.log("📡 [RCA] VECTOR_SEARCH_STARTED");
        const { data: matches, error: matchError } = await supabase.rpc('match_knowledge', {
            query_embedding: queryEmbedding,
            match_threshold: filters.category ? 0.22 : 0.32,
            match_count: 10
        });
        
        if (matchError) {
            console.error("❌ [RCA] VECTOR_SEARCH_FAILURE:", matchError.message);
            throw matchError;
        }
        console.log("✅ [RCA] VECTOR_RESULTS_COUNT:", matches?.length || 0);

        let filteredMatches = matches || [];
        const hasMatches = filteredMatches.length > 0;
        const avgSimilarity = hasMatches 
            ? filteredMatches.reduce((sum, m) => sum + m.similarity, 0) / filteredMatches.length 
            : 0;

        console.log(`📊 [SEMANTIC] ANALYSIS: hasMatches=${hasMatches}, avgSimilarity=${avgSimilarity.toFixed(3)}`);

        if (hasMatches && avgSimilarity > 0.35) {
            const seen = new Set();
            filteredMatches = filteredMatches.map(m => {
                let boost = 0;
                if (filters.category && m.content.includes(filters.category)) boost += 0.12;
                
                // Price Refinement Boost (Phase 11)
                if (priceFilter === 'low') {
                    if (m.content.match(/₹[0-4][0-9]{2}/)) boost += 0.15;
                    if (m.content.match(/price:.*(low|budget|affordable)/i)) boost += 0.1;
                } else if (priceFilter === 'high') {
                    if (m.content.match(/₹[1-9][0-9]{3}/)) boost += 0.15;
                }

                return { ...m, similarity: m.similarity + boost };
            }).filter(m => {
                const id = m.metadata?.product_id;
                if (!id || seen.has(id)) return false;
                seen.add(id); return true;
            }).sort((a, b) => b.similarity - a.similarity);

            const topScore = filteredMatches[0]?.similarity || 0;
            confidenceLevel = topScore > 0.68 ? "HIGH" : (topScore > 0.45 ? "MEDIUM" : "LOW");
            context = filteredMatches.slice(0, 4).map(m => m.content).join("\n\n");
            similarityScores = filteredMatches.map(m => ({ score: m.similarity.toFixed(3) }));

            // Update Conversational Anchor
            const topMatch = filteredMatches[0];
            const detectedCategory = topMatch.metadata?.category || filters.category;
            
            conversationalState.set(sessionId, {
                lastCategory: detectedCategory,
                lastProducts: filteredMatches.slice(0, 3).map(m => m.metadata?.product_id),
                lastQuery: normalized,
                lastTimestamp: Date.now()
            });
            console.log("💾 [SEMANTIC] ANCHOR_UPDATED:", detectedCategory);
        } else {
            console.log("⚠️ [SEMANTIC] SEMANTIC_NO_MATCH_OR_WEAK_RETRIEVAL");
            // Step 8: Emergency Semantic Fallback (Bypass AI if retrieval fails completely)
            activeRequests--;
            return res.json({
                reply: "I couldn't find exact matches, but I can help you explore our similar collections. Are you interested in our healthy mixes, handmade gifts, or traditional jewellery?",
                confidence: "LOW",
                intelligence: { intent: 'fallback', success_score: 0.5 }
            });
        }

        // 5. Provider Execution Trace
        console.log("📝 [RCA] PROMPT_CONSTRUCTED. Intent:", intent);
        let systemPrompt = `You are Thozhi, the warm and helpful AI assistant for Kottravai. 
Kottravai is a brand that celebrates traditional, handmade, and eco-friendly products from Tamil Nadu.

Your personality:
- Warm and welcoming (use "Vanakkam" or "Hi there").
- Culturally rooted but modern.
- Helpful and softly persuasive, like a knowledgeable local shopkeeper.
- Professional but never robotic.

Context for this interaction:
- Intent: ${intent}
- Confidence: ${confidenceLevel}
- Related Products: ${context || "No exact matches in catalog."}
- Last Category Seen: ${sessionState?.lastCategory || "None"}

Guidelines:
1. If products are found, introduce them warmly. Use phrases like "I've picked out some favorites for you" or "You might enjoy these traditional collections."
2. If no exact matches are found, don't just say "No products found." Instead, say "I couldn't find exact matches for those, but I can help you explore our popular collections like Health Mixes or Eco-friendly Gifts."
3. Always frame products in a lifestyle context (e.g., healthy breakfast, thoughtful gifting, authentic homemade taste).
4. Keep responses concise and focused on helping the user discover products.
5. Use [PRODUCT:id] tags for any products you mention from the context.`;
        
        console.log("📡 [RCA] CALLING_PROVIDER...");
        const result = await aiProvider.generateContent(systemPrompt, message, history.slice(-8));
        console.log("✅ [RCA] PROVIDER_RESPONSE_RECEIVED. Provider:", result.provider);

        const responseText = result.text;
        let finalReply = responseText;

        // Ensure Product Visibility (Phase 11)
        if (deterministicMatches.length > 0 && !responseText.includes('[PRODUCT:')) {
            console.log("🔗 [HYBRID] INJECTING_DETERMINISTIC_TAGS");
            const tags = deterministicMatches.map(p => `[PRODUCT:${p.id}]`).join('\n');
            finalReply = `${responseText}\n\nHere are some related products you might like:\n${tags}`;
        }

        const response = { 
            reply: finalReply, 
            confidence: confidenceLevel, 
            intelligence: { intent, success_score: 1.0 } 
        };
        
        console.log("🏁 [RCA] FINAL_RESPONSE_SENT");
        const responseLatency = Date.now() - startTime;
        aiMonitoring.trackLatency(responseLatency);
        
        chatAnalytics.logInteraction({
            sessionId,
            userQuery: message,
            normalizedIntent: intent,
            detectedCategory: sessionState?.lastCategory,
            matchedProducts: matchedProductIds,
            responseLatency,
            fallbackUsage,
            pricingIntent: 'standard',
            conversationalDomain: sessionState?.lastDomain
        });

        res.json(response);

    } catch (err) {
        activeRequests--;
        console.error("💥 [RCA] CHAT_RUNTIME_CRASH");
        console.error("MESSAGE:", err.message);
        console.error("STACK:", err.stack);
        console.error("RAW_ERROR:", err);

        res.status(500).json({ 
            reply: "I'm having a little trouble right now. Please try again or refine your question." 
        });
    }
});

// ─── Escalation Routes ────────────────────────────────────────────────────────

// POST /api/chat/escalate – customer triggers a live support handover
router.post('/escalate', async (req, res) => {
    const { sessionId = 'anonymous', customerName, customerEmail, customerPhone, contactRaw, reason, history = [] } = req.body;
    console.log(`🆘 [ESCALATION] New escalation request | session=${sessionId} | contact=${contactRaw || customerEmail || customerPhone || 'none'}`);

    try {
        const result = await db.query(
            `INSERT INTO chat_escalations (session_id, customer_name, customer_email, customer_phone, contact_raw, reason, history, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'open') RETURNING id`,
            [
                sessionId,
                customerName || 'Anonymous',
                customerEmail || null,
                customerPhone || null,
                contactRaw || customerEmail || customerPhone || null,
                reason || 'Customer requested support',
                JSON.stringify(history)
            ]
        );
        const escalationId = result.rows[0].id;
        console.log(`✅ [ESCALATION] Saved as #${escalationId} | contact=${contactRaw}`);

        // Clear existing session state so AI doesn't intercept follow-up messages as quiz/tracking
        conversationalState.delete(sessionId);

        const contactLine = contactRaw ? ` We have your contact: **${contactRaw}**.` : '';
        return res.json({
            success: true,
            escalationId,
            reply: `Your request has been received! 🙏 A Kottravai support member will be with you shortly.${contactLine} Your ticket number is **#${escalationId}**.\n\nYou can also reach us directly on WhatsApp at **+91 88078 29183**.`,
            confidence: 'HIGH'
        });
    } catch (err) {
        console.error('❌ [ESCALATION] DB insert failed:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to save escalation request.' });
    }
});

// GET /api/chat/admin/escalations – admin fetches all open/recent escalations
router.get('/admin/escalations', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    const validSecrets = [
        process.env.VITE_ADMIN_PASSWORD,
        process.env.ADMIN_PASSWORD,
        'Admin!Kottravai2025%100',
        'Admin!Kottravai2025%100e'
    ].filter(Boolean);

    if (!adminSecret || !validSecrets.includes(adminSecret)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const result = await db.query(
            `SELECT id, session_id, customer_name, customer_email, customer_phone, contact_raw, reason, status, agent_notes, created_at, resolved_at
             FROM chat_escalations
             ORDER BY created_at DESC
             LIMIT 100`
        );
        return res.json({ success: true, escalations: result.rows });
    } catch (err) {
        console.error('❌ [ESCALATION] Fetch failed:', err.message);
        return res.status(500).json({ error: 'Failed to fetch escalations.' });
    }
});

// GET /api/chat/admin/escalations/:id – admin fetches full conversation history
router.get('/admin/escalations/:id', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    const validSecrets = [
        process.env.VITE_ADMIN_PASSWORD,
        process.env.ADMIN_PASSWORD,
        'Admin!Kottravai2025%100',
        'Admin!Kottravai2025%100e'
    ].filter(Boolean);

    if (!adminSecret || !validSecrets.includes(adminSecret)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const result = await db.query(
            `SELECT * FROM chat_escalations WHERE id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Escalation not found' });
        return res.json({ success: true, escalation: result.rows[0] });
    } catch (err) {
        console.error('❌ [ESCALATION] Single fetch failed:', err.message);
        return res.status(500).json({ error: 'Failed to fetch escalation.' });
    }
});

// PATCH /api/chat/admin/escalations/:id/resolve – agent marks a ticket as resolved
router.patch('/admin/escalations/:id/resolve', async (req, res) => {
    const adminSecret = req.headers['x-admin-secret'];
    const validSecrets = [
        process.env.VITE_ADMIN_PASSWORD,
        process.env.ADMIN_PASSWORD,
        'Admin!Kottravai2025%100',
        'Admin!Kottravai2025%100e'
    ].filter(Boolean);

    if (!adminSecret || !validSecrets.includes(adminSecret)) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { agentNotes } = req.body;
    try {
        await db.query(
            `UPDATE chat_escalations SET status = 'resolved', agent_notes = $1, resolved_at = NOW() WHERE id = $2`,
            [agentNotes || '', req.params.id]
        );
        return res.json({ success: true });
    } catch (err) {
        console.error('❌ [ESCALATION] Resolve failed:', err.message);
        return res.status(500).json({ error: 'Failed to resolve escalation.' });
    }
});

module.exports = router;
/**
 * Thozhi AI - Centralized API Configuration (Phase 8 Standard)
 * Ensures consistent endpoint construction and defensive normalization.
 */

// Defensive URL normalization to prevent double slashes and malformed paths
export const normalizeUrl = (url: string) => {
    return url.replace(/([^:]\/)\/+/g, "$1");
};

let rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "http://localhost:5000");

export const API_BASE = rawApiUrl.replace(/\/api$/, "");

// Standardized Enterprise API Endpoints
export const API_ENDPOINTS = {
    chat: normalizeUrl(`${API_BASE}/api/chat`),
    chatEscalate: normalizeUrl(`${API_BASE}/api/chat/escalate`),
    chatAdminEscalations: normalizeUrl(`${API_BASE}/api/chat/admin/escalations`),
    products: normalizeUrl(`${API_BASE}/api/products`),
    search: normalizeUrl(`${API_BASE}/api/search`),
    orders: normalizeUrl(`${API_BASE}/api/orders`),
    auth: normalizeUrl(`${API_BASE}/api/auth`),
    analytics: normalizeUrl(`${API_BASE}/api/ai-analytics/metrics`), // Standardized in Phase 8
    health: normalizeUrl(`${API_BASE}/api/health`),
    affiliate: normalizeUrl(`${API_BASE}/api/affiliate`),
    location: normalizeUrl(`${API_BASE}/api/location`),
    contact: normalizeUrl(`${API_BASE}/api/contact`),
    leadCapture: normalizeUrl(`${API_BASE}/api/leads/capture`),
    reviews: normalizeUrl(`${API_BASE}/api/reviews`),
    razorpay: normalizeUrl(`${API_BASE}/api/razorpay`),
    customRequest: normalizeUrl(`${API_BASE}/api/custom-request`),
    wishlist: normalizeUrl(`${API_BASE}/api/wishlist`),
    recentSales: normalizeUrl(`${API_BASE}/api/public/recent-sales`),
    storage: normalizeUrl(`${API_BASE}/api/storage`),
};

// Runtime Validation
console.log("🛡️ [API_CONFIG] Origin:", API_BASE);
console.log("📡 [API_CONFIG] Chat Endpoint:", API_ENDPOINTS.chat);

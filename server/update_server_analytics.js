const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'server/index.js');
let code = fs.readFileSync(filePath, 'utf8');

const sendAnalyticsFunc = `
// ==========================================
// SERVER-SIDE ANALYTICS SYNC
// ==========================================
const sendPurchaseAnalytics = async (orderRow) => {
    try {
        const analyticsUrl = process.env.VITE_ANALYTICS_URL || process.env.VITE_KOTTRAVAI_ANALYTICS_URL;
        if (!analyticsUrl) {
            console.warn("?O [ANALYTICS] Missing Analytics URL in environment variables");
            return;
        }

        const payload = {
            timestamp: orderRow.created_at,
            event_type: "purchase_completed",
            order_id: String(orderRow.id),
            order_total: orderRow.total,
            payment_id: orderRow.payment_id || "",
            payment_method: "Razorpay", // Extracted dynamically if needed, but Razorpay is the primary gateway
            visitor_id: orderRow.customer_id || "guest",
            session_id: orderRow.payment_id || orderRow.order_id || "", // Fallbacks for correlation
            page_url: "https://www.kottravai.in/checkout"
        };

        const response = await fetch(analyticsUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        console.log("o. [ANALYTICS_SYNC] Successfully sent order", orderRow.id, result);
    } catch (e) {
        console.error("?O [ANALYTICS_SYNC_ERROR] Failed to send order", orderRow.id, e.message);
    }
};
`;

if (!code.includes('sendPurchaseAnalytics')) {
    // Insert function before finalizeOrder
    code = code.replace('const finalizeOrder = async (orderData, paymentId) => {', sendAnalyticsFunc + '\nconst finalizeOrder = async (orderData, paymentId) => {');
}

// Now insert the call in webhook
const webhookHook = `const result = await finalizeOrder(finalOrderData, paymentId);`;
if (code.includes(webhookHook)) {
    code = code.replace(
        webhookHook,
        `const result = await finalizeOrder(finalOrderData, paymentId);
            
            // Trigger server-side analytics idempotently
            if (result && result.order && !result.alreadyProcessed) {
                await sendPurchaseAnalytics(result.order);
            }`
    );
}

fs.writeFileSync(filePath, code);
console.log("server/index.js updated successfully.");

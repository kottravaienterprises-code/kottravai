require('dotenv').config({path: __dirname + '/.env'});
const { Pool } = require('pg');
const { google } = require('googleapis');

const pool = new Pool({
    connectionString: process.env.VITE_SUPABASE_DB_URL || process.env.DATABASE_URL
});

const MASTER_COLUMNS = [
  "timestamp", "event_type", "page", "page_title", "landing_page", 
  "traffic_source", "session_id", "visitor_id", "user_id", "is_logged_in",
  "browser", "device", "screen_size", "referrer", "page_url", 
  "ip_address", "geo_country", "geo_state", "geo_city",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "first_utm_source", "first_utm_medium", "first_utm_campaign", "first_utm_content", "first_utm_term",
  "session_utm_source", "session_utm_medium", "session_utm_campaign", "session_utm_content", "session_utm_term",
  "gclid", "fbclid",
  "product_id", "sku", "product_name", "category", "price", "quantity", "stock_status",
  "order_id", "order_total", "payment_method", "payment_id", "products_array", "coupon_code", "discount_applied", "shipping_cost", "taxes",
  "cart_total_value", "duration_seconds"
];

async function run() {
    console.log("=== STARTING HISTORICAL ORDER SYNC ===");
    
    // 1. Query PostgreSQL
    const res = await pool.query("SELECT id, customer_id, payment_id, total, created_at, status FROM orders WHERE status != 'Cancelled' AND status != 'Refunded'");
    const pgOrders = res.rows;
    console.log(`[PG] Found ${pgOrders.length} valid production orders in database.`);

    // 2. Auth with Google Sheets
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // 3. Read MASTER_EVENT_LOG_V2
    const sheetName = "MASTER_EVENT_LOG_V2";
    let rows = [];
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A:AZ`, 
        });
        rows = response.data.values || [];
    } catch (e) {
        console.error("[SHEETS] Failed to fetch master event log.", e.message);
        process.exit(1);
    }

    const eventTypeIdx = MASTER_COLUMNS.indexOf('event_type');
    const orderIdIdx = MASTER_COLUMNS.indexOf('order_id');

    // 4. Collect existing purchase_completed order IDs
    const existingOrderIds = new Set();
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        const evtIdx = row.length > 25 ? eventTypeIdx : 12; 
        const oidIdx = row.length > 25 ? orderIdIdx : -1;
        
        let evt = String(row[evtIdx] || '').trim().toLowerCase();
        
        if (evt !== 'purchase_completed' && evt !== 'purchase_complete') {
            for (let j=0; j<row.length; j++) {
                if (String(row[j]).toLowerCase() === 'purchase_completed' || String(row[j]).toLowerCase() === 'purchase_complete') {
                    evt = 'purchase_completed';
                    break;
                }
            }
        }

        if (evt === 'purchase_completed') {
            let oid = '';
            if (oidIdx !== -1 && row[oidIdx]) oid = String(row[oidIdx]).trim();
            else {
                for (let j=0; j<row.length; j++) {
                    const cell = String(row[j]).trim();
                    if (pgOrders.some(po => String(po.id) === cell)) {
                        oid = cell;
                        break;
                    }
                }
            }
            if (oid) existingOrderIds.add(oid);
        }
    }

    console.log(`[SHEETS] Found ${existingOrderIds.size} existing purchase_completed orders in GAS.`);

    // 5. Find missing orders
    const missingOrders = pgOrders.filter(o => !existingOrderIds.has(String(o.id)));
    console.log(`[SYNC] Identifying ${missingOrders.length} missing orders to sync.`);

    // 6. Push missing orders via Google Sheets API
    if (missingOrders.length > 0) {
        const valuesToAppend = missingOrders.map(order => {
            const payload = {
                timestamp: order.created_at,
                event_type: "purchase_completed",
                order_id: String(order.id),
                order_total: order.total,
                payment_id: order.payment_id || "",
                payment_method: "Razorpay",
                visitor_id: order.customer_id || "guest",
                session_id: order.payment_id || order.id || "",
                page_url: "https://www.kottravai.in/checkout"
            };

            const row = new Array(54).fill("");
            MASTER_COLUMNS.forEach((col, idx) => {
                if (payload[col] !== undefined) {
                    row[idx] = payload[col];
                }
            });
            return row;
        });

        try {
            await sheets.spreadsheets.values.append({
                spreadsheetId: sheetId,
                range: `${sheetName}!A:AZ`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: valuesToAppend
                }
            });
            console.log(`[SYNC] Successfully inserted ${missingOrders.length} orders into Sheets.`);
        } catch (err) {
            console.error(`[SYNC] Failed to append to Sheets:`, err.message);
        }
    } else {
        console.log(`[SYNC] No missing orders to append.`);
    }

    console.log(`\n=== SYNC COMPLETE ===`);
    console.log(`Successfully synced ${missingOrders.length} missing orders.`);
    pool.end();
}

run();

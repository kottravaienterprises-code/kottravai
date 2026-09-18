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
    console.log("Fetching data for reconciliation...\n");
    
    // 1. Query PostgreSQL
    const res = await pool.query("SELECT id, total FROM orders WHERE status != 'Cancelled' AND status != 'Refunded'");
    const pgOrders = res.rows;
    
    let pgTotalOrders = pgOrders.length;
    let pgTotalRevenue = 0;
    const pgOrderIds = new Set();
    
    pgOrders.forEach(o => {
        pgTotalRevenue += parseFloat(o.total || 0);
        pgOrderIds.add(String(o.id));
    });

    // 2. Auth with Google Sheets
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    let rows = [];
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `MASTER_EVENT_LOG_V2!A:AZ`, 
        });
        rows = response.data.values || [];
    } catch (e) {
        console.error("[SHEETS] Failed to fetch master event log.", e.message);
        process.exit(1);
    }

    const eventTypeIdx = MASTER_COLUMNS.indexOf('event_type');
    const orderIdIdx = MASTER_COLUMNS.indexOf('order_id');
    const orderTotalIdx = MASTER_COLUMNS.indexOf('order_total');
    const pageIdx = MASTER_COLUMNS.indexOf('page_url');

    let gasTotalOrders = 0;
    let gasTotalRevenue = 0;
    const gasOrderIds = new Set();
    const gasDuplicateOrderIds = new Set();
    const gasInvalidOrders = [];
    
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        let evtIdx = row.length > 25 ? eventTypeIdx : 12;
        let oidIdx = row.length > 25 ? orderIdIdx : -1;
        let totalIdx = row.length > 25 ? orderTotalIdx : -1;
        let pIdx = row.length > 25 ? pageIdx : 13;

        let evt = String(row[evtIdx] || '').trim().toLowerCase();
        if (evt !== 'purchase_completed' && evt !== 'purchase_complete') {
            for (let j=0; j<row.length; j++) {
                if (String(row[j]).toLowerCase() === 'purchase_completed' || String(row[j]).toLowerCase() === 'purchase_complete') {
                    evt = 'purchase_completed';
                    break;
                }
            }
        }
        
        let url = String(row[pIdx] || '').toLowerCase();
        // If we couldn't find URL securely, just check all columns for localhost to be safe
        if (!url) {
            for(let j=0; j<row.length; j++) {
                if(String(row[j]).includes('localhost') || String(row[j]).includes('127.0.0.1')) {
                    url = 'localhost';
                    break;
                }
            }
        }
        const isProduction = !url.includes('localhost') && !url.includes('127.0.0.1');
        
        if (evt === 'purchase_completed' && isProduction) {
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

            if (!oid) {
                gasInvalidOrders.push(`Row ${i+1}: Missing order_id`);
                continue;
            }
            
            if (gasOrderIds.has(oid)) {
                gasDuplicateOrderIds.add(oid);
            } else {
                gasOrderIds.add(oid);
                gasTotalOrders++;
                
                let rawRev = '';
                if (totalIdx !== -1 && row[totalIdx]) rawRev = row[totalIdx];
                else {
                    // search row for a matching total from DB
                    const matchedDbOrder = pgOrders.find(po => String(po.id) === oid);
                    if (matchedDbOrder) {
                        for (let j=0; j<row.length; j++) {
                            if (String(row[j]).trim() === String(matchedDbOrder.total)) {
                                rawRev = row[j];
                                break;
                            }
                        }
                    }
                }

                if (rawRev !== undefined && rawRev !== null && rawRev !== "") {
                    const rev = parseFloat(rawRev);
                    if (!isNaN(rev) && rev >= 0) {
                        gasTotalRevenue += rev;
                    } else {
                        gasInvalidOrders.push(`Row ${i+1}: Invalid order_total '${rawRev}' for order ${oid}`);
                    }
                } else {
                    gasInvalidOrders.push(`Row ${i+1}: Missing order_total for order ${oid}`);
                }
            }
        }
    }
    
    const missingOrderIds = [...pgOrderIds].filter(x => !gasOrderIds.has(x));

    console.log("=== ORDER RECONCILIATION ===\n");
    
    console.log("PostgreSQL:");
    console.log(`Total Orders: ${pgTotalOrders}`);
    console.log(`Total Revenue: ₹${pgTotalRevenue.toFixed(2)}\n`);
    
    console.log("MASTER_EVENT_LOG_V2:");
    console.log(`Total Orders: ${gasTotalOrders}`);
    console.log(`Total Revenue: ₹${gasTotalRevenue.toFixed(2)}\n`);
    
    console.log(`Order Count Difference: ${pgTotalOrders - gasTotalOrders}`);
    console.log(`Revenue Difference: ₹${(pgTotalRevenue - gasTotalRevenue).toFixed(2)}\n`);
    
    console.log("Missing Order IDs:");
    console.log(missingOrderIds.length > 0 ? missingOrderIds.join(", ") : "None");
    
    console.log("\nDuplicate Order IDs:");
    console.log(gasDuplicateOrderIds.size > 0 ? [...gasDuplicateOrderIds].join(", ") : "None");
    
    console.log("\nInvalid Analytics Orders:");
    console.log(gasInvalidOrders.length > 0 ? gasInvalidOrders.join("\n") : "None");
    
    console.log("\nStatus:");
    const orderMatch = pgTotalOrders === gasTotalOrders;
    const revMatch = Math.abs(pgTotalRevenue - gasTotalRevenue) < 0.01;
    if (orderMatch && revMatch && missingOrderIds.length === 0 && gasDuplicateOrderIds.size === 0) {
        console.log("MATCH");
    } else {
        console.log("MISMATCH");
    }
    
    console.log("=============================");

    pool.end();
}

run();

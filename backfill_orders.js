require('dotenv').config({path:'./server/.env'});
const { Pool } = require('pg');
const googleSheetsService = require('./server/services/googleSheetsService.js');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function backfillOrders() {
    try {
        console.log("Fetching historical orders from DB...");
        // Get all orders that are before June 18th (when telemetry started)
        const res = await pool.query("SELECT * FROM orders WHERE created_at < '2026-06-18' ORDER BY created_at ASC");
        
        const historicalOrders = res.rows;
        console.log(`Found ${historicalOrders.length} historical orders to backfill.`);
        
        if (historicalOrders.length === 0) {
            console.log("No historical orders found.");
            return;
        }

        const payloads = historicalOrders.map(order => {
            return {
                timestamp: new Date(order.created_at).toISOString(),
                event_type: 'purchase',
                page: '/checkout/success',
                session_id: 'historical_session_' + order.id,
                visitor_id: order.customer_email || 'historical_visitor_' + order.id,
                order_id: order.id,
                order_total: order.total,
                geo_city: order.city || '',
                geo_state: order.state || '',
                geo_country: order.country || 'India',
                ip_address: '127.0.0.1',
                user_agent: 'Historical Backfill System',
                browser: 'Unknown',
                device: 'Unknown'
            };
        });

        console.log("Injecting into Google Sheets Raw Events...");
        await googleSheetsService.appendEventRows(payloads);
        
        console.log("Backfill complete!");
        
    } catch (e) {
        console.error("Error backfilling:", e);
    } finally {
        pool.end();
    }
}

backfillOrders();

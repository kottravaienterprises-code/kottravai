require('dotenv').config({path: '../.env'});
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.VITE_SUPABASE_DB_URL || process.env.DATABASE_URL
});

async function run() {
    try {
        const res = await pool.query("SELECT COUNT(*) as cnt, SUM(total) as total_rev FROM orders WHERE status != 'Cancelled' AND status != 'Refunded'");
        console.log('=== ORDER SOURCE RECONCILIATION ===');
        console.log('Total Orders:', res.rows[0].cnt);
        console.log('Total Revenue:', res.rows[0].total_rev);
        
        // Also fetch all valid orders to write them to the Google Sheet (MASTER_EVENT_LOG_V2) in the next steps
        const allRes = await pool.query("SELECT id, customer_email, total, created_at FROM orders WHERE status != 'Cancelled' AND status != 'Refunded'");
        console.log(`Found ${allRes.rowCount} valid orders.`);
    } catch(e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
run();

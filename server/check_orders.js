const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres.itqdnbwbbhyaapquxlqs:Kottravai%40123@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres"
});

async function run() {
    try {
        const res = await pool.query("SELECT COUNT(*) as cnt, SUM(total) as total_rev FROM orders WHERE status != 'Cancelled' AND status != 'Refunded'");
        console.log('=== ORDER RECONCILIATION ===');
        console.log('Source Total Orders:', res.rows[0].cnt);
        console.log('Source Total Revenue:', res.rows[0].total_rev);
        
        const allRes = await pool.query("SELECT id, customer_name, customer_email, total, created_at, status FROM orders WHERE status != 'Cancelled' AND status != 'Refunded'");
        console.log(`\nFound ${allRes.rowCount} valid orders in database.`);
    } catch(e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
run();

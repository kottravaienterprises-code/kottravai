const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const o = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'");
        console.log('orders columns:', o.rows.map(r=>r.column_name));
        
        const orders = await pool.query("SELECT * FROM orders WHERE customer_email ILIKE '%praveenrajasekaran%' OR order_id = 'order_TV8A0C2fudq1zL'");
        console.log('Orders found:', JSON.stringify(orders.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();

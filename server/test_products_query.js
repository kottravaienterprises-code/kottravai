const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    try {
        const queryText = `SELECT p.id, COALESCE(sales_aggregation.sales_count, 0) AS "salesCount", COALESCE(sales_aggregation.revenue, 0) AS "salesRevenue" 
                           FROM products p 
                           LEFT JOIN (
                               SELECT (item->>'id')::uuid AS product_id, 
                                      SUM((item->>'quantity')::integer) AS sales_count, 
                                      SUM((item->>'price')::numeric * (item->>'quantity')::numeric) AS revenue 
                               FROM orders, jsonb_array_elements(items) AS item 
                               WHERE status IN ('Processing', 'Delivered') 
                               GROUP BY (item->>'id')::uuid
                           ) sales_aggregation ON p.id = sales_aggregation.product_id;`;
        const res = await pool.query(queryText);
        console.log('Query OK. Total rows:', res.rows.length);
    } catch (e) {
        console.error('Query Error:', e);
    } finally {
        pool.end();
    }
}
check();

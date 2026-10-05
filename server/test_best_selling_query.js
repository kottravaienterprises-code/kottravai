const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testQuery() {
    try {
        const queryText = `SELECT p.id, p.name, p.category_slug, COALESCE(sales_aggregation.sales_count, 0) AS "salesCount"
            FROM products p 
            LEFT JOIN (
                SELECT 
                    (item->>'id')::uuid AS product_id, 
                    SUM((item->>'quantity')::integer) AS sales_count
                FROM orders, jsonb_array_elements(items) AS item
                WHERE status IN ('Processing', 'Delivered')
                GROUP BY (item->>'id')::uuid
            ) sales_aggregation ON p.id = sales_aggregation.product_id 
            WHERE p.is_live = TRUE AND p.category_slug = 'coconut-shell-products' 
            ORDER BY "salesCount" DESC, p.created_at DESC
            LIMIT 10`;

        const result = await pool.query(queryText);
        console.log("=== TOP 10 BEST SELLING COCONUT SHELL PRODUCTS ===");
        result.rows.forEach(r => {
            console.log(`[Sales: ${r.salesCount}] ${r.name}`);
        });

    } catch (e) {
        console.error("SQL ERROR:", e);
    } finally {
        pool.end();
    }
}
testQuery();

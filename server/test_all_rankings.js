const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runQuery(category_slug, name) {
    let queryText = `
        SELECT 
            p.id,
            p.name,
            p.category_slug,
            COALESCE(sales_aggregation.sales_count, 0) AS units_sold,
            COALESCE(sales_aggregation.revenue, 0) AS total_revenue
        FROM products p
        LEFT JOIN (
            SELECT 
                (item->>'id')::uuid AS product_id,
                SUM((item->>'quantity')::integer) AS sales_count,
                SUM((item->>'price')::numeric * (item->>'quantity')::numeric) AS revenue
            FROM 
                orders, 
                jsonb_array_elements(items) AS item
            WHERE 
                status IN ('Processing', 'Delivered')
            GROUP BY 
                (item->>'id')::uuid
        ) sales_aggregation ON p.id = sales_aggregation.product_id
        WHERE p.is_live = TRUE
    `;
    
    if (category_slug) {
        queryText += ` AND p.category_slug = '${category_slug}'`;
    }

    queryText += ` ORDER BY units_sold DESC, total_revenue DESC, p.created_at DESC LIMIT 10`;

    const res = await pool.query(queryText);
    console.log(`\n--- ${name} Best Selling Top 10 ---`);
    console.table(res.rows.map(r => ({ Name: r.name.substring(0, 40) + '...', Category: r.category_slug, UnitsSold: r.units_sold })));
    
    return res.rows;
}

async function main() {
  try {
    await runQuery('daily-wear', "Daily Wear");
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

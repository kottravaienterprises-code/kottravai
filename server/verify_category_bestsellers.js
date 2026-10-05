const { Pool } = require('pg');
const axios = require('axios');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    console.log("--- 1. Direct SQL Validation for Coconut Shell Products ---");
    const sqlQuery = `
      SELECT 
          p.id,
          p.name,
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
      WHERE p.category_slug = 'coconut-shell-products'
      ORDER BY units_sold DESC, total_revenue DESC, p.created_at DESC
      LIMIT 10;
    `;
    
    const sqlRes = await pool.query(sqlQuery);
    console.table(sqlRes.rows);

    console.log("\n--- 2. Checking if any non-coconut products leaked ---");
    const leaks = sqlRes.rows.filter(r => 
      ['Karuveppillai Idli Podi', 'Shaktimaan Health Mix', 'Varagu Dosa Mix', 'Thinai Dosa Mix'].some(name => r.name.includes(name))
    );
    if (leaks.length > 0) {
      console.log("WARNING: Found non-coconut products:", leaks);
    } else {
      console.log("SUCCESS: No food products found in the coconut shell products query.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

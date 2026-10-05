const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    // 1. Query status counts
    console.log("--- 1. Order Status Counts ---");
    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status
      ORDER BY count DESC
    `);
    console.table(statusCounts.rows);

    // 2. Check for payment_status field
    console.log("\n--- 2. Checking columns in orders table ---");
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    const hasPaymentStatus = columns.rows.some(r => r.column_name === 'payment_status');
    console.log(`payment_status field exists: ${hasPaymentStatus}`);
    
    if (hasPaymentStatus) {
      const paymentStatusCounts = await pool.query(`
        SELECT status, payment_status, COUNT(*) as count 
        FROM orders 
        GROUP BY status, payment_status
        ORDER BY count DESC
      `);
      console.table(paymentStatusCounts.rows);
    }

    // 3. Inspect a real order to check JSONB structure
    console.log("\n--- 3. Inspecting a Real Order ---");
    const order = await pool.query(`
      SELECT id, status, items 
      FROM orders 
      WHERE status NOT IN ('Pending', 'Cancelled', 'Failed') 
      LIMIT 1
    `);
    if (order.rows.length > 0) {
      console.log(`Order ID: ${order.rows[0].id}, Status: ${order.rows[0].status}`);
      const items = order.rows[0].items;
      console.log("Items array:");
      console.log(JSON.stringify(items, null, 2));
      
      if (items && items.length > 0) {
        const item = items[0];
        console.log(`\nSample Item Fields:`);
        console.log(`- id: ${item.id} (${typeof item.id})`);
        console.log(`- quantity: ${item.quantity} (${typeof item.quantity})`);
        console.log(`- price: ${item.price} (${typeof item.price})`);
        
        // 4. Verify item.id maps to products.id
        console.log("\n--- 4. Verifying item.id mapping to products ---");
        const product = await pool.query(`
          SELECT id, name FROM products WHERE id = $1
        `, [item.id]);
        if (product.rows.length > 0) {
          console.log(`SUCCESS: Found product '${product.rows[0].name}' for id ${item.id}`);
        } else {
          console.log(`FAILURE: Could not find product with id ${item.id}`);
        }
      }
    }

    // 5. Test Aggregation Query
    console.log("\n--- 5. Testing Aggregation Query (Top 10) ---");
    const topSales = await pool.query(`
      SELECT 
          (item->>'id')::uuid AS product_id,
          MAX(p.name) as name,
          SUM((item->>'quantity')::integer) AS total_units_sold,
          SUM((item->>'price')::numeric * (item->>'quantity')::numeric) AS total_revenue
      FROM 
          orders, 
          jsonb_array_elements(items) AS item
      LEFT JOIN products p ON p.id = (item->>'id')::uuid
      WHERE 
          status NOT IN ('Pending', 'Cancelled', 'Failed') -- Adjust statuses if needed
      GROUP BY 
          (item->>'id')::uuid
      ORDER BY 
          total_units_sold DESC, total_revenue DESC
      LIMIT 10
    `);
    console.table(topSales.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query("SELECT status, items FROM orders WHERE status != 'Pending' LIMIT 5");
    console.log(JSON.stringify(res.rows, null, 2));
    
    // Also get all distinct statuses
    const statusRes = await pool.query("SELECT DISTINCT status FROM orders");
    console.log("All statuses:", statusRes.rows.map(r => r.status));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

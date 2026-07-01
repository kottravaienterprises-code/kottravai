const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const res = await pool.query(`SELECT email FROM auth.users WHERE raw_user_meta_data->>'mobile' = '6379564148' OR phone = '+916379564148'`);
    console.log('Result:', res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();

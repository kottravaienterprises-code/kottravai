const { Client } = require('pg');
require('dotenv').config({ path: 'server/.env' });
const db = new Client({ connectionString: String(process.env.DATABASE_URL) });

async function check() {
  await db.connect();
  const res = await db.query(`SELECT id, email, phone FROM auth.users WHERE email = 'test_e2e_user5@example.com'`);
  console.log(res.rows);
  await db.end();
}
check();

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });
const db = require('./server/db');

(async () => {
  try {
    const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='products'");
    console.log('columns:', res.rows.map(r => r.column_name).sort());
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

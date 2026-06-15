require('dotenv').config();
const db = require('./server/db');
const fs = require('fs');

async function runMigration() {
  const sql = fs.readFileSync('./server/migrations/20260618_phase6c_revenue_schema.sql', 'utf8');
  try {
    await db.query(sql);
    console.log('✅ Phase 6C migration executed successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

runMigration();

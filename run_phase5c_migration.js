const fs = require('fs');
const db = require('./server/db');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/migrations/20260615_phase5c_bi_schema.sql', 'utf8');
    console.log('Running Phase 5C migration...');
    await db.query(sql);
    console.log('Phase 5C migration completed successfully.');
  } catch (err) {
    console.error('Phase 5C migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();

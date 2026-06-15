const fs = require('fs');
const db = require('./server/db');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/migrations/20260616_phase6a_cs_schema.sql', 'utf8');
    console.log('Running Phase 6A migration...');
    await db.query(sql);
    console.log('Phase 6A migration completed successfully.');
  } catch (err) {
    console.error('Phase 6A migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();

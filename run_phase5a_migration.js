const fs = require('fs');
const db = require('./server/db');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/migrations/20260613_phase5a_revops_schema.sql', 'utf8');
    console.log('Running Phase 5A migration...');
    await db.query(sql);
    console.log('Phase 5A migration completed successfully.');
  } catch (err) {
    console.error('Phase 5A migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();

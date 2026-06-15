const fs = require('fs');
const db = require('./server/db');

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/migrations/20260614_phase5b_security_schema.sql', 'utf8');
    console.log('Running Phase 5B migration...');
    await db.query(sql);
    console.log('Phase 5B migration completed successfully.');
  } catch (err) {
    console.error('Phase 5B migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();

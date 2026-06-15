const fs = require('fs');
const db = require('./server/db'); // Uses pg Pool

async function runMigration() {
  try {
    const sql = fs.readFileSync('./server/migrations/20260612_pipeline_triggers.sql', 'utf8');
    console.log('Running migration...');
    await db.query(sql);
    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

runMigration();

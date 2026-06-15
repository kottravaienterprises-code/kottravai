const fs = require('fs');
const path = require('path');
const db = require('./server/db');

async function runMigration() {
  console.log('Starting Phase 6B Migration...');
  try {
    const sqlPath = path.join(__dirname, 'server', 'migrations', '20260617_phase6b_retention_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await db.query(sql);
    console.log('✅ Phase 6B Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

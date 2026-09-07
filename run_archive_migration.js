const pool = require('./server/db');
const fs = require('fs');

async function runMigration() {
    try {
        const sql = fs.readFileSync('./server/db_migrations/analytics_archive_manifest.sql', 'utf8');
        await pool.query(sql);
        console.log('Successfully created analytics_archive_manifest table.');
        process.exit(0);
    } catch (e) {
        console.error('Error running migration:', e);
        process.exit(1);
    }
}
runMigration();

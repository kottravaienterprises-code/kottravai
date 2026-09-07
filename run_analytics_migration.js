const db = require('./server/db');
const fs = require('fs');
async function run() {
    try {
        const sql = fs.readFileSync('./server/db_migrations/analytics_enhancements.sql', 'utf8');
        await db.query(sql);
        console.log('Migration successful.');
    } catch(e) {
        console.error('Migration failed:', e.message);
    }
    process.exit(0);
}
run();

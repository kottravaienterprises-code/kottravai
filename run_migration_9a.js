const fs = require('fs');
const db = require('./server/db');

async function run() {
    try {
        const sql = fs.readFileSync('server/migrations/20260625_phase9a_ekg_pgvector.sql', 'utf8');
        await db.query(sql);
        console.log("Migration 9A applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}
run();

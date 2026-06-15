const fs = require('fs');
const db = require('./server/db');

async function run() {
    try {
        const sql = fs.readFileSync('server/migrations/20260620_phase8b_api_webhooks_schema.sql', 'utf8');
        await db.query(sql);
        console.log("Migration 8B applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}
run();

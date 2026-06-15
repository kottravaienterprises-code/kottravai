const fs = require('fs');
const db = require('./server/db');

async function run() {
    try {
        const sql = fs.readFileSync('server/migrations/20260630_phase9b_agent_telemetry.sql', 'utf8');
        await db.query(sql);
        console.log("Migration 9B applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}
run();

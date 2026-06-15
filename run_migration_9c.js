const fs = require('fs');
const db = require('./server/db');

async function run() {
    try {
        const sql = fs.readFileSync('server/migrations/20260705_phase9c_consensus.sql', 'utf8');
        await db.query(sql);
        console.log("Migration 9C applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit();
    }
}
run();

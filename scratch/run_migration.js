const db = require('../server/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log("🚀 Running Database Migration: add_image_alts_to_products...");
    try {
        const sqlPath = path.join(__dirname, '../server/migrations/20260717_add_image_alts_to_products.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await db.query(sql);
        console.log("✅ Database migration successful!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    }
}

runMigration();

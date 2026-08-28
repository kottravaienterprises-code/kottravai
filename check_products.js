require('dotenv').config();
const db = require('./server/db');

async function run() {
    const res = await db.query("SELECT count(id) as total FROM products");
    const res2 = await db.query("SELECT count(id) as active_campaign FROM products WHERE campaign_tag = '70% OFF'");
    const res3 = await db.query("SELECT id, name, category, price, original_price FROM products WHERE name ILIKE '%coconut%' OR category ILIKE '%coconut%'");
    
    console.log('Total:', res.rows[0].total);
    console.log('Active Campaign:', res2.rows[0].active_campaign);
    console.log('Coconut Shell Products:', res3.rows.length);
    console.log('Sample Coconut Shell Products:', res3.rows.slice(0, 5));
    process.exit(0);
}

run();

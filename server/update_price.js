const db = require('./db');

async function run() {
    try {
        await db.query(`UPDATE products SET price = 1 WHERE slug = 'rural-livelihood-hackathon-2026'`);
        console.log('Price updated to 1');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

run();

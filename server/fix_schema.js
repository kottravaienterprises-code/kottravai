const db = require('./db');
async function run() {
    try {
        await db.query('ALTER TABLE orders ALTER COLUMN subtotal_server TYPE numeric, ALTER COLUMN shipping_server TYPE numeric, ALTER COLUMN total_server TYPE numeric;');
        console.log('Schema fixed');
    } catch(e) {
        console.log(e.message);
    }
    process.exit(0);
}
run();

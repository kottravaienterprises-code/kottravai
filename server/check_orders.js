const db = require('./db');

async function checkOrders() {
    try {
        const result = await db.query(`
            SELECT id, customer_name, customer_email, total, status, created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 5;
        `);
        console.log(JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkOrders();

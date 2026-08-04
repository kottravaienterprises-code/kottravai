const { pool } = require('./db');

async function test() {
    try {
        const res = await pool.query(`
            SELECT column_name, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'guest_sessions' AND column_name = 'customer_id';
        `);
        console.log('Nullable?', res.rows[0]);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
test();

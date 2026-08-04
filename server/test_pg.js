const { pool } = require('./db');

async function test() {
    try {
        await pool.query('SELECT $1::text', [undefined]);
        console.log('Success with undefined!');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        process.exit();
    }
}
test();

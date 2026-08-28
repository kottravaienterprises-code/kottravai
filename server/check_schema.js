const db = require('./db');
async function check() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'");
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
check();

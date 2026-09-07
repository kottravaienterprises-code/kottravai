const db = require('./server/db');
async function run() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products'");
        console.log(res.rows);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();

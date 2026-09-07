const db = require('./server/db');
async function run() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'analytics_events'");
        console.log(res.rows);
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
run();

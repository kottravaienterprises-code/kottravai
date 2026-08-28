const db = require('./db');
async function run() {
    try {
        const res = await db.query(`SELECT column_name FROM information_schema.columns WHERE table_name='hackathon_registrations'`);
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
run();

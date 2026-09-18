require('dotenv').config({path: 'server/.env'});
const db = require('./server/db');

async function run() {
    try {
        const res = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        const tables = res.rows.map(r => r.table_name);
        console.log("Tables:", tables);
        
        for (let t of tables) {
            try {
                const countRes = await db.query(`SELECT count(*) FROM "${t}"`);
                console.log(`Table ${t} has ${countRes.rows[0].count} rows`);
            } catch(e) {}
        }
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
run();

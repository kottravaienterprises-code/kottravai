const db = require('./db');
async function run() {
    try {
        const res = await db.query("SELECT id, name, category FROM products WHERE category ILIKE '%event%' or name ILIKE '%hackathon%'");
        console.log(res.rows);
    } catch(e){ console.error(e) }
    process.exit(0);
}
run();

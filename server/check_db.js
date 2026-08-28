const db = require('./db');
async function run() {
    try {
        const res = await db.query("SELECT * FROM products WHERE slug = 'rural-livelihood-hackathon-2026'");
        console.log('Products found:', res.rows.length);
        const res2 = await db.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hackathon_registrations');");
        console.log('Table exists:', res2.rows[0].exists);
    } catch(e){ console.error(e) }
    process.exit(0);
}
run();

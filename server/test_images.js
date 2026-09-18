const db = require('./db');
async function run() {
    try {
        const res = await db.query("SELECT name, image FROM products WHERE name ILIKE '%Choco Blast%' OR name ILIKE '%Shaktimaan%' OR name ILIKE '%Crawl Booster%'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch(e){
        console.error(e);
    }
    process.exit(0);
}
run();

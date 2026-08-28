const pool = require('./db');

async function check() {
    try {
        const res = await pool.query(`SELECT count(*) as total, sum(case when campaign_tag = '70% OFF' then 1 else 0 end) as promo_count, sum(case when category ilike '%coconut%' or name ilike '%coconut%' then 1 else 0 end) as coco_count FROM products`);
        console.log(res.rows[0]);
        const hack = await pool.query(`SELECT name, price, original_price, campaign_tag FROM products WHERE slug = 'rural-livelihood-hackathon-2026'`);
        console.log(hack.rows[0]);
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
check();

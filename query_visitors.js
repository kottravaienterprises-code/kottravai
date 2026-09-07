const db = require('./server/db');

async function run() {
    try {
        const query = `
            SELECT count(DISTINCT visitor_id) as visitors
            FROM analytics_events
            WHERE (event_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = '2026-08-31'::date;
        `;
        const res = await db.query(query);
        console.log('Unique Visitors:', res.rows[0].visitors);
    } catch(e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}

run();

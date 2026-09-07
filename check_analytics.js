const db = require('./server/db');

async function testAnalytics() {
    try {
        const res = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log("Tables:", res.rows.map(r => r.table_name));

        const analyticsRes = await db.query(`SELECT COUNT(*) FROM analytics_events WHERE date_trunc('day', timestamp) >= date_trunc('day', NOW() - INTERVAL '3 days')`);
        console.log("Events in last 3 days:", analyticsRes.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

testAnalytics();

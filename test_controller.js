const { trackEvent } = require('./server/controllers/trackingController');
const pool = require('./server/db');

async function test() {
    console.log('Testing trackEvent...');
    const req = {
        body: {
            event_type: 'page_view',
            page: '/',
            timestamp: new Date().toISOString(),
            session_id: 'test_session_1',
            visitor_id: 'test_visitor_1',
            utm_source: 'test',
            utm_medium: 'test',
            utm_campaign: 'analytics-test',
            first_utm_source: 'test_first'
        },
        headers: { 'x-forwarded-for': '127.0.0.1' },
        socket: { remoteAddress: '127.0.0.1' }
    };
    const res = {
        status: (code) => res,
        json: async (data) => {
            console.log('Responded:', data);
            
            // Wait 2 seconds for DB to flush just in case (though it's awaited in our updated code)
            await new Promise(r => setTimeout(r, 2000));

            const dbRes = await pool.query('SELECT * FROM analytics_events WHERE visitor_id = $1', ['test_visitor_1']);
            console.log('DB Rows:', dbRes.rows.length);
            if (dbRes.rows.length > 0) {
                console.log('Event Name:', dbRes.rows[0].event_name);
                console.log('UTM Source:', dbRes.rows[0].utm_source);
                console.log('First UTM Source:', dbRes.rows[0].first_utm_source);
            }
            process.exit(0);
        }
    };

    try {
        await trackEvent(req, res);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
test();

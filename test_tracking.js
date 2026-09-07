const http = require('http');

const payload = {
    event_type: 'page_view',
    page: '/',
    timestamp: new Date().toISOString(),
    session_id: 'test_session_abc123',
    visitor_id: 'test_visitor_xyz987',
    utm_source: 'test',
    utm_medium: 'test',
    utm_campaign: 'analytics-test',
    first_utm_source: 'test_first',
    session_utm_campaign: 'test_session_camp'
};

const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/track/event',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        console.log('Response status:', res.statusCode);
        console.log('Response body:', data);
    });
});

req.on('error', e => console.error('Error:', e));
req.write(JSON.stringify(payload));
req.end();

const fs = require('fs');

let content = fs.readFileSync('server/services/dailyAnalyticsService.js', 'utf8');

// Replace the Google Sheets fetch with Postgres fetch
const replacement = `
  // Fetch only yesterday's raw event rows to reduce transfer and processing time
  const fetchStart = Date.now();
  let dbRows = [];
  try {
    const dbQuery = 'SELECT * FROM analytics_events';
    const res = await db.query(dbQuery);
    dbRows = res.rows;
  } catch (err) {
    console.error('[DAILY_ANALYTICS] Failed to fetch events from DB:', err.message);
  }
  
  const rows = dbRows.map(r => ({
    'timestamp': r.event_timestamp ? new Date(r.event_timestamp).toISOString() : '',
    'event_type': r.event_name || '',
    'visitor_id': r.visitor_id || 'unknown',
    'session_id': r.session_id || 'unknown',
    'product_name': r.product_name || '',
    'device': r.device || '',
    'geo_country': r.geo_country || '',
    'utm_source': r.utm_source || '(not set)',
    'utm_medium': r.utm_medium || '(not set)',
    'utm_campaign': r.utm_campaign || '(not set)',
    'first_utm_source': r.first_utm_source || '(not set)',
    'page': r.page_url || '',
    'order_total': r.order_total || 0,
    'price': r.price || 0,
    'quantity': r.quantity || 0,
    'payment_method': r.payment_method || '',
    'duration_seconds': r.duration_seconds || 0,
    'metadata': r.metadata ? JSON.stringify(r.metadata) : '',
    'ip_address': r.ip_address || '',
    'geo_state': r.geo_state || '',
    'geo_city': r.geo_city || ''
  }));
  console.log(\`[DAILY_ANALYTICS] Fetched \${rows.length} rows from DB in \${Date.now() - fetchStart}ms\`);
`;

const searchFor = `  // Fetch only yesterday's raw event rows to reduce transfer and processing time
  const fetchStart = Date.now();
  const rows = await fetchRawEventRowsForDate(s, targetDateStr).catch(async (err) => {
    console.error('[DAILY_ANALYTICS] Date-filtered fetch failed, falling back to full fetch:', err.message || err);
    return await fetchRawEventRows(s);
  });
  console.log(\`[DAILY_ANALYTICS] Fetched \${rows.length} rows for \${targetDateStr} in \${Date.now() - fetchStart}ms\`);`;

if (content.includes(searchFor)) {
    content = content.replace(searchFor, replacement);
    fs.writeFileSync('server/services/dailyAnalyticsService.js', content, 'utf8');
    console.log('dailyAnalyticsService.js updated');
} else {
    console.log('Search block not found in dailyAnalyticsService.js');
}

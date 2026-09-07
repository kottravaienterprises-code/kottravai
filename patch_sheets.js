const fs = require('fs');
const file = 'server/services/googleSheetsService.js';
let content = fs.readFileSync(file, 'utf8');

const originalFetchRawRegex = /async function fetchRawEventRows\(s\) \{[\s\S]*?\n\}/;
const newFetchRaw = `async function fetchRawEventRows_LEGACY(s) {
${content.match(originalFetchRawRegex)[0].slice('async function fetchRawEventRows(s) {'.length)}
async function fetchRawEventRows(s) {
  const mode = process.env.ANALYTICS_MODE || 'legacy';
  if (mode === 'postgres') {
      console.log('[STAGE_2] Fetching raw events from PostgreSQL analytics_events table');
      const query = \`
        SELECT * FROM analytics_events 
        ORDER BY event_timestamp ASC
      \`;
      try {
        const res = await db.query(query);
        console.log(\`[STAGE_2_PG_SUCCESS] Fetched \${res.rowCount} rows from PostgreSQL\`);
        
        // Convert to Google Sheets raw event format
        return res.rows.map(dbRow => ({
            date: dbRow.event_timestamp ? new Date(dbRow.event_timestamp).toISOString() : '',
            event_type: dbRow.event_name || '',
            page_path: dbRow.page_url || '',
            referrer: dbRow.referrer || '',
            browser: dbRow.browser || '',
            device_type: dbRow.device || '',
            screen_size: dbRow.screen_size || '',
            user_agent: dbRow.user_agent || '',
            session_id: dbRow.session_id || '',
            visitor_id: dbRow.visitor_id || '',
            utm_source: dbRow.utm_source || '',
            utm_medium: dbRow.utm_medium || '',
            utm_campaign: dbRow.utm_campaign || '',
            utm_term: dbRow.utm_term || '',
            product_name: dbRow.product_name || '',
            category: dbRow.category || '',
            price: dbRow.price || 0,
            quantity: dbRow.quantity || 0,
            currency: 'INR',
            order_id: dbRow.order_id || '',
            order_total: dbRow.order_total || 0,
            payment_method: dbRow.payment_method || '',
            duration_seconds: dbRow.duration_seconds || 0,
            utm_content: dbRow.utm_content || '',
            first_utm_source: dbRow.first_utm_source || '',
            first_utm_medium: dbRow.first_utm_medium || '',
            first_utm_campaign: dbRow.first_utm_campaign || '',
            session_utm_source: dbRow.session_utm_source || '',
            session_utm_medium: dbRow.session_utm_medium || '',
            session_utm_campaign: dbRow.session_utm_campaign || '',
            product_id: dbRow.product_id || '',
            metadata: dbRow.metadata || '',
            ip_address: dbRow.ip_address || '',
            geo_country: dbRow.geo_country || '',
            geo_state: dbRow.geo_state || '',
            geo_city: dbRow.geo_city || ''
        }));
      } catch (err) {
        console.error('[STAGE_2_PG_ERROR] Failed to fetch events from PostgreSQL:', err);
        return [];
      }
  } else {
      return fetchRawEventRows_LEGACY(s);
  }
}
`;
content = content.replace(originalFetchRawRegex, newFetchRaw);

const fetchDateStart = content.indexOf('async function fetchRawEventRowsForDate(s, targetDateStr) {');
const fetchDateEnd = content.indexOf('exports.fetchRawEventRowsForDate = fetchRawEventRowsForDate;');
const originalFetchDate = content.slice(fetchDateStart, fetchDateEnd);
const newFetchDate = `async function fetchRawEventRowsForDate_LEGACY(s, targetDateStr) {
${originalFetchDate.slice('async function fetchRawEventRowsForDate(s, targetDateStr) {'.length)}
async function fetchRawEventRowsForDate(s, targetDateStr) {
  const mode = process.env.ANALYTICS_MODE || 'legacy';
  if (mode === 'postgres') {
      console.log(\`[STAGE_2] Fetching raw events for \${targetDateStr} from PostgreSQL\`);
      const query = \`
        SELECT * FROM analytics_events 
        WHERE (event_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1::date
        ORDER BY event_timestamp ASC
      \`;
      try {
        const res = await db.query(query, [targetDateStr]);
        console.log(\`[STAGE_2_PG_SUCCESS] Fetched \${res.rowCount} rows for date \${targetDateStr}\`);
        
        return res.rows.map(dbRow => ({
            date: dbRow.event_timestamp ? new Date(dbRow.event_timestamp).toISOString() : '',
            event_type: dbRow.event_name || '',
            page_path: dbRow.page_url || '',
            referrer: dbRow.referrer || '',
            browser: dbRow.browser || '',
            device_type: dbRow.device || '',
            screen_size: dbRow.screen_size || '',
            user_agent: dbRow.user_agent || '',
            session_id: dbRow.session_id || '',
            visitor_id: dbRow.visitor_id || '',
            utm_source: dbRow.utm_source || '',
            utm_medium: dbRow.utm_medium || '',
            utm_campaign: dbRow.utm_campaign || '',
            utm_term: dbRow.utm_term || '',
            product_name: dbRow.product_name || '',
            category: dbRow.category || '',
            price: dbRow.price || 0,
            quantity: dbRow.quantity || 0,
            currency: 'INR',
            order_id: dbRow.order_id || '',
            order_total: dbRow.order_total || 0,
            payment_method: dbRow.payment_method || '',
            duration_seconds: dbRow.duration_seconds || 0,
            utm_content: dbRow.utm_content || '',
            first_utm_source: dbRow.first_utm_source || '',
            first_utm_medium: dbRow.first_utm_medium || '',
            first_utm_campaign: dbRow.first_utm_campaign || '',
            session_utm_source: dbRow.session_utm_source || '',
            session_utm_medium: dbRow.session_utm_medium || '',
            session_utm_campaign: dbRow.session_utm_campaign || '',
            product_id: dbRow.product_id || '',
            metadata: dbRow.metadata || '',
            ip_address: dbRow.ip_address || '',
            geo_country: dbRow.geo_country || '',
            geo_state: dbRow.geo_state || '',
            geo_city: dbRow.geo_city || ''
        }));
      } catch (err) {
        console.error('[STAGE_2_PG_ERROR] Failed to fetch events from PostgreSQL for date:', err);
        return [];
      }
  } else {
      return fetchRawEventRowsForDate_LEGACY(s, targetDateStr);
  }
}
`;
content = content.replace(originalFetchDate, newFetchDate);

// Replace appendEventRow
content = content.replace(/exports\.appendEventRow = async \(payload\) => \{/, 
`exports.appendEventRow = async (payload) => {
  if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
      console.log('[STAGE_2_GOOGLE_APPEND_SKIPPED] PostgreSQL is authoritative. Bypassing Google Sheets single append.');
      return true;
  }
`);

// Replace appendEventRows
content = content.replace(/exports\.appendEventRows = async \(payloads\) => \{/g, 
`exports.appendEventRows = async (payloads) => {
  if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
      console.log('[STAGE_2_GOOGLE_APPEND_SKIPPED] PostgreSQL is authoritative. Bypassing Google Sheets batch append.');
      return true;
  }
`);

// Replace diagnosticTest start
content = content.replace(/exports\.diagnosticTest = async \(\) => \{\s*const steps = \[\{ name: 'authentication', status: 'PENDING' \}\];/, 
`exports.diagnosticTest = async () => {
  const mode = process.env.ANALYTICS_MODE || 'legacy';
  const steps = [{ name: 'authentication', status: 'PENDING' }];
  if (mode !== 'postgres') {
      steps.push({ name: 'raw_events_sheet_check', status: 'PENDING' });
      steps.push({ name: 'append_test_row', status: 'PENDING' });
  } else {
      steps.push({ name: 'postgres_analytics_health', status: 'PENDING' });
  }`);

// Make steps push logic conditional
content = content.replace(/try \{\s*\/\/\s*1\. Auth/g, `try {
    // 1. Auth`);
content = content.replace(/const spreadsheets = await s\.spreadsheets\.get\(\{/g, `if (mode !== 'postgres') {
        const spreadsheets = await s.spreadsheets.get({`);

// Close if block before 3. Append test
content = content.replace(/\/\/\s*3\. Append test/g, `} // end if !== postgres
    // 3. Append test`);
content = content.replace(/const appendResult = await s\.spreadsheets\.values\.append\(\{/g, `if (mode !== 'postgres') {
        const appendResult = await s.spreadsheets.values.append({`);

// Close append if block and add postgres check
content = content.replace(/return \{ success: true, steps \};/g, `} else {
        try {
            await db.query('SELECT 1');
            const step = steps.find(st => st.name === 'postgres_analytics_health');
            if (step) { step.status = 'PASSED'; step.details = 'PostgreSQL DB is accessible'; }
        } catch (err) {
            const step = steps.find(st => st.name === 'postgres_analytics_health');
            if (step) { step.status = 'FAILED'; step.error = err.message; }
        }
    }
    return { success: true, steps };`);

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');

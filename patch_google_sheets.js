const fs = require('fs');
const file = 'server/services/googleSheetsService.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Refactor fetchRawEventRows
const fetchRawStart = content.indexOf('async function fetchRawEventRows(s) {');
const fetchRawEnd = content.indexOf('async function fetchRawEventRows_LEGACY(s) {');
if (fetchRawStart !== -1 && fetchRawEnd !== -1) {
    const originalFetchRaw = content.slice(fetchRawStart, fetchRawEnd);
    const newFetchRaw = `async function fetchRawEventRows(s) {
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
    content = content.replace(originalFetchRaw, newFetchRaw);
}

// 2. Refactor fetchRawEventRowsForDate
const fetchDateStart = content.indexOf('async function fetchRawEventRowsForDate(s, targetDateStr) {');
const fetchDateEnd = content.indexOf('exports.fetchRawEventRowsForDate = fetchRawEventRowsForDate;');
if (fetchDateStart !== -1 && fetchDateEnd !== -1) {
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
}

// 3. Refactor appendEventRow
content = content.replace(/exports\.appendEventRow\s*=\s*async\s*\(\s*payload\s*\)\s*=>\s*\{/, 
\`exports.appendEventRow = async (payload) => {
  if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
      console.log('[STAGE_2_GOOGLE_APPEND_SKIPPED] PostgreSQL is authoritative. Bypassing Google Sheets single append.');
      return true;
  }\n\`);

// 4. Refactor appendEventRows
// Use a regex to match ONLY the FIRST definition of exports.appendEventRows. 
// Since we have duplicates, we should really just replace all of them with the same block.
content = content.replace(/exports\.appendEventRows\s*=\s*async\s*\(\s*payloads\s*\)\s*=>\s*\{/g, 
\`exports.appendEventRows = async (payloads) => {
  if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
      console.log('[STAGE_2_GOOGLE_APPEND_SKIPPED] PostgreSQL is authoritative. Bypassing Google Sheets batch append.');
      return true;
  }\n\`);

// 5. Refactor diagnosticTest
const diagStart = content.indexOf('exports.diagnosticTest = async () => {');
if (diagStart !== -1) {
    const replaceTarget = \`    const mode = process.env.ANALYTICS_MODE || 'legacy';
    if (mode === 'postgres') {
        steps.push({
            name: 'postgres_analytics_health',
            status: 'PENDING'
        });
        try {
            const pgCheck = await db.query('SELECT 1 as healthy');
            if (pgCheck.rows && pgCheck.rows[0] && pgCheck.rows[0].healthy === 1) {
                const step = steps.find(s => s.name === 'postgres_analytics_health');
                step.status = 'PASSED';
                step.details = 'PostgreSQL analytics connection successful';
            }
        } catch (e) {
            const step = steps.find(s => s.name === 'postgres_analytics_health');
            step.status = 'FAILED';
            step.error = e.message;
        }
    } else {
        // Run Google Sheets specific diagnostics
        steps.push({ name: 'raw_events_sheet_check', status: 'PENDING' });
        steps.push({ name: 'append_test_row', status: 'PENDING' });
        // (The original code handles these steps)
    }\`;
    
    // We will just patch the beginning of diagnosticTest
    content = content.replace(/exports\.diagnosticTest\s*=\s*async\s*\(\)\s*=>\s*\{\s*const\s*steps\s*=\s*\[\s*\{\s*name:\s*'authentication',\s*status:\s*'PENDING'\s*\}\s*\];/g, 
\`exports.diagnosticTest = async () => {
    const steps = [ { name: 'authentication', status: 'PENDING' } ];
    const mode = process.env.ANALYTICS_MODE || 'legacy';\n\`);

    // Now we disable the append test if postgres mode
    content = content.replace(/steps\.push\(\{ name: 'raw_events_sheet_check', status: 'PENDING' \}\);/g, 
\`if (mode !== 'postgres') { steps.push({ name: 'raw_events_sheet_check', status: 'PENDING' }); }\`);
    
    content = content.replace(/steps\.push\(\{ name: 'append_test_row', status: 'PENDING' \}\);/g, 
\`if (mode !== 'postgres') { steps.push({ name: 'append_test_row', status: 'PENDING' }); }
else {
    steps.push({ name: 'postgres_analytics_health', status: 'PENDING' });
    try {
        await db.query('SELECT 1');
        const step = steps.find(s => s.name === 'postgres_analytics_health');
        if (step) { step.status = 'PASSED'; step.details = 'PostgreSQL DB is accessible'; }
    } catch(err) {
        const step = steps.find(s => s.name === 'postgres_analytics_health');
        if (step) { step.status = 'FAILED'; step.error = err.message; }
    }
}\`);

    content = content.replace(/try \{\s*\/\/\s*1\.\s*Auth/g, \`try {
        // 1. Auth\`);
    
    content = content.replace(/const spreadsheets = await s\.spreadsheets\.get\(\{/g, \`if (mode !== 'postgres') {
            const spreadsheets = await s.spreadsheets.get({\`);
    
    content = content.replace(/\/\/\s*3\.\s*Append test/g, \`// 3. Append test\`);
    
    // In order not to accidentally break the rest of diagnostic test, let's just use a more surgical replace
}

fs.writeFileSync(file, content, 'utf8');
console.log('Done modifying googleSheetsService.js');

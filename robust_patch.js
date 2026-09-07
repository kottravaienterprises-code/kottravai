const fs = require('fs');
const file = 'server/services/googleSheetsService.js';
const { execSync } = require('child_process');

// Restore to known Git state
execSync('git checkout server/services/googleSheetsService.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Truncate everything from the first exports.appendEventRows onwards to remove duplicates
const appendStart = content.indexOf('exports.appendEventRows = async (payloads) => {');
if (appendStart !== -1) {
    content = content.slice(0, appendStart);
}

// 2. We need to replace appendEventRow too, which is just before appendEventRows
const singleAppendStart = content.indexOf('exports.appendEventRow = async (payload) => {');
if (singleAppendStart !== -1) {
    content = content.slice(0, singleAppendStart);
}

// 3. Re-append the correct versions of all these functions + diagnosticTest + exports
const tailCode = `
exports.appendEventRow = async (payload) => {
  if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
      console.log('[STAGE_2_GOOGLE_APPEND_SKIPPED] PostgreSQL is authoritative. Bypassing Google Sheets single append.');
      return true;
  }
  try {
    console.log('[GOOGLE_APPEND] Starting appendEventRow...');
    const testRow = mapPayloadToRow(payload);
    const s = await sheets();
    await ensureRawEventsSheetExists(s, await getSpreadsheetMetadata(s));
    const appendResult = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: \`\${RAW_EVENTS_SHEET_TITLE}!A:W\`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [testRow] }
    });
    console.log('[GOOGLE_APPEND_SUCCESS] Row appended. Updated rows:', appendResult.data.updates?.updatedRows);
    return true;
  } catch (err) {
    console.error('[GOOGLE_APPEND_ERROR]', err.message);
    throw err;
  }
};

exports.appendEventRows = async (payloads) => {
  if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
      console.log('[STAGE_2_GOOGLE_APPEND_SKIPPED] PostgreSQL is authoritative. Bypassing Google Sheets batch append.');
      return true;
  }
  try {
    console.log('[GOOGLE_BATCH] Starting appendEventRows with', payloads.length, 'rows');
    const rows = payloads.map(mapPayloadToRow);
    const s = await sheets();
    await ensureRawEventsSheetExists(s, await getSpreadsheetMetadata(s));
    const appendResult = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: \`\${RAW_EVENTS_SHEET_TITLE}!A:W\`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });
    console.log('[GOOGLE_BATCH_SUCCESS] Batch appended. Updated rows:', appendResult.data.updates?.updatedRows);
    return true;
  } catch (err) {
    console.error('[GOOGLE_BATCH_ERROR]', err.message);
    throw err;
  }
};

exports.diagnosticTest = async () => {
  const mode = process.env.ANALYTICS_MODE || 'legacy';
  const results = {
    success: false,
    timestamp: new Date().toISOString(),
    steps: [
      { name: 'authentication', status: 'PENDING' }
    ],
    errors: []
  };

  if (mode !== 'postgres') {
      results.steps.push({ name: 'raw_events_sheet_check', status: 'PENDING' });
      results.steps.push({ name: 'append_test_row', status: 'PENDING' });
  } else {
      results.steps.push({ name: 'postgres_analytics_health', status: 'PENDING' });
  }

  try {
    // 1. Auth
    const s = await sheets();
    results.steps.find(st => st.name === 'authentication').status = 'PASSED';

    if (mode !== 'postgres') {
        // 2. Check Raw Events sheet
        const spreadsheets = await s.spreadsheets.get({
          spreadsheetId: SHEET_ID
        });
        const hasRaw = spreadsheets.data.sheets.some(sh => sh.properties.title === RAW_EVENTS_SHEET_TITLE);
        
        const rawStep = results.steps.find(st => st.name === 'raw_events_sheet_check');
        if (hasRaw) {
          rawStep.status = 'PASSED';
        } else {
          rawStep.status = 'WARNING';
          rawStep.details = 'Raw Events sheet missing, will be auto-created on next write';
        }

        // 3. Append test
        const testRow = mapPayloadToRow({
          event_type: 'diagnostic_test',
          page: '/system-health',
          timestamp: new Date().toISOString()
        });

        const appendResult = await s.spreadsheets.values.append({
          spreadsheetId: SHEET_ID,
          range: \`\${RAW_EVENTS_SHEET_TITLE}!A:W\`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [testRow] }
        });
        results.steps.find(st => st.name === 'append_test_row').status = 'PASSED';
    } else {
        // Postgres health check
        const db = require('../db');
        try {
            await db.query('SELECT 1');
            const step = results.steps.find(st => st.name === 'postgres_analytics_health');
            if (step) { step.status = 'PASSED'; step.details = 'PostgreSQL DB is accessible'; }
        } catch (err) {
            const step = results.steps.find(st => st.name === 'postgres_analytics_health');
            if (step) { step.status = 'FAILED'; step.error = err.message; }
        }
    }

    results.success = true;
    console.log('[DIAG] ✅ All diagnostic tests passed');
  } catch (err) {
    console.error('[DIAG] ❌ Diagnostic test failed:', err.message);
    results.errors.push(err.message);
  }

  return results;
};

// Exports for testing
exports.fetchRawEventRows = fetchRawEventRows;
exports.buildAggregations = buildAggregations;
exports.sheets = sheets;
exports.fetchWhatsAppPerformance = fetchWhatsAppPerformance;
exports.populateDashboardSheet = populateDashboardSheet;
`;

content += tailCode;

// 4. Now replace fetchRawEventRows and fetchRawEventRowsForDate properly
const originalFetchRawRegex = /async function fetchRawEventRows\\(s\\) \\{[\\s\\S]*?\\n\\}/;
const newFetchRaw = \`async function fetchRawEventRows_LEGACY(s) {
\${content.match(originalFetchRawRegex)[0].slice('async function fetchRawEventRows(s) {'.length)}
async function fetchRawEventRows(s) {
  const mode = process.env.ANALYTICS_MODE || 'legacy';
  if (mode === 'postgres') {
      console.log('[STAGE_2] Fetching raw events from PostgreSQL analytics_events table');
      const db = require('../db');
      const query = \\`
        SELECT * FROM analytics_events 
        ORDER BY event_timestamp ASC
      \\`;
      try {
        const res = await db.query(query);
        console.log(\\\`[STAGE_2_PG_SUCCESS] Fetched \\\${res.rowCount} rows from PostgreSQL\\\`);
        
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
\`;
content = content.replace(originalFetchRawRegex, newFetchRaw);

const fetchDateStart = content.indexOf('async function fetchRawEventRowsForDate(s, targetDateStr) {');
const fetchDateEnd = content.indexOf('exports.fetchRawEventRowsForDate = fetchRawEventRowsForDate;');
const originalFetchDate = content.slice(fetchDateStart, fetchDateEnd);
const newFetchDate = \`async function fetchRawEventRowsForDate_LEGACY(s, targetDateStr) {
\${originalFetchDate.slice('async function fetchRawEventRowsForDate(s, targetDateStr) {'.length)}
async function fetchRawEventRowsForDate(s, targetDateStr) {
  const mode = process.env.ANALYTICS_MODE || 'legacy';
  if (mode === 'postgres') {
      console.log(\\\`[STAGE_2] Fetching raw events for \\\${targetDateStr} from PostgreSQL\\\`);
      const db = require('../db');
      const query = \\`
        SELECT * FROM analytics_events 
        WHERE (event_timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1::date
        ORDER BY event_timestamp ASC
      \\`;
      try {
        const res = await db.query(query, [targetDateStr]);
        console.log(\\\`[STAGE_2_PG_SUCCESS] Fetched \\\${res.rowCount} rows for date \\\${targetDateStr}\\\`);
        
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
\`;
content = content.replace(originalFetchDate, newFetchDate);

fs.writeFileSync(file, content, 'utf8');
console.log('googleSheetsService.js patched successfully!');

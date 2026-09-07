const fs = require('fs');

let content = fs.readFileSync('server/controllers/trackingController.js', 'utf8');

if (!content.includes("const pool = require('../db');")) {
    content = content.replace("const axios = require('axios');", "const axios = require('axios');\nconst pool = require('../db');");
}

const insertLogic = `
async function insertEventToPostgres(payload) {
  const query = \`
    INSERT INTO analytics_events (
      event_timestamp, event_name, page_url, referrer, browser, device, screen_size,
      user_agent, session_id, visitor_id, utm_source, utm_medium, utm_campaign,
      utm_term, utm_content, first_utm_source, first_utm_medium, first_utm_campaign,
      session_utm_source, session_utm_medium, session_utm_campaign, product_id,
      product_name, category, price, quantity, order_id, order_total, payment_method,
      duration_seconds, metadata, ip_address, geo_country, geo_state, geo_city,
      geo_region, geo_isp, geo_latitude, geo_longitude
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
      $33, $34, $35, $36, $37, $38, $39
    )
  \`;
  const values = [
    payload.timestamp || new Date().toISOString(),
    payload.event_type || payload.event_name || 'unknown',
    payload.page || payload.page_url || '',
    payload.referrer || '',
    payload.browser || payload.browser_name || '',
    payload.device || payload.device_type || '',
    payload.screen_size || \`\${payload.screen_width || ''}x\${payload.screen_height || ''}\`,
    payload.user_agent || payload.ua || '',
    payload.session_id || '',
    payload.visitor_id || '',
    payload.utm_source || '',
    payload.utm_medium || '',
    payload.utm_campaign || '',
    payload.utm_term || '',
    payload.utm_content || '',
    payload.first_utm_source || '',
    payload.first_utm_medium || '',
    payload.first_utm_campaign || '',
    payload.session_utm_source || '',
    payload.session_utm_medium || '',
    payload.session_utm_campaign || '',
    payload.product_id || '',
    payload.product_name || '',
    payload.category || '',
    payload.price || null,
    payload.quantity || null,
    payload.order_id || '',
    payload.order_total || payload.total_amount || null,
    payload.payment_method || '',
    payload.duration_seconds || null,
    payload.metadata ? JSON.stringify(payload.metadata) : null,
    payload.ip_address || '',
    payload.geo_country || '',
    payload.geo_state || '',
    payload.geo_city || '',
    payload.geo_region || '',
    payload.geo_isp || '',
    payload.geo_latitude || '',
    payload.geo_longitude || ''
  ];
  await pool.query(query, values);
}
`;

content = content.replace("exports.trackEvent = async (req, res) => {", insertLogic + "\nexports.trackEvent = async (req, res) => {");

content = content.replace(
  "await googleSheetsService.appendEventRow(payload);",
  "try {\n      await insertEventToPostgres(payload);\n    } catch (dbErr) {\n      console.error('[DB_APPEND_ERROR]', dbErr.message);\n      // Silently fall back or ignore so tracking doesn't crash app\n    }"
);

content = content.replace(
  "await googleSheetsService.appendEventRows(rows);",
  "for (const row of rows) {\n      try {\n        await insertEventToPostgres(row);\n      } catch (dbErr) {\n        console.error('[DB_BATCH_APPEND_ERROR]', dbErr.message);\n      }\n    }"
);

// We need to also fix testWrite so it inserts to Postgres instead of googleSheets
content = content.replace(
  "await googleSheetsService.appendEventRow(testPayload);",
  "await insertEventToPostgres(testPayload);"
);

fs.writeFileSync('server/controllers/trackingController.js', content, 'utf8');
console.log('trackingController.js updated');

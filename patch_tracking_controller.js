const fs = require('fs');

const path = 'server/controllers/trackingController.js';
let content = fs.readFileSync(path, 'utf8');

const targetFunction = `async function insertEventToPostgres(payload) {
  const query = \`
    INSERT INTO analytics_events (
      event_timestamp, event_name, page_url, referrer, browser, device, screen_size,
      user_agent, session_id, visitor_id, utm_source, utm_medium, utm_campaign,
      utm_term, utm_content, first_utm_source, first_utm_medium, first_utm_campaign,
      session_utm_source, session_utm_medium, session_utm_campaign, product_id,
      product_name, category, price, quantity, order_id, order_total, payment_method,
      duration_seconds, metadata, ip_address, geo_country, geo_state, geo_city,
      geo_region, geo_isp, geo_latitude, geo_longitude,
      user_id, is_logged_in, products_array, coupon_code, discount_applied,
      shipping_cost, taxes, sku, stock_status, cart_total_value,
      first_utm_content, first_utm_term, session_utm_content, session_utm_term,
      gclid, fbclid
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
      $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
      $33, $34, $35, $36, $37, $38, $39,
      $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
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
    payload.price !== undefined ? payload.price : null,
    payload.quantity !== undefined ? payload.quantity : null,
    payload.order_id || '',
    payload.order_total !== undefined ? payload.order_total : (payload.total_amount !== undefined ? payload.total_amount : null),
    payload.payment_method || '',
    payload.duration_seconds !== undefined ? payload.duration_seconds : null,
    payload.metadata ? JSON.stringify(payload.metadata) : null,
    payload.ip_address || '',
    payload.geo_country || '',
    payload.geo_state || '',
    payload.geo_city || '',
    payload.geo_region || '',
    payload.geo_isp || '',
    payload.geo_latitude || '',
    payload.geo_longitude || '',
    // New fields
    payload.user_id || null,
    payload.is_logged_in === true || payload.is_logged_in === 'true' ? true : false,
    payload.products_array ? JSON.stringify(payload.products_array) : null,
    payload.coupon_code || '',
    payload.discount_applied !== undefined ? payload.discount_applied : null,
    payload.shipping_cost !== undefined ? payload.shipping_cost : null,
    payload.taxes !== undefined ? payload.taxes : null,
    payload.sku || '',
    payload.stock_status || '',
    payload.cart_total_value !== undefined ? payload.cart_total_value : null,
    payload.first_utm_content || '',
    payload.first_utm_term || '',
    payload.session_utm_content || '',
    payload.session_utm_term || '',
    payload.gclid || '',
    payload.fbclid || ''
  ];
  await pool.query(query, values);
}`;

content = content.replace(/async function insertEventToPostgres\(payload\) \{[\s\S]*?await pool\.query\(query, values\);\n\}/, targetFunction);

fs.writeFileSync(path, content, 'utf8');
console.log('Updated trackingController.js');

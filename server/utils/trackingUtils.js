const crypto = require('crypto');

exports.sanitizeTrackingPayload = (p) => {
  // Minimal sanitization: copy only expected fields and string-ify values
  const allowed = [
    'event_type','event_name','page','page_url','timestamp','user_agent','ua','browser','browser_name','device','device_type',
    'screen_size','screen_width','screen_height','referrer','session_id','visitor_id','visit_count','utm_source','utm_medium','utm_campaign',
    'utm_content', 'utm_term',
    'first_utm_source', 'first_utm_medium', 'first_utm_campaign',
    'session_utm_source', 'session_utm_medium', 'session_utm_campaign',
    'product_id', 'product_name', 'category', 'price', 'quantity', 'order_id', 'order_total', 'payment_method', 'revenue',
    'metadata'
  ];
  const out = {};
  
  // Merge metadata to top level so product_name and other fields are picked up
  const merged = { ...p, ...(p.metadata || {}) };

  for (const k of allowed) {
    if (merged[k] !== undefined && merged[k] !== null) out[k] = typeof merged[k] === 'string' ? merged[k].trim() : merged[k];
  }
  
  // UTM Fallback Logic
  const utms = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  for (const u of utms) {
    if (!out[u] || out[u].trim() === '') out[u] = '(not set)';
  }

  // Ensure timestamp normalized
  out.timestamp = out.timestamp || new Date().toISOString();
  return out;
};

exports.hashEvent = (payload) => {
  try {
    const str = `${payload.event_type || ''}|${payload.page || ''}|${payload.session_id || ''}|${payload.timestamp || ''}|${JSON.stringify(payload.metadata||{})}`;
    return crypto.createHash('sha256').update(str).digest('hex');
  } catch (e) {
    return crypto.randomBytes(16).toString('hex');
  }
};

const googleSheetsService = require('../services/googleSheetsService');
const { sanitizeTrackingPayload, hashEvent } = require('../utils/trackingUtils');
const NodeCache = require('node-cache');
const axios = require('axios');
const pool = require('../db');

// In-memory duplicate prevention cache (short TTL)
const recentEvents = new NodeCache({ stdTTL: 60, checkperiod: 30 });
// Geo cache for 24 hours
const geoCache = new NodeCache({ stdTTL: 86400 });

// Helper for Geo IP Lookup
const lookupIP = async (ip) => {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return null;
  
  const cached = geoCache.get(ip);
  if (cached) return cached;

  try {
    const res = await axios.get(`https://ipwho.is/${ip}`, { timeout: 3000 });
    if (res.data && res.data.success) {
      const geoData = {
        geo_country: res.data.country || 'Unknown',
        geo_state: res.data.region || 'Unknown',
        geo_city: res.data.city || 'Unknown',
        geo_region: res.data.continent || 'Unknown',
        geo_isp: res.data.connection?.isp || 'Unknown',
        geo_latitude: res.data.latitude || '',
        geo_longitude: res.data.longitude || ''
      };
      geoCache.set(ip, geoData);
      console.log(`[GEO_LOOKUP_SUCCESS] ${ip} -> ${geoData.geo_country}`);
      return geoData;
    } else {
      console.warn(`[GEO_LOOKUP_FAILED] API returned success: false for IP ${ip}`);
      return null;
    }
  } catch (err) {
    console.warn(`[GEO_LOOKUP_FAILED] Error resolving IP ${ip}: ${err.message}`);
    return null;
  }
};

const REQUIRED_FIELDS = ['event_type', 'page', 'timestamp', 'session_id'];


async function insertEventToPostgres(payload) {
  const query = `
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
  `;
  const values = [
    payload.timestamp || new Date().toISOString(),
    payload.event_type || payload.event_name || 'unknown',
    payload.page || payload.page_url || '',
    payload.referrer || '',
    payload.browser || payload.browser_name || '',
    payload.device || payload.device_type || '',
    payload.screen_size || `${payload.screen_width || ''}x${payload.screen_height || ''}`,
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

exports.trackEvent = async (req, res) => {
  try {
    console.log('[TRACKING_EVENT_RECEIVED] Event received:', req.body?.event_type);
    const payload = sanitizeTrackingPayload(req.body || {});
    
    // Enrich payload with server-side network data
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    payload.ip_address = rawIp.split(',')[0].trim();
    
    // Perform Async GeoLookup without blocking response
    const geoData = await lookupIP(payload.ip_address);
    if (geoData) {
      payload.geo_country = geoData.geo_country;
      payload.geo_state = geoData.geo_state;
      payload.geo_city = geoData.geo_city;
      payload.geo_region = geoData.geo_region;
      payload.geo_isp = geoData.geo_isp;
      payload.geo_latitude = geoData.geo_latitude;
      payload.geo_longitude = geoData.geo_longitude;
    } else {
      payload.geo_country = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || 'Unknown';
      payload.geo_state = req.headers['x-vercel-ip-country-region'] || 'Unknown';
      payload.geo_city = req.headers['x-vercel-ip-city'] || 'Unknown';
    }

    for (const f of REQUIRED_FIELDS) {
      if (!payload[f]) {
          console.warn(`[TRACKING_ERROR] Missing required field ${f}`);
          return res.status(200).json({ status: 'ok' }); // Always return success to business flow
      }
    }

    // Duplicate prevention
    const h = hashEvent(payload);
    if (recentEvents.get(h)) {
      return res.status(200).json({ status: 'duplicate_ignored' });
    }
    recentEvents.set(h, true);

    console.log('[TRACK_EVENT_RECEIVED]', payload);

    try {
      if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
        await insertEventToPostgres(payload);
      } else {
        await googleSheetsService.appendEventRow(payload);
      }
    } catch (dbErr) {
      console.error('[DB_APPEND_ERROR]', dbErr.message);
      // Silently fall back or ignore so tracking doesn't crash app
    }

    console.log('[RAW_EVENT_WRITTEN]', {
      eventType: payload.event_type,
      page: payload.page,
      visitorId: payload.visitor_id
    });

    // Vercel Serverless Fix: Do not run heavy background tasks here.
    // Dashboard is rebuilt via cron or manual trigger.
    
    res.json({ success: true });
  } catch (err) {
    console.error("[TRACKING_ERROR]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.trackBatch = async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : (req.body.events || []);
    if (!events.length) return res.status(400).json({ error: 'No events provided' });

    console.log(`[TRACKING_EVENT_RECEIVED] Batch received with ${events.length} events`);

    const rows = [];
    for (const raw of events) {
      const payload = sanitizeTrackingPayload(raw || {});
      
      // Enrich payload with server-side network data
      const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      payload.ip_address = rawIp.split(',')[0].trim();
      
      const geoData = await lookupIP(payload.ip_address);
      if (geoData) {
        payload.geo_country = geoData.geo_country;
        payload.geo_state = geoData.geo_state;
        payload.geo_city = geoData.geo_city;
        payload.geo_region = geoData.geo_region;
        payload.geo_isp = geoData.geo_isp;
        payload.geo_latitude = geoData.geo_latitude;
        payload.geo_longitude = geoData.geo_longitude;
      } else {
        payload.geo_country = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || 'Unknown';
        payload.geo_state = req.headers['x-vercel-ip-country-region'] || 'Unknown';
        payload.geo_city = req.headers['x-vercel-ip-city'] || 'Unknown';
      }
      
      const h = hashEvent(payload);
      if (recentEvents.get(h)) continue;
      recentEvents.set(h, true);
      rows.push(payload);
    }

    if (!rows.length) return res.json({ status: 'no_new_events' });
    
    console.log('[TRACK_BATCH_RECEIVED]', { count: rows.length });

    for (const row of rows) {
      try {
        if ((process.env.ANALYTICS_MODE || 'legacy') === 'postgres') {
        await insertEventToPostgres(row);
      } else {
        // Fallback for batch? The loop just iterates row by row now.
        // We can just call googleSheetsService.appendEventRow(row) or collect them and call appendEventRows.
        await googleSheetsService.appendEventRow(row);
      }
      } catch (dbErr) {
        console.error('[DB_BATCH_APPEND_ERROR]', dbErr.message);
      }
    }

    console.log('[RAW_BATCH_WRITTEN]', { count: rows.length });

    // Vercel Serverless Fix: Do not run heavy background tasks here.
    // Dashboard is rebuilt via cron or manual trigger.
    
    res.json({ success: true, appended: rows.length });
  } catch (err) {
    console.error('❌ [TRACKING_BATCH_ERROR]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.health = async (req, res) => {
    try {
        const diag = await googleSheetsService.diagnosticTest();
        const rawEventsStep = diag.steps.find(s => s.name === 'raw_events_sheet_check');
        const authStep = diag.steps.find(s => s.name === 'authentication');
        const config = googleSheetsService.getConfig();
        
        res.json({
            success: true,
            spreadsheetConnected: authStep?.status === 'PASSED',
            rawEventsSheetFound: rawEventsStep?.status === 'PASSED' || rawEventsStep?.status === 'WARNING',
            spreadsheetId: config.spreadsheetId,
            spreadsheetUrl: config.spreadsheetUrl,
            serviceAccountAuthenticated: authStep?.status === 'PASSED'
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

exports.config = (req, res) => {
    res.json(googleSheetsService.getConfig());
};

exports.lastWrite = (req, res) => {
    res.json(googleSheetsService.getLastWrite() || { message: "No successful writes since server start." });
};

exports.testWrite = async (req, res) => {
    try {
        const testPayload = {
            event_type: 'test_write',
            page: '/api/track/test-write',
            timestamp: new Date().toISOString(),
            session_id: 'test_session_' + Date.now(),
            visitor_id: 'test_visitor',
            metadata: JSON.stringify({ source: 'diagnostic_test' })
        };
        await insertEventToPostgres(testPayload);
        const config = googleSheetsService.getConfig();
        res.json({
            success: true,
            rowWritten: true,
            sheet: "Raw Events",
            spreadsheetId: config.spreadsheetId
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.rebuildDashboard = async (req, res) => {
    try {
        console.log('[MANUAL_REBUILD] Triggering dashboard rebuild...');
        await googleSheetsService.populateDashboardSheet();
        res.json({ success: true, message: 'Dashboard rebuilt successfully' });
    } catch (err) {
        console.error('[MANUAL_REBUILD_ERROR]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

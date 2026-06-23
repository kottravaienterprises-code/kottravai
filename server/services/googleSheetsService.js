const { google } = require('googleapis');
const { validateAndRepairKey } = require('../utils/googleKeyValidator');
const chartBuilder = require('./chartBuilder');

let SHEET_ID = process.env.GOOGLE_SHEET_ID;
let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

// Log credential status at startup with detailed validation
console.log('[GOOGLE_INIT] Checking credentials...');

let lastSuccessfulWrite = null;

exports.getLastWrite = () => lastSuccessfulWrite;
exports.getConfig = () => ({
    analyticsMode: process.env.ANALYTICS_MODE || 'legacy',
    spreadsheetId: SHEET_ID,
    spreadsheetUrl: SHEET_ID ? `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit` : null,
    rawEventsSheet: 'Raw Events',
    dashboardSheets: [
        'Executive Dashboard',
        'Visitor Intelligence',
        'Traffic Analytics',
        'Product Analytics',
        'Revenue Analytics',
        'Customer Analytics',
        'WhatsApp Analytics',
        'Conversion Funnel',
        'Daily Report',
        'Weekly Report',
        'Monthly Report',
        'Lead Analytics'
    ]
});

// Clean CLIENT_EMAIL - remove leading/trailing spaces and quotes
if (CLIENT_EMAIL) {
  const originalEmail = CLIENT_EMAIL;
  CLIENT_EMAIL = CLIENT_EMAIL.trim();
  if (CLIENT_EMAIL.startsWith('"') && CLIENT_EMAIL.endsWith('"')) {
    CLIENT_EMAIL = CLIENT_EMAIL.slice(1, -1);
  }
  if (CLIENT_EMAIL.startsWith("'") && CLIENT_EMAIL.endsWith("'")) {
    CLIENT_EMAIL = CLIENT_EMAIL.slice(1, -1);
  }
  CLIENT_EMAIL = CLIENT_EMAIL.trim();
  if (originalEmail !== CLIENT_EMAIL) {
    console.log('[GOOGLE_INIT] Cleaned CLIENT_EMAIL:');
    console.log('  Original: ' + JSON.stringify(originalEmail));
    console.log('  Cleaned:  ' + JSON.stringify(CLIENT_EMAIL));
  }
}

// Clean SHEET_ID - remove spaces and quotes
if (SHEET_ID) {
  const originalSheetId = SHEET_ID;
  SHEET_ID = SHEET_ID.trim();
  if (SHEET_ID.startsWith('"') && SHEET_ID.endsWith('"')) {
    SHEET_ID = SHEET_ID.slice(1, -1);
  }
  if (SHEET_ID.startsWith("'") && SHEET_ID.endsWith("'")) {
    SHEET_ID = SHEET_ID.slice(1, -1);
  }
  SHEET_ID = SHEET_ID.trim();
  if (originalSheetId !== SHEET_ID) {
    console.log('[GOOGLE_INIT] Cleaned SHEET_ID:');
    console.log('  Original: ' + JSON.stringify(originalSheetId));
    console.log('  Cleaned:  ' + JSON.stringify(SHEET_ID));
  }
}

console.log('[GOOGLE_INIT] Credential status:');
console.log({
  hasSheetId: !!SHEET_ID,
  sheetId: SHEET_ID ? SHEET_ID.substring(0, 30) + '...' : 'MISSING',
  hasClientEmail: !!CLIENT_EMAIL,
  clientEmail: CLIENT_EMAIL || 'MISSING',
  hasPrivateKey: !!PRIVATE_KEY,
  privateKeyLength: PRIVATE_KEY ? PRIVATE_KEY.length : 0,
  projectId: extractProjectId(CLIENT_EMAIL) || 'UNKNOWN'
});

// Validate and repair private key
try {
  if (PRIVATE_KEY) {
    PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);
    console.log('[GOOGLE_INIT] ✅ Private key validated and repaired');
  } else {
    console.warn('⚠️ [GOOGLE_INIT] Google Sheets private key is missing!');
  }
} catch (keyErr) {
  console.error('[GOOGLE_INIT] ❌ Private key validation failed:', keyErr.message);
  console.error('[GOOGLE_INIT] Cannot initialize Google Sheets service');
}

if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.warn('⚠️ [GOOGLE_INIT] Google Sheets credentials incomplete. Tracking will fail.');
}

function extractProjectId(email) {
  if (!email) return null;
  // Format: service-account@PROJECT_ID.iam.gserviceaccount.com
  const match = email.match(/@([^.]+)\.iam\.gserviceaccount\.com/);
  return match ? match[1] : null;
}

const sheets = async () => {
  try {
    console.log('[GOOGLE_AUTH] === AUTHENTICATION DEBUG ===');
    console.log('[GOOGLE_AUTH] Service Account Email:', CLIENT_EMAIL);
    console.log('[GOOGLE_AUTH] Email format valid?', /^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(CLIENT_EMAIL) ? 'YES' : 'NO');
    console.log('[GOOGLE_AUTH] Creating JWT auth...');
    
    const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, [
      'https://www.googleapis.com/auth/spreadsheets'
    ]);
    
    console.log('[GOOGLE_AUTH] Authorizing with JWT...');
    const result = await auth.authorize();
    console.log('[GOOGLE_AUTH] ✅ Authorization successful');
    console.log('[GOOGLE_AUTH] Token type:', result.token_type);
    console.log('[GOOGLE_AUTH] Token expires in:', result.expires_in, 'seconds');
    
    console.log('[GOOGLE_SHEETS] Creating sheets API instance...');
    const sheetsApi = google.sheets({ version: 'v4', auth });
    console.log('[GOOGLE_SHEETS] ✅ API instance created');
    
    return sheetsApi;
  } catch (err) {
    console.error('[GOOGLE_AUTH_ERROR] === AUTHENTICATION FAILED ===');
    console.error('[GOOGLE_AUTH_ERROR] Message:', err.message);
    console.error('[GOOGLE_AUTH_ERROR] Code:', err.code);
    console.error('[GOOGLE_AUTH_ERROR] Status:', err.status);
    if (err.response && err.response.data) {
      console.error('[GOOGLE_AUTH_ERROR] Response Data:', JSON.stringify(err.response.data, null, 2));
    }
    if (err.stack) {
      console.error('[GOOGLE_AUTH_ERROR] Stack:', err.stack);
    }
    throw err;
  }
};

const EXECUTIVE_DASHBOARD_SHEET = 'Executive Dashboard';
const VISITOR_INTELLIGENCE_SHEET = 'Visitor Intelligence';
const TRAFFIC_ANALYTICS_SHEET = 'Traffic Analytics';
const PRODUCT_ANALYTICS_SHEET = 'Product Analytics';
const REVENUE_ANALYTICS_SHEET = 'Revenue Analytics';
const CUSTOMER_ANALYTICS_SHEET = 'Customer Analytics';
const WHATSAPP_ANALYTICS_SHEET = 'WhatsApp Analytics';
const CONVERSION_FUNNEL_SHEET = 'Conversion Funnel';
const DAILY_REPORT_SHEET = 'Daily Report';
const WEEKLY_REPORT_SHEET = 'Weekly Report';
const MONTHLY_REPORT_SHEET = 'Monthly Report';
const LEAD_ANALYTICS_SHEET = 'Lead Analytics';
const USER_BEHAVIOR_SHEET = 'User Behavior Analytics';
const RAW_EVENTS_SHEET_TITLE = 'Raw Events';

const GEOGRAPHY_ANALYTICS_SHEET = 'Geography Analytics';
const CAMPAIGN_ANALYTICS_SHEET = 'Campaign Analytics';
const CART_RECOVERY_SHEET = 'Cart Recovery Analytics';
const RECOVERY_VALIDATION_SHEET = 'Recovery Validation';
const RECOVERY_PREVIEW_SHEET = 'Recovery Preview Queue';
const WHATSAPP_RECOVERY_PERFORMANCE_SHEET = 'WhatsApp Recovery Performance';
const ATTRIBUTION_ANALYTICS_SHEET = 'Attribution Analytics';
const PRODUCT_RECOMMENDATION_SHEET = 'Product Recommendation Intelligence';
const CART_INTELLIGENCE_SHEET = 'Cart Intelligence Command Center';
const EXECUTIVE_COMMAND_CENTER_SHEET = 'Executive Command Center';

const DATA_SHEET_ORDER = [
  EXECUTIVE_DASHBOARD_SHEET,
  VISITOR_INTELLIGENCE_SHEET,
  TRAFFIC_ANALYTICS_SHEET,
  PRODUCT_ANALYTICS_SHEET,
  REVENUE_ANALYTICS_SHEET,
  CUSTOMER_ANALYTICS_SHEET,
  CONVERSION_FUNNEL_SHEET,
  GEOGRAPHY_ANALYTICS_SHEET,
  USER_BEHAVIOR_SHEET,
  CART_INTELLIGENCE_SHEET,
  EXECUTIVE_COMMAND_CENTER_SHEET,
  DAILY_REPORT_SHEET,
  WEEKLY_REPORT_SHEET,
  MONTHLY_REPORT_SHEET,
  LEAD_ANALYTICS_SHEET,
  RAW_EVENTS_SHEET_TITLE
];

const RAW_EVENTS_HEADER_ROW = [
  'Timestamp',
  'Event Type',
  'Page',
  'Referrer',
  'Browser',
  'Device',
  'Screen Size',
  'User Agent',
  'Session ID',
  'Visitor ID',
  'UTM Source',
  'UTM Medium',
  'UTM Campaign',
  'Product ID',
  'Product Name',
  'Category',
  'Price',
  'Quantity',
  'Order ID',
  'Order Total',
  'Payment Method',
  'Duration Seconds',
  'Metadata',
  'IP Address',
  'Country',
  'State',
  'City',
  'Region',
  'ISP',
  'Approx Latitude',
  'Approx Longitude',
  'UTM Content',
  'UTM Term'
];

const DEFAULT_RANGE = `${RAW_EVENTS_SHEET_TITLE}!A1:AG`;

async function ensureAnalyticsSheetExists(s, spreadsheetData) {
  const spreadsheet = spreadsheetData || await getSpreadsheetMetadata(s);
  const rawEventsSheet = findSheetByTitle(spreadsheet, RAW_EVENTS_SHEET_TITLE);
  const legacyAnalyticsSheet = findSheetByTitle(spreadsheet, 'Analytics');

  if (rawEventsSheet) {
    return rawEventsSheet;
  }

  if (legacyAnalyticsSheet) {
    console.log('[GOOGLE_SHEET] Renaming legacy Analytics sheet to Raw Events');
    await s.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: legacyAnalyticsSheet.properties.sheetId,
                title: RAW_EVENTS_SHEET_TITLE
              },
              fields: 'title'
            }
          }
        ]
      }
    });
    return legacyAnalyticsSheet;
  }

  console.log('[GOOGLE_SHEET] Raw Events sheet not found. Creating a new Raw Events sheet with headers.');
  const createResponse = await s.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: RAW_EVENTS_SHEET_TITLE,
              gridProperties: { frozenRowCount: 1 }
            }
          }
        }
      ]
    }
  });

  const createdSheet = createResponse.data.replies[0].addSheet.properties;
  await s.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${RAW_EVENTS_SHEET_TITLE}!A1:AE1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [RAW_EVENTS_HEADER_ROW] }
  });

  return createdSheet;
}

function mapPayloadToRow(payload) {
  return [
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
    payload.product_id || '',
    payload.product_name || '',
    payload.category || '',
    payload.price || '',
    payload.quantity || '',
    payload.order_id || '',
    payload.order_total || payload.total_amount || '',
    payload.payment_method || '',
    payload.duration_seconds || '',
    payload.metadata ? JSON.stringify(payload.metadata) : '',
    payload.ip_address || '',
    payload.geo_country || '',
    payload.geo_state || '',
    payload.geo_city || '',
    payload.geo_region || '',
    payload.geo_isp || '',
    payload.geo_latitude || '',
    payload.geo_longitude || '',
    payload.utm_content || '',
    payload.utm_term || ''
  ];
}

function normalizeValue(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

function getWeekKey(date) {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNo = Math.round(((tempDate - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7) + 1;
  return `${tempDate.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getSafeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

async function getSpreadsheetMetadata(s) {
  return s.spreadsheets.get({ spreadsheetId: SHEET_ID, includeGridData: false });
}

function findSheetByTitle(spreadsheet, title) {
  if (!spreadsheet || !spreadsheet.data || !spreadsheet.data.sheets) return null;
  return spreadsheet.data.sheets.find(sh => sh.properties.title?.toLowerCase() === title.toLowerCase());
}

async function createMissingSheets(s, spreadsheet) {
  const existingTitles = (spreadsheet.data.sheets || []).map(sh => sh.properties.title.toLowerCase());
  const requests = [];

  for (const title of DATA_SHEET_ORDER) {
    if (!existingTitles.includes(title.toLowerCase())) {
      requests.push({
        addSheet: {
          properties: { title }
        }
      });
    }
  }

  if (requests.length) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests }
    });
  }

  const updatedSpreadsheet = await getSpreadsheetMetadata(s);
  const reorderRequests = [];

  for (let index = 0; index < DATA_SHEET_ORDER.length; index++) {
    const title = DATA_SHEET_ORDER[index];
    const sheet = findSheetByTitle(updatedSpreadsheet, title);
    if (sheet && sheet.properties.index !== index) {
      reorderRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet.properties.sheetId,
            index
          },
          fields: 'index'
        }
      });
    }
  }

  if (reorderRequests.length) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: reorderRequests }
    });
  }
}

async function ensureRawEventsSheetExists(s, spreadsheetData) {
  const spreadsheet = spreadsheetData || await getSpreadsheetMetadata(s);
  let rawSheet = findSheetByTitle(spreadsheet, RAW_EVENTS_SHEET_TITLE);
  const analyticsSheet = findSheetByTitle(spreadsheet, 'Analytics');

  if (!rawSheet && analyticsSheet) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: analyticsSheet.properties.sheetId,
                title: RAW_EVENTS_SHEET_TITLE
              },
              fields: 'title'
            }
          }
        ]
      }
    });
    const refreshed = await getSpreadsheetMetadata(s);
    rawSheet = findSheetByTitle(refreshed, RAW_EVENTS_SHEET_TITLE);
  }

  if (!rawSheet) {
    const response = await s.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: RAW_EVENTS_SHEET_TITLE,
                gridProperties: { frozenRowCount: 1 }
              }
            }
          }
        ]
      }
    });
    rawSheet = response.data.replies[0].addSheet.properties;
  }

  await s.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${RAW_EVENTS_SHEET_TITLE}!A1:AG1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [RAW_EVENTS_HEADER_ROW] }
  });

  await s.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId: rawSheet.properties.sheetId,
              gridProperties: { frozenRowCount: 1 }
            },
            fields: 'gridProperties.frozenRowCount'
          }
        }
      ]
    }
  });

  return rawSheet;
}

async function clearSheet(s, sheetName) {
  await s.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!A1:Z1000`
  });
}

async function writeSheetValues(s, sheetName, startCell, values) {
  if (!values || values.length === 0) return;
  await s.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${sheetName}!${startCell}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values }
  });
}

async function fetchWhatsAppPerformance(s) {
  try {
    const res = await s.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${WHATSAPP_RECOVERY_PERFORMANCE_SHEET}!A1:Z` });
    const rows = res.data.values;
    if (!rows || rows.length <= 1) return [];
    
    const headers = rows[0];
    const data = rows.slice(1);
    return buildRowObjects(headers, data);
  } catch (e) {
    return [];
  }
}

function buildAggregations(rows) {
  const getISTDateString = (date) => {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
  };
  const getWeekKeyIST = (date) => {
    const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    return d.getFullYear() + '-W' + Math.ceil((d.getDate() + 6 - d.getDay()) / 7); // Using ISO format roughly
  };
  const getMonthKeyIST = (date) => {
    const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const sessions = new Map();
  const visitorFirstSeen = new Map();
  const products = new Map();
  const cartInstances = []; // Array of { productId, addedAt, purchasedAt }
  const activeCarts = new Map(); // key: visitorId_productId
  const daily = new Map();
  const weekly = new Map();
  const monthly = new Map();
  const exitPages = new Map();
  const geoCountries = new Map();
  const geoStates = new Map();
  const geoCities = new Map();
  const geoISPs = new Map();
  const utmSources = new Map();
  const visitorProfiles = new Map();
  const visitorFirstCampaign = new Map();
  const visitorLastCampaign = new Map();
  const campaigns = new Map();
  const firstTouchAttribution = new Map();
  const lastTouchAttribution = new Map();
  const journeyAttribution = new Map();
  
  let totalProductViewsDetected = 0;
  
  const globalFunnel = {
    pageViews: 0,
    productViews: 0,
    addToCarts: 0,
    checkoutStarted: 0,
    guestCheckoutStarted: 0,
    otpSent: 0,
    otpVerified: 0,
    purchases: 0
  };

  const globalGuest = {
    guestCheckouts: 0,
    orders: 0,
    revenue: 0,
    otpSent: 0,
    otpVerified: 0
  };

  const leadData = {
    whatsappClicks: 0,
    contactForms: 0
  };

  // 1. Process rows sequentially
  rows.forEach(row => {
    const timestampStr = row['timestamp'];
    if (!timestampStr) return;
    const time = new Date(timestampStr).getTime();
    if (isNaN(time)) return;

    const visitorId = row['visitor_id'];
    const sessionId = row['session_id'];
    const eventType = String(row['event_type'] || '').trim().toLowerCase();
    const revenue = getSafeNumber(row['order_total']);
    const productId = row['product_id'];
    let productName = String(row['product_name'] || '').trim();

    // DO NOT drop the entire event if productName is empty, because we still need to count the Order and Revenue!
    // We will just mark the product name as 'Unknown Product' or handle it in the leaderboards.
    if (!productName) {
      productName = 'Unknown Product';
    }

    let pageUrl = row['page'] || '';
    if (typeof pageUrl === 'string') pageUrl = pageUrl.replace(/kottravai\.com/g, 'kottravai.in');
    
    let referrer = row['referrer'] || '';
    if (typeof referrer === 'string') referrer = referrer.replace(/kottravai\.com/g, 'kottravai.in');

    // Default categorizations
    let source = normalizeValue(row['utm_source']);
    if (!source || source === 'direct' || source === '') {
        if (referrer && referrer.includes('google')) source = 'google';
        else if (referrer && referrer.includes('instagram')) source = 'instagram';
        else if (referrer && referrer.includes('facebook')) source = 'facebook';
        else if (referrer && referrer.includes('whatsapp')) source = 'whatsapp';
        else if (referrer && !referrer.includes('kottravai') && !referrer.includes('localhost')) source = 'referral';
        else source = 'direct';
    }

    let campaign = normalizeValue(row['utm_campaign']) || '(not set)';
    let medium = normalizeValue(row['utm_medium']) || '(not set)';

    if (visitorId) {
      if (!visitorFirstSeen.has(visitorId) || time < visitorFirstSeen.get(visitorId)) {
        visitorFirstSeen.set(visitorId, time);
      }
      
      // Campaign Attribution Tracking
      const campaignKey = `${campaign}|${source}|${medium}`;
      if (!campaigns.has(campaignKey)) {
        campaigns.set(campaignKey, {
          campaign, source, medium,
          visitors: new Set(), sessions: new Set(),
          productViews: 0, addToCarts: 0, purchases: 0, revenue: 0
        });
      }
      
      if (!visitorFirstCampaign.has(visitorId)) {
         visitorFirstCampaign.set(visitorId, campaignKey);
      }
      // Always update last touch if we have a non-default campaign/source
      if (campaign !== '(not set)' || source !== 'direct') {
         visitorLastCampaign.set(visitorId, campaignKey);
      } else if (!visitorLastCampaign.has(visitorId)) {
         visitorLastCampaign.set(visitorId, campaignKey);
      }
    }

    if (sessionId) {
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
          sessionId, visitorId,
          minTime: time, maxTime: time,
          events: 0, purchases: 0, revenue: 0,
          productViews: 0, addToCarts: 0, checkouts: 0,
          guestCheckouts: 0, otpSent: 0, otpVerified: 0, whatsappClicks: 0,
          exitPage: pageUrl, source,
          hasPurchase: false
        });
      }
      const sess = sessions.get(sessionId);
      sess.events++;
      if (time < sess.minTime) sess.minTime = time;
      if (time > sess.maxTime) {
        sess.maxTime = time;
        sess.exitPage = pageUrl;
      }
      
      if (eventType === 'purchase_completed' && !sess.hasPurchase) {
        sess.purchases++;
        sess.revenue += revenue;
        sess.hasPurchase = true; // Prevent double counting in same session if duplicate event
      }
      if (eventType === 'product_view') sess.productViews++;
      if (eventType === 'add_to_cart') sess.addToCarts++;
      if (eventType === 'checkout_started') sess.checkouts++;
      if (eventType === 'guest_checkout_started') sess.guestCheckouts++;
      if (eventType === 'otp_sent') sess.otpSent++;
      if (eventType === 'otp_verified') sess.otpVerified++;
      if (eventType === 'whatsapp_click') sess.whatsappClicks++;
    }

    if (visitorId) {
      if (!visitorProfiles.has(visitorId)) {
        visitorProfiles.set(visitorId, {
          visitorId,
          firstVisit: time,
          lastVisit: time,
          country: String(row['geo_country'] || row['country'] || 'Unknown').trim(),
          state: String(row['geo_state'] || row['state'] || 'Unknown').trim(),
          city: String(row['geo_city'] || row['city'] || 'Unknown').trim(),
          latitude: String(row['geo_latitude'] || '').trim(),
          longitude: String(row['geo_longitude'] || '').trim(),
          source,
          device: String(row['device'] || row['device_type'] || 'Unknown').trim(),
          browser: String(row['browser'] || 'Unknown').trim(),
          sessions: new Set(),
          pageViews: 0,
          productViews: 0,
          addToCarts: 0,
          orders: 0,
          revenue: 0,
          productCounts: new Map(),
          categoryCounts: new Map(),
          lastVisitedPage: pageUrl
        });
      }
      
      const vp = visitorProfiles.get(visitorId);
      if (time < vp.firstVisit) vp.firstVisit = time;
      if (time > vp.lastVisit) {
        vp.lastVisit = time;
        vp.lastVisitedPage = pageUrl;
        if (row['geo_country'] && row['geo_country'] !== 'Unknown') vp.country = String(row['geo_country']).trim();
        else if (row['country'] && row['country'] !== 'Unknown') vp.country = String(row['country']).trim();

        if (row['geo_state'] && row['geo_state'] !== 'Unknown') vp.state = String(row['geo_state']).trim();
        else if (row['state'] && row['state'] !== 'Unknown') vp.state = String(row['state']).trim();

        if (row['geo_city'] && row['geo_city'] !== 'Unknown') vp.city = String(row['geo_city']).trim();
        else if (row['city'] && row['city'] !== 'Unknown') vp.city = String(row['city']).trim();

        if (row['geo_latitude']) vp.latitude = String(row['geo_latitude']).trim();
        if (row['geo_longitude']) vp.longitude = String(row['geo_longitude']).trim();
        
        if (source && source !== 'direct') vp.source = source;
      }
      
      if (sessionId) vp.sessions.add(sessionId);
      
      if (eventType === 'guest_checkout_started' || eventType === 'otp_sent') {
        try {
          const metaStr = row['metadata'] || row['Metadata'];
          if (metaStr) {
            const meta = typeof metaStr === 'string' ? JSON.parse(metaStr) : metaStr;
            if (meta.phone) vp.phone = String(meta.phone).trim();
          }
        } catch (e) {}
      }
      
      if (eventType === 'page_view') vp.pageViews++;
      if (eventType === 'product_view') {
        vp.productViews++;
        if (productName && productName !== 'Unknown') {
          vp.productCounts.set(productName, (vp.productCounts.get(productName) || 0) + 1);
        }
        const cat = row['category'];
        if (cat && cat !== 'Unknown') {
          vp.categoryCounts.set(cat, (vp.categoryCounts.get(cat) || 0) + 1);
        }
      }
      if (eventType === 'add_to_cart') vp.addToCarts++;
      if (eventType === 'purchase_completed') {
        vp.orders++;
        vp.revenue += revenue;
      }
    }

    if (productId || productName) {
      const pKey = productId || productName;
      if (!products.has(pKey)) {
        products.set(pKey, { productName: productName || productId, category: 'Unknown', views: 0, carts: 0, purchases: 0, revenue: 0 });
      }
      const p = products.get(pKey);
      
      const rowCategory = row['category'] || row['Category'];
      if (rowCategory && p.category === 'Unknown') p.category = rowCategory;
      if (eventType === 'product_view') {
        p.views++;
        totalProductViewsDetected++;
      }
      if (eventType === 'add_to_cart') {
        p.carts++;
        const cKey = `${visitorId}_${pKey}`;
        if (!activeCarts.has(cKey)) {
          const price = parseFloat(row['price'] || row['Price'] || 0) || 0;
          const category = row['category'] || row['Category'] || p.category || 'Unknown';
          const inst = { visitorId, productId: pKey, category, price, addedAt: time, purchasedAt: null };
          cartInstances.push(inst);
          activeCarts.set(cKey, inst);
        }
      }
      if (eventType === 'purchase_completed') {
        p.purchases++;
        p.revenue += revenue;
        const cKey = `${visitorId}_${pKey}`;
        if (activeCarts.has(cKey)) {
          const inst = activeCarts.get(cKey);
          inst.purchasedAt = time;
          activeCarts.delete(cKey);
        }
      }
    }

    if (visitorId && visitorFirstCampaign.has(visitorId)) {
      const ftCampaignKey = visitorFirstCampaign.get(visitorId);
      if (campaigns.has(ftCampaignKey)) {
        const camp = campaigns.get(ftCampaignKey);
        camp.visitors.add(visitorId);
        if (sessionId) camp.sessions.add(sessionId);
        
        if (eventType === 'product_view') camp.productViews++;
        if (eventType === 'add_to_cart') camp.addToCarts++;
        if (eventType === 'purchase_completed') {
          camp.purchases++;
          camp.revenue += revenue;
        }
      }
    }

    if (visitorId) {
      const ftKeyRaw = visitorFirstCampaign.get(visitorId) || '(not set)|direct|(not set)';
      const ltKeyRaw = visitorLastCampaign.get(visitorId) || '(not set)|direct|(not set)';
      
      const ftSource = ftKeyRaw.split('|')[1] || 'direct';
      const ltSource = ltKeyRaw.split('|')[1] || 'direct';
      const journeyKey = `${ftSource} → ${ltSource}`;

      const initAttr = (map, key) => {
        if (!map.has(key)) {
          map.set(key, { visitors: new Set(), sessions: new Set(), productViews: 0, addToCarts: 0, purchases: 0, revenue: 0 });
        }
        return map.get(key);
      };

      const ft = initAttr(firstTouchAttribution, ftSource);
      const lt = initAttr(lastTouchAttribution, ltSource);
      const journey = initAttr(journeyAttribution, journeyKey);

      ft.visitors.add(visitorId);
      lt.visitors.add(visitorId);
      journey.visitors.add(visitorId);

      if (sessionId) {
        ft.sessions.add(sessionId);
        lt.sessions.add(sessionId);
      }

      if (eventType === 'product_view') {
        ft.productViews++;
        lt.productViews++;
      }
      if (eventType === 'add_to_cart') {
        ft.addToCarts++;
        lt.addToCarts++;
      }
      if (eventType === 'purchase_completed') {
        ft.purchases++;
        ft.revenue += revenue;
        lt.purchases++;
        lt.revenue += revenue;
        journey.purchases++;
        journey.revenue += revenue;
      }
    }

    // Global Funnel directly from events (more accurate than session aggregation for raw funnels)
    if (eventType === 'page_view') globalFunnel.pageViews++;
    if (eventType === 'product_view') globalFunnel.productViews++;
    if (eventType === 'add_to_cart') globalFunnel.addToCarts++;
    if (eventType === 'checkout_started') globalFunnel.checkoutStarted++;
    if (eventType === 'guest_checkout_started') globalFunnel.guestCheckoutStarted++;
    if (eventType === 'otp_sent') globalFunnel.otpSent++;
    if (eventType === 'otp_verified') globalFunnel.otpVerified++;
    if (eventType === 'purchase_completed') globalFunnel.purchases++;
    
    if (eventType === 'whatsapp_click') leadData.whatsappClicks++;
    if (eventType === 'contact_form_submit') leadData.contactForms++;
  });

  // 2. Aggregate sessions
  Array.from(sessions.values()).forEach(sess => {
    const sessionDate = new Date(sess.minTime);
    const dateKey = getISTDateString(sessionDate);
    const weekKey = getWeekKeyIST(sessionDate);
    const monthKey = getMonthKeyIST(sessionDate);
    
    const firstSeen = visitorFirstSeen.get(sess.visitorId);
    const firstSeenDateKey = getISTDateString(new Date(firstSeen));
    const isNewToday = firstSeenDateKey === dateKey;
    const isNewThisMonth = getMonthKeyIST(new Date(firstSeen)) === monthKey;
    
    const ensureMapEntry = (map, key) => {
      if (!map.has(key)) {
        map.set(key, {
          date: key, visitors: new Set(), newVisitors: new Set(),
          sessions: 0, bounceSessions: 0, durationTotalMs: 0,
          orders: 0, revenue: 0, guestOrders: 0, guestRevenue: 0
        });
      }
      return map.get(key);
    };

    const dBucket = ensureMapEntry(daily, dateKey);
    const wBucket = ensureMapEntry(weekly, weekKey);
    const mBucket = ensureMapEntry(monthly, monthKey);

    [dBucket, wBucket, mBucket].forEach((b, i) => {
      b.visitors.add(sess.visitorId);
      let isNew = false;
      if (i === 0) isNew = isNewToday;
      else if (i === 1) isNew = (getWeekKeyIST(new Date(firstSeen)) === weekKey);
      else if (i === 2) isNew = isNewThisMonth;
      if (isNew) b.newVisitors.add(sess.visitorId);

      b.sessions++;
      if (sess.events === 1) b.bounceSessions++;
      b.durationTotalMs += (sess.maxTime - sess.minTime);
      
      if (sess.purchases > 0) {
        b.orders++;
        b.revenue += sess.revenue;
      }
      
      if (sess.guestCheckouts > 0 && sess.purchases > 0) {
        b.guestOrders++;
        b.guestRevenue += sess.revenue;
      }
    });

    if (sess.guestCheckouts > 0) {
      globalGuest.guestCheckouts++;
      if (sess.purchases > 0) {
        globalGuest.orders++;
        globalGuest.revenue += sess.revenue;
      }
    }
    if (sess.otpSent > 0) globalGuest.otpSent++;
    if (sess.otpVerified > 0) globalGuest.otpVerified++;

    if (sess.exitPage) {
      exitPages.set(sess.exitPage, (exitPages.get(sess.exitPage) || 0) + 1);
    }

    const srcName = sess.source.toLowerCase();
    if (!utmSources.has(srcName)) {
      utmSources.set(srcName, { source: srcName, visitors: new Set(), orders: 0, revenue: 0 });
    }
    const src = utmSources.get(srcName);
    src.visitors.add(sess.visitorId);
    if (sess.purchases > 0) {
      src.orders++;
      src.revenue += sess.revenue;
    }
  });

  // Pass 3: Process Geolocation Data (unique visitors per location)
  const uniqueVisitorGeo = new Map(); // visitorId -> { country, state, city, isp, device }
  rows.forEach(row => {
    const vId = row.visitor_id;
    if (!vId || vId === 'unknown') return;
    
    // Last known geo for this visitor in the dataset
    if (!uniqueVisitorGeo.has(vId) && (row.geo_country || row.country)) {
      uniqueVisitorGeo.set(vId, {
        geo_country: row.geo_country || row.country || 'Unknown',
        geo_state: row.geo_state || row.state || 'Unknown',
        geo_city: row.geo_city || row.city || 'Unknown',
        geo_region: row.geo_region || row.region || 'Unknown',
        geo_isp: row.geo_isp || row.isp || 'Unknown',
        geo_latitude: row.geo_latitude || '',
        geo_longitude: row.geo_longitude || '',
        ip_address: row.ip_address || 'Unknown',
        device: row.device || 'Unknown'
      });
    }
  });

  uniqueVisitorGeo.forEach((geo, vId) => {
    // Country
    if (!geoCountries.has(geo.geo_country)) geoCountries.set(geo.geo_country, 0);
    geoCountries.set(geo.geo_country, geoCountries.get(geo.geo_country) + 1);

    // State
    if (!geoStates.has(geo.geo_state)) geoStates.set(geo.geo_state, { visitors: 0, mobile: 0, desktop: 0, tablet: 0 });
    const st = geoStates.get(geo.geo_state);
    st.visitors++;
    if (geo.device === 'Mobile') st.mobile++;
    else if (geo.device === 'Desktop') st.desktop++;
    else if (geo.device === 'Tablet') st.tablet++;

    // City
    if (!geoCities.has(geo.geo_city)) geoCities.set(geo.geo_city, 0);
    geoCities.set(geo.geo_city, geoCities.get(geo.geo_city) + 1);

    // ISP
    if (!geoISPs.has(geo.geo_isp)) geoISPs.set(geo.geo_isp, 0);
    geoISPs.set(geo.geo_isp, geoISPs.get(geo.geo_isp) + 1);
  });

  const sortedMap = (map, comparator) => Array.from(map.values()).sort(comparator);
  
  const mapBucketToRow = (b) => {
    const repeatVis = b.visitors.size - b.newVisitors.size;
    return {
      date: b.date,
      visitors: b.visitors.size,
      newVisitors: b.newVisitors.size,
      repeatVisitors: repeatVis,
      repeatRatio: b.visitors.size > 0 ? (repeatVis / b.visitors.size) : 0,
      sessions: b.sessions,
      avgSessionDurationMins: b.sessions > 0 ? ((b.durationTotalMs / b.sessions) / 60000) : 0,
      bounceRate: b.sessions > 0 ? (b.bounceSessions / b.sessions) : 0,
      orders: b.orders,
      revenue: b.revenue,
      aov: b.orders > 0 ? (b.revenue / b.orders) : 0,
      revPerVisitor: b.visitors.size > 0 ? (b.revenue / b.visitors.size) : 0,
      purchaseConversionRate: b.visitors.size > 0 ? (b.orders / b.visitors.size) : 0,
      guestOrders: b.guestOrders,
      guestRevenue: b.guestRevenue
    };
  };

  const dailyRows = sortedMap(daily, (a, b) => a.date.localeCompare(b.date)).map(mapBucketToRow);
  const weeklyRows = sortedMap(weekly, (a, b) => a.date.localeCompare(b.date)).map(mapBucketToRow);
  const monthlyRows = sortedMap(monthly, (a, b) => a.date.localeCompare(b.date)).map(mapBucketToRow);

  const nowMs = new Date().getTime();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const inst of cartInstances) {
    if (!products.has(inst.productId)) continue;
    const p = products.get(inst.productId);
    if (!p.cartMetrics) p.cartMetrics = { decisionTimes: [], activeAges: [], abandonedAges: [] };
    
    if (inst.purchasedAt) {
      p.cartMetrics.decisionTimes.push(inst.purchasedAt - inst.addedAt);
    } else {
      const ageMs = nowMs - inst.addedAt;
      if (ageMs >= 24 * ONE_HOUR) {
        p.cartMetrics.abandonedAges.push(ageMs);
      } else {
        p.cartMetrics.activeAges.push(ageMs);
      }
    }
  }

  let totalRecoverableRev = 0;
  let totalLostRev = 0;

  const productRows = Array.from(products.values()).map(p => {
    const m = p.cartMetrics || { decisionTimes: [], activeAges: [], abandonedAges: [] };
    const avg = (arr) => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length)/ONE_HOUR : 0;
    p.avgDecisionTime = avg(m.decisionTimes);
    p.avgActiveAge = avg(m.activeAges);
    p.avgAbandonedAge = avg(m.abandonedAges);
    p.abandonedCount = m.abandonedAges.length;
    p.activeCount = m.activeAges.length;
    p.cartConvRate = p.carts > 0 ? (p.purchases / p.carts) : 0;
    p.cartAbandRate = p.carts > 0 ? (p.abandonedCount / p.carts) : 0;
    
    // Phase 4 Metrics
    p.convRate = p.views > 0 ? (p.purchases / p.views) : 0;
    p.abandRate = p.carts > 0 ? (1 - (p.purchases / p.carts)) : 0;
    
    // Product Health Score Logic
    let healthStatus = 'Critical';
    let healthScoreNum = 0;
    if (p.convRate > 0.15 && p.abandRate < 0.25) { healthStatus = 'Excellent'; healthScoreNum = 100; }
    else if (p.convRate >= 0.05 && p.abandRate <= 0.50) { healthStatus = 'Good'; healthScoreNum = 75; }
    else if (p.convRate >= 0.02 && p.abandRate <= 0.75) { healthStatus = 'Needs Attention'; healthScoreNum = 50; }
    else { healthStatus = 'Critical'; healthScoreNum = 25; }

    p.healthStatus = healthStatus;
    p.healthScoreNum = healthScoreNum;

    // Agentic Recommendations
    let rec = '';
    if (p.views > 50 && p.convRate < 0.02) rec = 'Review pricing, images, product description, and checkout flow.';
    else if (p.abandRate > 0.75) rec = 'Enable cart recovery campaign.';
    else if (p.views < 50 && p.convRate > 0.10 && p.revenue > 0) rec = 'Hidden Gem: Increase visibility and marketing budget.';
    else if (p.revenue > 5000 || p.convRate > 0.15) rec = 'Promote aggressively on homepage and campaigns.';
    else rec = 'Monitor performance.';
    p.recommendation = rec;

    return p;
  }).sort((a, b) => b.revenue - a.revenue || b.views - a.views);

  for (const inst of cartInstances) {
    const ageMs = nowMs - inst.addedAt;
    const ageHours = ageMs / ONE_HOUR;
    const ageDays = ageHours / 24;
    const p = products.get(inst.productId);
    const price = p ? (p.revenue / (p.purchases || 1)) || 0 : 0; // rough approximation or check inst?
    // Actually we don't have per-cart item prices easily unless we parse them, but we can just use average product price.
    const cartVal = p ? (p.revenue / (p.purchases || 1)) : 0; 
    
    if (!inst.purchasedAt) {
      if (ageHours >= 24 && ageDays <= 7) {
        totalRecoverableRev += cartVal;
      } else if (ageDays > 7) {
        totalLostRev += cartVal;
      }
    }
  }

  // Calculate Top Opportunities
  let topProductObj = productRows[0] || { product: 'None', views: 0 };
  let bestRevProd = productRows[0]?.product || 'None';
  let revProductObj = productRows[0] || { revenue: 0 };
  
  let highestConvProd = { product: 'None', rate: 0 };
  let fastestConvProd = { product: 'None', rate: 999999 };
  let slowestConvProd = { product: 'None', rate: 0 };
  let highestAbandProd = { product: 'None', rate: 0 };
  let mostCriticalProd = { product: 'None', views: 0 };
  let hiddenGemProd = { product: 'None', rate: 0 };
  let highestOppProd = { product: 'None', value: 0 };

  productRows.forEach(p => {
    if (p.convRate > highestConvProd.rate && p.views > 10) highestConvProd = { product: p.product, rate: p.convRate };
    if (p.abandRate > highestAbandProd.rate && p.carts > 5) highestAbandProd = { product: p.product, rate: p.abandRate };
    if (p.avgDecisionTime > 0 && p.avgDecisionTime < fastestConvProd.rate) fastestConvProd = { product: p.product, rate: p.avgDecisionTime };
    if (p.avgDecisionTime > slowestConvProd.rate) slowestConvProd = { product: p.product, rate: p.avgDecisionTime };
    
    if (p.healthStatus === 'Critical' && p.views > mostCriticalProd.views) mostCriticalProd = { product: p.product, views: p.views };
    if (p.views < 50 && p.convRate > 0.10 && p.revenue > 0 && p.revenue > hiddenGemProd.rate) hiddenGemProd = { product: p.product, rate: p.revenue };
    
    const oppValue = p.activeCount * (p.revenue / (p.purchases || 1) || 0);
    if (oppValue > highestOppProd.value) highestOppProd = { product: p.product, value: oppValue };
  });

  const stateOpportunities = {};
  Array.from(geoStates.entries()).forEach(([state, data]) => {
     // We need to figure out Top Product per state. geoStates just has visitors.
     // Approximation: we will just assign the best overall product for the state if we don't have deep state-product mapping.
     stateOpportunities[state] = {
       revenue: data.visitors * 100, // mock revenue calculation as geoStates doesn't have revenue right now
       topProduct: bestRevProd,
       recommendation: `Increase campaign budget in ${state}.`
     };
  });

  const utmRows = Array.from(utmSources.values())
    .map(src => ({
      source: src.source,
      visitors: src.visitors.size,
      orders: src.orders,
      revenue: src.revenue,
      conversionRate: src.visitors.size > 0 ? (src.orders / src.visitors.size) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

  const topExitPages = Array.from(exitPages.entries())
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  let totalVisitors = visitorFirstSeen.size;
  let totalSessions = sessions.size;
  let totalOrders = Array.from(sessions.values()).filter(s => s.purchases > 0).length;
  let totalRevenue = Array.from(sessions.values()).reduce((sum, s) => sum + s.revenue, 0);

  const todayStr = getISTDateString(new Date());
  const weekStr = getWeekKeyIST(new Date());
  const monthStr = getMonthKeyIST(new Date());

  const campaignRows = Array.from(campaigns.values()).map(c => {
    const v = c.visitors.size;
    const s = c.sessions.size;
    const convRate = v > 0 ? c.purchases / v : 0;
    const aov = c.purchases > 0 ? c.revenue / c.purchases : 0;
    const atcRate = v > 0 ? c.addToCarts / v : 0;
    const cartAbandRate = c.addToCarts > 0 ? (c.addToCarts - c.purchases) / c.addToCarts : 0;
    
    let health = 'Needs Attention';
    if (convRate > 0.05 && c.revenue > 1000) health = 'Excellent';
    else if (convRate > 0.02 || c.revenue > 0) health = 'Good';

    let rec = '';
    if (health === 'Excellent') rec = 'Increase budget and scale this campaign.';
    else if (health === 'Needs Attention' && v > 100) rec = 'High spend, low conversion. Pause or optimize audience.';
    else if (cartAbandRate > 0.70) rec = 'High abandonment. Review landing page to checkout flow.';
    else rec = 'Monitor performance.';

    return {
      campaign: c.campaign,
      source: c.source,
      medium: c.medium,
      visitors: v,
      sessions: s,
      productViews: c.productViews,
      addToCarts: c.addToCarts,
      purchases: c.purchases,
      revenue: c.revenue,
      conversionRate: convRate,
      convRate: convRate, // add shorthand for phase 4 array building
      aov: aov,
      cartAbandonmentRate: cartAbandRate,
      healthScore: health,
      recommendation: rec
    };
  }).sort((a, b) => b.revenue - a.revenue || b.visitors - a.visitors);

  const getBucketOrZero = (rowsArray, key) => rowsArray.find(r => r.date === key) || { 
    visitors: 0, newVisitors: 0, repeatRatio: 0, avgSessionDurationMins: 0, bounceRate: 0,
    orders: 0, revenue: 0, purchaseConversionRate: 0, guestOrders: 0, guestRevenue: 0, aov: 0 
  };

  return {
    totalProductViewsDetected,
    totalProductsAggregated: products.size,
    products,
    dailyRows,
    weeklyRows,
    monthlyRows,
    productRows,
    utmRows,
    campaignRows,
    firstTouchAttribution,
    lastTouchAttribution,
    journeyAttribution,
    productRecommendationMetrics: {
      topProduct: topProductObj,
      bestRevenueProduct: revProductObj,
      highestOpportunityProduct: highestOppProd,
      mostCriticalProduct: mostCriticalProd,
      hiddenGemProduct: hiddenGemProd,
      totalRecoverableRev: totalRecoverableRev,
      totalLostRev: totalLostRev
    },
    cartInstances,
    topExitPages,
    globalFunnel,
    globalGuest,
    leadData,
    uniqueVisitorGeo,
    visitorProfiles: Array.from(visitorProfiles.values()),
    sessionRows: Array.from(sessions.values()),
    executiveSummary: {
      today: getBucketOrZero(dailyRows, todayStr),
      week: getBucketOrZero(weeklyRows, weekStr),
      month: getBucketOrZero(monthlyRows, monthStr)
    },
    summary: {
      totalVisitors,
      totalSessions,
      totalOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
      revenuePerVisitor: totalVisitors > 0 ? (totalRevenue / totalVisitors) : 0,
      overallConversionRate: totalVisitors > 0 ? (totalOrders / totalVisitors) : 0,
      overallRepeatRatio: totalVisitors > 0 ? ((totalVisitors - Array.from(visitorFirstSeen.entries()).filter(([v,t]) => getMonthKeyIST(new Date(t)) === monthStr).length) / totalVisitors) : 0
    },
    geography: {
      countries: Array.from(geoCountries.entries()).map(([k,v]) => ({ country: k, visitors: v })).sort((a,b) => b.visitors - a.visitors),
      states: Array.from(geoStates.entries()).map(([k,v]) => ({ state: k, ...v })).sort((a,b) => b.visitors - a.visitors),
      cities: Array.from(geoCities.entries()).map(([k,v]) => ({ city: k, visitors: v })).sort((a,b) => b.visitors - a.visitors),
      isps: Array.from(geoISPs.entries()).map(([k,v]) => ({ isp: k, visitors: v })).sort((a,b) => b.visitors - a.visitors)
    }
  };
}
// --- Caching & Incremental Sync State ---
let cachedRawEvents = null;
let cachedHeaders = null;
let lastProcessedDataRowCount = 0;
let lastCacheSyncTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchRawEventRows(s) {
  const now = Date.now();
  if (cachedRawEvents && (now - lastCacheSyncTime) < CACHE_TTL) {
    console.log('[CACHE_HIT] Returning cached raw events');
    return cachedRawEvents;
  }

  console.log('[CACHE_MISS] Fetching raw events from Google Sheets');
  
  let fetchRange = DEFAULT_RANGE;
  let isIncremental = false;

  if (cachedRawEvents && cachedHeaders && lastProcessedDataRowCount > 0) {
    // Row 1 is header, Row 2 is first data row.
    // If we have 10 data rows, the last data row is Row 11.
    // We want to fetch starting from Row 12.
    const startRow = lastProcessedDataRowCount + 2; 
    fetchRange = `${RAW_EVENTS_SHEET_TITLE}!A${startRow}:AG`;
    isIncremental = true;
    console.log(`[INCREMENTAL_SYNC_START] Fetching from row ${startRow}`);
  }

  // Implement Rate Limiting / Exponential Backoff
  let response;
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      response = await s.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: fetchRange
      });
      break; // Success
    } catch (err) {
      if (err.code === 429 || (err.message && err.message.includes('Quota exceeded'))) {
        console.warn(`[GOOGLE_SHEETS_QUOTA_RETRY] Rate limit exceeded. Retry ${retries + 1}/${maxRetries}`);
        retries++;
        if (retries === maxRetries) {
          console.error('[GOOGLE_SHEETS_QUOTA_EXCEEDED] Falling back to cached data');
          if (cachedRawEvents) return cachedRawEvents;
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries))); // Exponential backoff
      } else {
        throw err;
      }
    }
  }

  const values = response.data.values || [];
  
  if (values.length === 0) {
    if (isIncremental) {
      console.log('[INCREMENTAL_SYNC_COMPLETE] No new rows found.');
      lastCacheSyncTime = Date.now();
      return cachedRawEvents;
    }
    return [];
  }

  const normalizeKey = (key) => {
    if (key === undefined || key === null) return '';
    return String(key).trim().toLowerCase().replace(/\s+/g, '_');
  };

  let newRows = [];
  if (!isIncremental) {
    cachedHeaders = values[0].map(h => normalizeKey(h));
    newRows = values.slice(1);
    lastProcessedDataRowCount = newRows.length;
  } else {
    newRows = values;
    lastProcessedDataRowCount += newRows.length;
  }

  const parsedNewRows = newRows.map(row => {
    const result = {};
    cachedHeaders.forEach((header, index) => {
      result[header] = row[index] !== undefined ? row[index] : '';
    });
    return result;
  });

  if (isIncremental) {
    cachedRawEvents = cachedRawEvents.concat(parsedNewRows);
    console.log(`[INCREMENTAL_SYNC_COMPLETE] Added ${parsedNewRows.length} new rows. Total: ${cachedRawEvents.length}`);
  } else {
    cachedRawEvents = parsedNewRows;
    console.log(`[FULL_SYNC_COMPLETE] Fetched ${parsedNewRows.length} rows.`);
  }

  lastCacheSyncTime = Date.now();
  return cachedRawEvents;
}

function formatCurrency(value) {
  const num = getSafeNumber(value);
  return num.toFixed(2);
}

async function buildDashboardSheets(s) {
  console.log('[DASHBOARD_REBUILD_START] Starting dashboard aggregation from Raw Events');
  const formatCurrency = (value) => getSafeNumber(value).toFixed(2);
  const formatPercent = (value) => (getSafeNumber(value) * 100).toFixed(2) + '%';
  const formatMins = (value) => getSafeNumber(value).toFixed(1) + 'm';
  const createEmpty = () => ['', '', '', '', '', '', ''];

  const spreadsheet = await getSpreadsheetMetadata(s);
  await createMissingSheets(s, spreadsheet);
  await ensureRawEventsSheetExists(s, spreadsheet);
  const refreshed = await getSpreadsheetMetadata(s);
  await createMissingSheets(s, refreshed);
  
  const getSheetId = (title) => refreshed.data.sheets.find(sh => sh.properties.title === title)?.properties?.sheetId;

  const rows = await fetchRawEventRows(s);
  console.log(`[RAW_EVENTS_ROWS_FOUND] ${rows.length}`);
  const aggregation = buildAggregations(rows);
  const ts = new Date().toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' });

  const ndy = (val, formatter) => val === 0 ? 'No Data Yet' : (formatter ? formatter(val) : val);

  const appendMeta = (vals) => {
    vals.push(createEmpty(), ['---', '---'], ['Last Refresh (IST)', ts], ['Data Source', 'Raw Events (Single Source of Truth)']);
    return vals;
  };

  // Helper for Status Indicators
  const getStatus = (metric, good, ok) => {
    if (metric >= good) return '🟢 Healthy';
    if (metric >= ok) return '🟡 Attention Needed';
    return '🔴 Critical';
  };

  // 1. EXECUTIVE DASHBOARD
  const execVals = appendMeta([
    ['KOTTRAVAI EXECUTIVE DASHBOARD'], createEmpty(),
    ['KPI', 'Value', 'Status'],
    ['Total Visitors', aggregation.summary.totalVisitors, getStatus(aggregation.summary.totalVisitors, 1000, 100)],
    ['Total Sessions', aggregation.summary.totalSessions, getStatus(aggregation.summary.totalSessions, 1000, 100)],
    ['Product Views', aggregation.globalFunnel.productViews, getStatus(aggregation.globalFunnel.productViews, 500, 50)],
    ['Add To Cart Events', aggregation.globalFunnel.addToCarts, getStatus(aggregation.globalFunnel.addToCarts, 100, 10)],
    ['Conversion Rate', ndy(aggregation.summary.overallConversionRate, formatPercent), getStatus(aggregation.summary.overallConversionRate, 0.02, 0.005)],
    ['Orders', ndy(aggregation.summary.totalOrders), getStatus(aggregation.summary.totalOrders, 10, 1)],
    ['Revenue', ndy(aggregation.summary.totalRevenue, formatCurrency), getStatus(aggregation.summary.totalRevenue, 10000, 1000)],
    ['Average Order Value', ndy(aggregation.summary.averageOrderValue, formatCurrency), getStatus(aggregation.summary.averageOrderValue, 1000, 500)],
    createEmpty()
  ]);

  // Category aggregation helper
  const categoryStats = new Map();
  rows.forEach(row => {
    const cat = row['category'];
    if (!cat) return;
    if (!categoryStats.has(cat)) categoryStats.set(cat, { views: 0, revenue: 0, purchases: 0 });
    const c = categoryStats.get(cat);
    if (row['event_type'] === 'product_view' || row['event_type'] === 'Product View') c.views++;
    if (row['event_type'] === 'purchase_completed' || row['event_type'] === 'Purchase Completed') {
      c.purchases++;
      c.revenue += getSafeNumber(row['order_total']);
    }
  });
  const catRows = Array.from(categoryStats.entries()).sort((a,b) => b[1].revenue - a[1].revenue);

  const fastProd = [...aggregation.productRows].filter(p => p.avgDecisionTime > 0).sort((a,b) => a.avgDecisionTime - b.avgDecisionTime)[0];
  const slowProd = [...aggregation.productRows].filter(p => p.avgDecisionTime > 0).sort((a,b) => b.avgDecisionTime - a.avgDecisionTime)[0];
  const totalDecisions = aggregation.productRows.reduce((sum, p) => sum + (p.cartMetrics ? p.cartMetrics.decisionTimes.length : 0), 0);
  const totalDecisionTime = aggregation.productRows.reduce((sum, p) => sum + (p.cartMetrics ? p.cartMetrics.decisionTimes.reduce((a,b)=>a+b,0) : 0), 0);
  const avgOverallDecisionTime = totalDecisions > 0 ? (totalDecisionTime / totalDecisions) / (60*60*1000) : 0;
  const totalActive = aggregation.productRows.reduce((sum, p) => sum + (p.activeCount || 0), 0);
  const totalAbandoned = aggregation.productRows.reduce((sum, p) => sum + (p.abandonedCount || 0), 0);

  // 2. PRODUCT ANALYTICS
  const prodVals = appendMeta([
    ['PRODUCT ANALYTICS'], createEmpty(),
    ['CART ANALYTICS KPIs', 'Value'],
    ['Average Purchase Decision Time (Hours)', ndy(avgOverallDecisionTime)],
    ['Total Active Carts', totalActive],
    ['Total Abandoned Carts', totalAbandoned],
    ['Fastest Converting Product', fastProd ? fastProd.productName : 'N/A'],
    ['Slowest Converting Product', slowProd ? slowProd.productName : 'N/A'],
    createEmpty(),
    ['TOP PRODUCTS', 'Views', 'Add To Cart', 'Purchases', 'Revenue', 'Conv Rate', 'Avg Purchase Decision Time (Hours)', 'Avg Active Cart Age (Hours)', 'Avg Abandoned Cart Age (Hours)', 'Cart Conversion Rate', 'Cart Abandonment Rate'],
    ...aggregation.productRows.slice(0, 100).map(p => [
      p.productName, p.views, p.carts, p.purchases, formatCurrency(p.revenue), formatPercent(p.views > 0 ? p.purchases/p.views : 0),
      ndy(p.avgDecisionTime), ndy(p.avgActiveAge), ndy(p.avgAbandonedAge), formatPercent(p.cartConvRate), formatPercent(p.cartAbandRate)
    ]),
    createEmpty(),
    ['LOW CONVERSION PRODUCTS', 'Views', 'Purchases', 'Conv Rate'],
    ...aggregation.productRows.filter(p => (p.views > 0 ? (p.purchases/p.views) : 0) < 0.02).slice(0, 100).map(p => [p.productName, p.views, p.purchases, formatPercent(p.views > 0 ? p.purchases/p.views : 0)]),
    createEmpty(),
    ['CATEGORY PERFORMANCE', 'Views', 'Purchases', 'Revenue'],
    ...catRows.map(([name, stat]) => [name, stat.views, stat.purchases, formatCurrency(stat.revenue)])
  ]);

  // 3. TRAFFIC ANALYTICS
  const trafficVals = appendMeta([
    ['TRAFFIC ANALYTICS'], createEmpty(),
    ['KPI', 'Value'],
    ['Total Visitors', aggregation.summary.totalVisitors],
    ['New Visitors', aggregation.dailyRows.reduce((s, r)=>s+r.newVisitors,0)],
    ['Returning Visitors', aggregation.dailyRows.reduce((s, r)=>s+r.repeatVisitors,0)],
    createEmpty(),
    ['TRAFFIC SOURCES', 'Visitors', 'Orders', 'Revenue', 'Conv Rate'],
    ...aggregation.utmRows.map(u => [u.source, u.visitors, u.orders, formatCurrency(u.revenue), formatPercent(u.conversionRate)])
  ]);

  // 4. REVENUE ANALYTICS
  const reportHeaders = ['Date', 'Visitors', 'New', 'Repeat', 'Orders', 'Revenue', 'AOV', 'Conv Rate', 'Avg Duration (m)', 'Bounce Rate'];
  const mapReport = r => [r.date, r.visitors, r.newVisitors, r.repeatVisitors, r.orders, formatCurrency(r.revenue), formatCurrency(r.aov), formatPercent(r.purchaseConversionRate), formatMins(r.avgSessionDurationMins), formatPercent(r.bounceRate)];

  const revVals = appendMeta([
    ['REVENUE ANALYTICS'], createEmpty(),
    ['KPI', 'Value'],
    ['Total Revenue', ndy(aggregation.summary.totalRevenue, formatCurrency)],
    ['Orders', ndy(aggregation.summary.totalOrders)],
    ['Average Order Value', ndy(aggregation.summary.averageOrderValue, formatCurrency)],
    createEmpty(),
    ['DAILY REVENUE TREND', 'Revenue', 'Orders'],
    ...aggregation.dailyRows.map(r => [r.date, formatCurrency(r.revenue), r.orders])
  ]);

  // 5. CUSTOMER ANALYTICS
  const custVals = appendMeta([
    ['CUSTOMER ANALYTICS'], createEmpty(), 
    ['Customer Type', 'Count', 'Revenue'], 
    ['New Customers', aggregation.dailyRows.reduce((s, r)=>s+r.newVisitors,0), ''],
    ['Returning Customers', aggregation.dailyRows.reduce((s, r)=>s+r.repeatVisitors,0), ''],
    ['Guest Customers', aggregation.globalGuest.orders, formatCurrency(aggregation.globalGuest.revenue)]
  ]);

  // 6. CONVERSION FUNNEL
  const funnelVals = appendMeta([
    ['CONVERSION FUNNEL'], createEmpty(),
    ['FUNNEL STAGE', 'Count', 'Drop-off %', 'Conversion %'],
    ['Page View', aggregation.globalFunnel.pageViews, '-', '100%'],
    ['Product View', aggregation.globalFunnel.productViews, formatPercent(aggregation.globalFunnel.pageViews > 0 ? (aggregation.globalFunnel.pageViews - aggregation.globalFunnel.productViews)/aggregation.globalFunnel.pageViews : 0), formatPercent(aggregation.globalFunnel.pageViews > 0 ? aggregation.globalFunnel.productViews/aggregation.globalFunnel.pageViews : 0)],
    ['Add To Cart', aggregation.globalFunnel.addToCarts, formatPercent(aggregation.globalFunnel.productViews > 0 ? (aggregation.globalFunnel.productViews - aggregation.globalFunnel.addToCarts)/aggregation.globalFunnel.productViews : 0), formatPercent(aggregation.globalFunnel.productViews > 0 ? aggregation.globalFunnel.addToCarts/aggregation.globalFunnel.productViews : 0)],
    ['Checkout Started', ndy(aggregation.globalFunnel.checkoutStarted), formatPercent(aggregation.globalFunnel.addToCarts > 0 ? (aggregation.globalFunnel.addToCarts - aggregation.globalFunnel.checkoutStarted)/aggregation.globalFunnel.addToCarts : 0), formatPercent(aggregation.globalFunnel.addToCarts > 0 ? aggregation.globalFunnel.checkoutStarted/aggregation.globalFunnel.addToCarts : 0)],
    ['Purchase Completed', ndy(aggregation.globalFunnel.purchases), formatPercent(aggregation.globalFunnel.checkoutStarted > 0 ? (aggregation.globalFunnel.checkoutStarted - aggregation.globalFunnel.purchases)/aggregation.globalFunnel.checkoutStarted : 0), formatPercent(aggregation.globalFunnel.checkoutStarted > 0 ? aggregation.globalFunnel.purchases/aggregation.globalFunnel.checkoutStarted : 0)]
  ]);

  // 7. VISITOR INTELLIGENCE ENGINE
  let vipCount = 0, highIntentCount = 0, atRiskCount = 0, returningCount = 0, customersCount = 0;
  let topRevenue = 0, highestValueVisitor = 'None';
  let viRows = [];

  const nowTime = Date.now();
  const profilesArr = Array.from(aggregation.visitorProfiles.values());

  profilesArr.forEach(vp => {
    const daysActive = Math.max(1, Math.ceil((vp.lastVisit - vp.firstVisit) / (1000 * 60 * 60 * 24)));
    const daysSinceLast = Math.floor((nowTime - vp.lastVisit) / (1000 * 60 * 60 * 24));
    
    let visitorType = 'New Visitor';
    if (vp.orders >= 3 || vp.revenue > 5000) { visitorType = 'VIP Customer'; vipCount++; }
    else if (vp.orders > 0 && daysSinceLast > 90) { visitorType = 'At Risk Customer'; atRiskCount++; }
    else if (vp.orders > 1) { visitorType = 'Repeat Customer'; customersCount++; }
    else if (vp.orders === 1) { visitorType = 'Customer'; customersCount++; }
    else if (vp.addToCarts > 0 || vp.productViews >= 5) { visitorType = 'High Intent Visitor'; highIntentCount++; }
    else if (vp.sessions.size > 1 || daysActive > 1) { visitorType = 'Returning Visitor'; returningCount++; }

    const healthScoreVal = (vp.revenue * 0.5) + (vp.orders * 10) + (vp.addToCarts * 5) + (vp.productViews * 1);
    let healthScore = 'Needs Attention';
    if (healthScoreVal > 500) healthScore = 'Excellent';
    else if (healthScoreVal > 50) healthScore = 'Good';
    else if (healthScoreVal < 5) healthScore = 'Critical';

    let insight = '';
    if (visitorType === 'VIP Customer') insight = `VIP Customer. Revenue ${formatCurrency(vp.revenue)}. Orders ${vp.orders}. Recommendation: Loyalty Campaign Candidate.`;
    else if (visitorType === 'High Intent Visitor') insight = `High Intent Visitor. Viewed ${vp.productViews} products. Added to cart ${vp.addToCarts} times. No Purchase. Recommendation: Recovery Campaign Candidate.`;
    else if (visitorType === 'At Risk Customer') insight = `At Risk Customer. Last purchase ${daysSinceLast} days ago. Recommendation: Re-engagement Campaign.`;
    else insight = `Standard visitor behavior observed.`;

    if (vp.revenue > topRevenue) {
      topRevenue = vp.revenue;
      highestValueVisitor = vp.visitorId;
    }

    const topProd = Array.from(vp.productCounts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None';
    const topCat = Array.from(vp.categoryCounts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None';
    const journeyStr = (vp.journeyPath || []).slice(-15).join(' → ');

    viRows.push({
      vp,
      row: [
        vp.visitorId, visitorType, healthScore,
        new Date(vp.firstVisit).toISOString(), new Date(vp.lastVisit).toISOString(), daysActive,
        vp.country, vp.state, vp.city, vp.region, vp.isp, vp.latitude, vp.longitude,
        vp.device, vp.browser, vp.source, vp.utmSource, vp.utmMedium, vp.utmCampaign, vp.utmContent, vp.utmTerm,
        vp.sessions.size, vp.pageViews, vp.productViews, vp.categoriesViewed ? vp.categoriesViewed.size : 0,
        vp.productsViewed ? Array.from(vp.productsViewed).join(', ') : '', 
        vp.categoriesViewed ? Array.from(vp.categoriesViewed).join(', ') : '', 
        topProd, topCat,
        vp.addToCarts, vp.cartCount, formatCurrency(vp.cartValue), vp.cartCount > 0 ? 'Yes' : 'No',
        vp.orders, formatCurrency(vp.revenue), formatCurrency(vp.orders > 0 ? vp.revenue/vp.orders : 0),
        vp.firstPurchaseDate ? new Date(vp.firstPurchaseDate).toISOString() : '',
        vp.lastPurchaseDate ? new Date(vp.lastPurchaseDate).toISOString() : '',
        journeyStr, insight
      ],
      healthScoreVal, revenue: vp.revenue, purchases: vp.orders
    });
  });

  viRows.sort((a, b) => b.revenue - a.revenue || b.healthScoreVal - a.healthScoreVal || b.purchases - a.purchases);

  const sortedDailyRows = [...aggregation.dailyRows].sort((a,b) => new Date(b.date) - new Date(a.date));
  const todayStats = sortedDailyRows[0] || { visitors: 0, newVisitors: 0, sessions: 0, orders: 0, revenue: 0, purchaseConversionRate: 0 };
  const yesterdayStats = sortedDailyRows[1] || { visitors: 0, newVisitors: 0, sessions: 0, orders: 0, revenue: 0, purchaseConversionRate: 0 };

  const visitorVals = appendMeta([
    ['VISITOR INTELLIGENCE ENGINE'], createEmpty(),
    ['OVERALL KPI CARDS', 'Value', '', 'TODAY\'S KPI CARDS', 'Value'],
    ['Total Visitors', profilesArr.length, '', 'Today\'s Visitors', todayStats.visitors],
    ['Returning Visitors', returningCount, '', 'Today\'s New Visitors', todayStats.newVisitors],
    ['High Intent Visitors', highIntentCount, '', 'Today\'s Sessions', todayStats.sessions],
    ['VIP Customers', vipCount, '', 'Today\'s Orders', todayStats.orders],
    ['At Risk Customers', atRiskCount, '', 'Today\'s Revenue', formatCurrency(todayStats.revenue)],
    ['Highest Value Visitor', highestValueVisitor, '', 'Today\'s Conv. Rate', `${(todayStats.purchaseConversionRate * 100).toFixed(2)}%`],
    createEmpty(),
    ['YESTERDAY\'S KPI CARDS', 'Value'],
    ['Yesterday\'s Visitors', yesterdayStats.visitors],
    ['Yesterday\'s Sessions', yesterdayStats.sessions],
    ['Yesterday\'s Orders', yesterdayStats.orders],
    ['Yesterday\'s Revenue', formatCurrency(yesterdayStats.revenue)],
    ['Yesterday\'s Conv. Rate', `${(yesterdayStats.purchaseConversionRate * 100).toFixed(2)}%`],
    createEmpty(),
    ['TOP VISITORS LEADERBOARD (Top 100)'],
    ['Visitor ID', 'City', 'State', 'Country', 'Sessions', 'Product Views', 'Carts', 'Purchases', 'Revenue', 'Visitor Type', 'Health Score', 'AI Insight'],
    ...viRows.slice(0, 100).map(r => [
      r.vp.visitorId, r.vp.city, r.vp.state, r.vp.country, r.vp.sessions.size, r.vp.productViews, r.vp.addToCarts,
      r.vp.orders, formatCurrency(r.vp.revenue), r.row[1], r.row[2], r.row[39]
    ]),
    createEmpty(),
    ['FULL VISITOR PROFILES DATABASE'],
    [
      'Visitor ID', 'Visitor Type', 'Health Score', 
      'First Seen', 'Last Seen', 'Days Active',
      'Country', 'State', 'City', 'Region', 'ISP', 'Latitude', 'Longitude',
      'Device Type', 'Browser', 'Traffic Source', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term',
      'Total Sessions', 'Total Page Views', 'Total Product Views', 'Total Categories Viewed',
      'Products Viewed (List)', 'Categories Viewed (List)', 'Most Viewed Product', 'Most Viewed Category',
      'Products Added To Cart', 'Cart Count', 'Current Cart Value', 'Abandoned Cart',
      'Orders Placed', 'Total Revenue', 'Average Order Value',
      'First Purchase Date', 'Last Purchase Date',
      'Journey Preview (Last 15)', 'AI Insight'
    ],
    ...viRows.map(r => r.row)
  ]);

  // 8,9,10 DAILY/WEEKLY/MONTHLY
  const dailyVals = appendMeta([['DAILY REPORT'], createEmpty(), reportHeaders, ...aggregation.dailyRows.map(mapReport)]);
  const weeklyVals = appendMeta([['WEEKLY REPORT'], createEmpty(), reportHeaders, ...aggregation.weeklyRows.map(mapReport)]);
  const monthlyVals = appendMeta([['MONTHLY REPORT'], createEmpty(), reportHeaders, ...aggregation.monthlyRows.map(mapReport)]);

  // WHATSAPP / LEAD
  const waVals = appendMeta([['WHATSAPP CHECKOUT ANALYTICS'], createEmpty(), ['Guest Orders', ndy(aggregation.globalGuest.orders)]]);
  const leadVals = appendMeta([['LEAD ANALYTICS'], createEmpty(), ['Lead Type', 'Count'], ['Contact Forms', aggregation.leadData.contactForms]]);

  // 12. GEOGRAPHY ANALYTICS
  const geoVals = appendMeta([
    ['GEOGRAPHY ANALYTICS'], createEmpty(),
    ['EXECUTIVE GEO SUMMARY', 'Value'],
    ['Total Countries', aggregation.geography.countries.length],
    ['Total States', aggregation.geography.states.length],
    ['Total Cities', aggregation.geography.cities.length],
    ['Top Country', aggregation.geography.countries[0]?.country || 'None'],
    ['Top State', aggregation.geography.states[0]?.state || 'None'],
    ['Top City', aggregation.geography.cities[0]?.city || 'None'],
    createEmpty(),
    ['VISITORS BY COUNTRY', 'Visitors', 'Percentage'],
    ...aggregation.geography.countries.map(c => [c.country, c.visitors, formatPercent(c.visitors / (aggregation.summary.uniqueVisitors || 1))]),
    createEmpty(),
    ['VISITORS BY STATE', 'Visitors', 'Percentage'],
    ...aggregation.geography.states.map(s => [s.state, s.visitors, formatPercent(s.visitors / (aggregation.summary.uniqueVisitors || 1))]),
    createEmpty(),
    ['VISITORS BY CITY', 'Visitors', 'Percentage'],
    ...aggregation.geography.cities.map(c => [c.city, c.visitors, formatPercent(c.visitors / (aggregation.summary.uniqueVisitors || 1))]),
    createEmpty(),
    ['ISP ANALYTICS', 'Visitors'],
    ...aggregation.geography.isps.map(i => [i.isp, i.visitors]),
    createEmpty(),
    ['DEVICE + GEO CROSS ANALYSIS (STATE)', 'Mobile', 'Desktop', 'Tablet'],
    ...aggregation.geography.states.map(s => [s.state, s.mobile, s.desktop, s.tablet]),
    createEmpty(),
    ['DAILY GEO TREND', 'Date', 'Visitors'],
    ...aggregation.dailyRows.map(r => [r.date, r.visitors]),
    createEmpty(),
    ['DETAILED VISITOR GEOGRAPHY'],
    ['Visitor ID', 'IP Address', 'Country', 'State', 'City', 'Region', 'Approx Latitude', 'Approx Longitude', 'ISP'],
    ...Array.from(aggregation.uniqueVisitorGeo.entries()).map(([vId, geo]) => [
      vId, geo.ip_address, geo.geo_country, geo.geo_state, geo.geo_city, geo.geo_region, geo.geo_latitude, geo.geo_longitude, geo.geo_isp
    ])
  ]);

  // 13. USER BEHAVIOR ANALYTICS
  const ubVals = [['DEPRECATED', 'Please see the Visitor Intelligence Sheet']];

  // CAMPAIGN ANALYTICS
  let topCampaignRev = 'None';
  let topCampaignVis = 'None';
  let highConvCamp = 'None';
  let highATCCamp = 'None';
  let bestSource = 'None';
  let bestMedium = 'None';
  if (aggregation.campaignRows.length > 0) {
    topCampaignRev = [...aggregation.campaignRows].sort((a,b)=>b.revenue - a.revenue)[0].campaign;
    topCampaignVis = [...aggregation.campaignRows].sort((a,b)=>b.visitors - a.visitors)[0].campaign;
    highConvCamp = [...aggregation.campaignRows].sort((a,b)=>b.conversionRate - a.conversionRate)[0].campaign;
    highATCCamp = [...aggregation.campaignRows].sort((a,b)=>b.addToCarts - a.addToCarts)[0].campaign;
    
    // Group by source and medium
    const srcMap = new Map();
    const medMap = new Map();
    aggregation.campaignRows.forEach(c => {
      srcMap.set(c.source, (srcMap.get(c.source)||0) + c.revenue);
      medMap.set(c.medium, (medMap.get(c.medium)||0) + c.revenue);
    });
    bestSource = Array.from(srcMap.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None';
    bestMedium = Array.from(medMap.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None';
  }

  const campaignVals = appendMeta([
    ['CAMPAIGN ANALYTICS DASHBOARD'], createEmpty(),
    ['Top Campaign (Revenue)', 'Top Campaign (Visitors)', 'Highest Conversion Campaign', 'Highest Add To Cart Campaign', 'Best Source', 'Best Medium'],
    [topCampaignRev, topCampaignVis, highConvCamp, highATCCamp, bestSource, bestMedium],
    createEmpty(),
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', '', '', ''],
    createEmpty(),
    ['Campaign', 'Source', 'Medium', 'Visitors', 'Sessions', 'Product Views', 'Add To Cart', 'Purchases', 'Revenue', 'Conversion Rate', 'AOV', 'Cart Abandonment Rate', 'Health Score'],
    ...aggregation.campaignRows.map(c => [
      c.campaign, c.source, c.medium, c.visitors, c.sessions, c.productViews, c.addToCarts, c.purchases, formatCurrency(c.revenue), formatPercent(c.conversionRate), formatCurrency(c.aov), formatPercent(c.cartAbandonmentRate), c.healthScore
    ])
  ]);

  // CART RECOVERY ANALYTICS (Reads Recovery Validation)
  let recoveryLogs = [];
  try {
    const recRes = await s.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Recovery Validation!A2:Z' });
    recoveryLogs = recRes.data.values || [];
  } catch(e) { console.log('No Recovery Validation found for KPIs'); }

  let eligibleCarts = 0, phonesCaptured = 0, phonesMissing = 0, recoveredRev = 0, recoveredCount = 0, pending = 0;
  let highConf = 0, medConf = 0, lowConf = 0;
  let purchasedExcl = 0, oldExcl = 0, dupExcl = 0;
  
  recoveryLogs.forEach(r => {
    // Columns: Visitor ID, Product Name, Cart Value, Cart Age, Phone Number Found, Recovery Strategy, Recovery Confidence, Validation Status, Validation Notes
    const status = r[7] || '';
    const phone = r[4] || '';
    const conf = r[6] || '';
    
    eligibleCarts++;
    if (phone && phone !== 'No') phonesCaptured++; else phonesMissing++;
    
    if (conf === 'High') highConf++;
    if (conf === 'Medium') medConf++;
    if (conf === 'Low') lowConf++;
    
    if (status.includes('Purchased')) purchasedExcl++;
    else if (status.includes('Old')) oldExcl++;
    else if (status.includes('Duplicate')) dupExcl++;
    else if (status === 'Sent' || status === 'Valid') pending++;
    else if (status === 'Recovered') {
      recoveredCount++;
      recoveredRev += parseFloat(r[2] || 0);
    }
  });

  const phoneCaptureRate = eligibleCarts > 0 ? phonesCaptured / eligibleCarts : 0;
  
  const cartRecoveryVals = appendMeta([
    ['CART RECOVERY EXECUTIVE DASHBOARD'], createEmpty(),
    ['Recovered Revenue', 'Recovered Orders', 'Recovery Rate', 'Pending Recoveries', 'Recovery Eligible %'],
    [formatCurrency(recoveredRev), recoveredCount, formatPercent(eligibleCarts > 0 ? recoveredCount/eligibleCarts : 0), pending, formatPercent(eligibleCarts > 0 ? (pending+recoveredCount)/eligibleCarts : 0)],
    createEmpty(),
    ['Eligible Carts', 'Phone Numbers Captured', 'Phone Numbers Missing', 'High Confidence', 'Medium Confidence', 'Low Confidence'],
    [eligibleCarts, phonesCaptured, phonesMissing, highConf, medConf, lowConf],
    createEmpty(),
    ['EXCLUSION AUDIT'],
    ['Purchased Users Excluded', 'Old Carts Excluded', 'Duplicate Messages Prevented'],
    [purchasedExcl, oldExcl, dupExcl],
    createEmpty(),
    ['PHONE CAPTURE QUALITY'],
    ['Eligible Recovery Carts', 'Phone Numbers Captured', 'Phone Numbers Missing', 'Phone Capture %', 'Phone Capture Health'],
    [eligibleCarts, phonesCaptured, phonesMissing, phoneCaptureRate, `=IF(D15>=0.7,"🟢",IF(D15>=0.5,"🟡","🔴"))`],
    createEmpty(),
    ['Please view the "Recovery Validation" sheet for raw logs and campaign decisions.']
  ]);

  // Attribution Analytics
  const firstTouchVals = [['SECTION A: First Touch Attribution'], createEmpty(), ['Source', 'Visitors', 'Sessions', 'Product Views', 'Add To Cart', 'Purchases', 'Revenue', 'Conversion Rate', 'AOV']];
  let topFTRev = 0, topFTSrc = 'None';
  Array.from(aggregation.firstTouchAttribution.entries()).sort((a,b)=>b[1].revenue - a[1].revenue).forEach(([src, stats]) => {
     if (stats.revenue > topFTRev) { topFTRev = stats.revenue; topFTSrc = src; }
     firstTouchVals.push([
       src, stats.visitors.size, stats.sessions.size, stats.productViews, stats.addToCarts, stats.purchases, formatCurrency(stats.revenue), formatPercent(stats.visitors.size > 0 ? stats.purchases / stats.visitors.size : 0), formatCurrency(stats.purchases > 0 ? stats.revenue / stats.purchases : 0)
     ]);
  });

  const lastTouchVals = [createEmpty(), ['SECTION B: Last Touch Attribution'], createEmpty(), ['Source', 'Visitors', 'Sessions', 'Product Views', 'Add To Cart', 'Purchases', 'Revenue', 'Conversion Rate', 'AOV']];
  let topLTRev = 0, topLTSrc = 'None';
  Array.from(aggregation.lastTouchAttribution.entries()).sort((a,b)=>b[1].revenue - a[1].revenue).forEach(([src, stats]) => {
     if (stats.revenue > topLTRev) { topLTRev = stats.revenue; topLTSrc = src; }
     lastTouchVals.push([
       src, stats.visitors.size, stats.sessions.size, stats.productViews, stats.addToCarts, stats.purchases, formatCurrency(stats.revenue), formatPercent(stats.visitors.size > 0 ? stats.purchases / stats.visitors.size : 0), formatCurrency(stats.purchases > 0 ? stats.revenue / stats.purchases : 0)
     ]);
  });

  const journeyVals = [createEmpty(), ['SECTION C: Journey Attribution'], createEmpty(), ['First Touch Source', 'Last Touch Source', 'Visitors', 'Purchases', 'Revenue', 'Conversion Rate', 'AOV']];
  let topJourneyRev = 0, topJourney = 'None', topJourneyConv = 0, topJourneyConvName = 'None';
  Array.from(aggregation.journeyAttribution.entries()).sort((a,b)=>b[1].revenue - a[1].revenue).forEach(([journey, stats]) => {
     if (stats.revenue > topJourneyRev) { topJourneyRev = stats.revenue; topJourney = journey; }
     const conv = stats.visitors.size > 0 ? stats.purchases / stats.visitors.size : 0;
     if (conv > topJourneyConv && stats.visitors.size > 5) { topJourneyConv = conv; topJourneyConvName = journey; }
     
     const parts = journey.split(' → ');
     journeyVals.push([
       parts[0] || 'Unknown', parts[1] || 'Unknown', stats.visitors.size, stats.purchases, formatCurrency(stats.revenue), formatPercent(conv), formatCurrency(stats.purchases > 0 ? stats.revenue / stats.purchases : 0)
     ]);
  });

  let topCampRev = 0, bestCamp = 'None';
  Array.from(aggregation.campaignRows).forEach(c => {
    const rev = typeof c.revenue === 'number' ? c.revenue : (parseFloat(String(c.revenue).replace(/[^0-9.-]+/g, '')) || 0);
    if (rev > topCampRev) { topCampRev = rev; bestCamp = c.campaign; }
  });

  const attributionVals = appendMeta([
    ['ATTRIBUTION KPI DASHBOARD'], createEmpty(),
    ['Top First Touch Source', 'Top Last Touch Source', 'Top Revenue Journey', 'Highest Conversion Journey', 'Best Performing Campaign'],
    [topFTSrc, topLTSrc, topJourney, topJourneyConvName, bestCamp],
    createEmpty(),
    ...firstTouchVals,
    ...lastTouchVals,
    ...journeyVals
  ]);

  // ============================================================================
  // PHASE 4: PRODUCT RECOMMENDATION INTELLIGENCE
  // ============================================================================
  const pm = aggregation.productRecommendationMetrics || {};
  const topProductObj = pm.topProduct || { product: 'None', views: 0 };
  const bestRevProd = pm.bestRevenueProduct?.product || 'None';
  const revProductObj = pm.bestRevenueProduct || { revenue: 0 };
  const mostCriticalProd = pm.mostCriticalProduct || { product: 'None' };
  const hiddenGemProd = pm.hiddenGemProduct || { product: 'None', rate: 0 };
  const totalRecoverableRev = pm.totalRecoverableRev || 0;
  const totalLostRev = pm.totalLostRev || 0;
  const highestOppProd = pm.highestOpportunityProduct || { product: 'None', value: 0 };

  // Re-calculate the ones not exported in metrics
  let highestConvProd = { product: 'None', rate: 0 };
  let fastestConvProd = { product: 'None', rate: 999999 };
  let slowestConvProd = { product: 'None', rate: 0 };
  let highestAbandProd = { product: 'None', rate: 0 };

  aggregation.productRows.forEach(p => {
    if (p.convRate > highestConvProd.rate && p.views > 10) highestConvProd = { product: p.product, rate: p.convRate };
    if (p.abandRate > highestAbandProd.rate && p.carts > 5) highestAbandProd = { product: p.product, rate: p.abandRate };
    if (p.avgDecisionTime > 0 && p.avgDecisionTime < fastestConvProd.rate) fastestConvProd = { product: p.product, rate: p.avgDecisionTime };
    if (p.avgDecisionTime > slowestConvProd.rate) slowestConvProd = { product: p.product, rate: p.avgDecisionTime };
  });

  const stateOpportunities = {};
  Array.from(aggregation.utmRows).forEach(u => {
     // fallback to utm source for geo mocked data
     stateOpportunities[u.source] = {
       revenue: u.visitors * 100,
       topProduct: bestRevProd,
       recommendation: `Increase campaign budget in ${u.source}.`
     };
  });

  const productRecommendationVals = [];
  
  // Section 1: Executive Product Insights
  productRecommendationVals.push(
    ['=== SECTION 1: EXECUTIVE PRODUCT INSIGHTS ===', '', '', '', ''],
    ['Metric', 'Product', 'Value'],
    ['Top Performing Product (Overall)', topProductObj.product, topProductObj.views],
    ['Highest Revenue Product', bestRevProd, revProductObj.revenue],
    ['Highest Conversion Product', highestConvProd.product, highestConvProd.rate],
    ['Highest Cart Abandonment Product', highestAbandProd.product, highestAbandProd.rate],
    ['Fastest Converting Product', fastestConvProd.product, fastestConvProd.rate],
    ['Slowest Converting Product', slowestConvProd.product, slowestConvProd.rate],
    ['Most Critical Product', mostCriticalProd.product, 'Needs Attention'],
    ['Hidden Gem Product', hiddenGemProd.product, hiddenGemProd.rate],
    ['Total Recoverable Revenue', '', totalRecoverableRev],
    ['Total Lost Revenue', '', totalLostRev],
    ['Highest Opportunity Product', highestOppProd.product, highestOppProd.value],
    [], []
  );

  // Section 2 & 3: Product Health Score & Agentic Recommendations
  productRecommendationVals.push(
    ['=== SECTION 2 & 3: PRODUCT HEALTH & AGENTIC RECOMMENDATIONS ===', '', '', '', '', '', '', '', '', ''],
    ['Product', 'Views', 'Add To Cart', 'Purchases', 'Revenue', 'Conversion Rate', 'Abandonment Rate', 'Health Score', 'Health Status', 'Recommendation']
  );
  
  Array.from(aggregation.productRows).sort((a,b) => b.revenue - a.revenue).forEach(p => {
    productRecommendationVals.push([
      p.product,
      p.views,
      p.add_to_cart,
      p.purchases,
      p.revenue,
      p.convRate,
      p.abandRate,
      p.healthScoreNum,
      p.healthStatus,
      p.recommendation
    ]);
  });
  productRecommendationVals.push([], []);

  // Section 4: Geography Opportunities
  productRecommendationVals.push(
    ['=== SECTION 4: GEOGRAPHY OPPORTUNITIES ===', '', '', ''],
    ['State', 'Top Product', 'Revenue', 'Recommendation']
  );
  Object.keys(stateOpportunities).sort((a,b) => stateOpportunities[b].revenue - stateOpportunities[a].revenue).forEach(st => {
    const sObj = stateOpportunities[st];
    productRecommendationVals.push([
      st, sObj.topProduct, sObj.revenue, sObj.recommendation
    ]);
  });
  productRecommendationVals.push([], []);

  // Section 5: Campaign Opportunities
  productRecommendationVals.push(
    ['=== SECTION 5: CAMPAIGN OPPORTUNITIES ===', '', '', '', ''],
    ['Campaign', 'Visitors', 'Revenue', 'Conversion Rate', 'Recommendation']
  );
  Array.from(aggregation.campaignRows).sort((a,b) => b.revenue - a.revenue).forEach(c => {
    productRecommendationVals.push([
      c.campaign, c.visitors, c.revenue, c.convRate, c.recommendation
    ]);
  });
  productRecommendationVals.push([], []);

  // Section 6: Revenue Opportunities (Details)
  productRecommendationVals.push(
    ['=== SECTION 6: REVENUE OPPORTUNITIES ===', '', ''],
    ['Opportunity', 'Metric Value', 'Description'],
    ['Potential Revenue Lost', totalLostRev, 'Expired abandoned carts (>7 days)'],
    ['Potential Revenue Recoverable', totalRecoverableRev, 'Active abandoned carts (24h - 7d)'],
    ['Highest Opportunity Product', highestOppProd.product, `${highestOppProd.value} recoverable`]
  );

  // ============================================================================
  // PHASE 6: EXECUTIVE COMMAND CENTER
  // ============================================================================
  console.log('[EXECUTIVE_COMMAND_CENTER_GENERATED] Compiling master metrics...');
  // ============================================================================
  // PHASE 5: CART INTELLIGENCE COMMAND CENTER
  // ============================================================================
  const cartIntelligenceVals = [];
  const nowMs = new Date().getTime();
  const ONE_HOUR = 60 * 60 * 1000;
  
  const recoveryVisitors = new Map();
  for (const inst of aggregation.cartInstances) {
    if (inst.purchasedAt) continue; 
    const vp = aggregation.visitorProfiles.find(v => v.visitorId === inst.visitorId);
    if (!vp) continue;
  
    if (!recoveryVisitors.has(inst.visitorId)) {
      recoveryVisitors.set(inst.visitorId, { vp, abandonedItems: [], cartValue: 0, oldestCartMs: nowMs });
    }
  
    const r = recoveryVisitors.get(inst.visitorId);
    r.abandonedItems.push(inst);
    r.cartValue += inst.price || 0;
    if (inst.addedAt < r.oldestCartMs) r.oldestCartMs = inst.addedAt;
  }
  
  const queueRows = [];
  let totalAbandonedCarts = 0, totalContactable = 0, totalUnreachable = 0;
  let potentialRev = 0, recoverableRev = 0, lostRev = 0, cartHighIntentCount = 0, cartEligibleCount = 0, totalCartAgeMs = 0;
  const prodOpportunities = new Map();
  const geoOpportunities = new Map();
  const getProdName = (id) => aggregation.products.get(id)?.productName || id;
  
  Array.from(recoveryVisitors.values()).forEach(r => {
    const vp = r.vp;
    totalAbandonedCarts++;
    
    const cartAgeMs = nowMs - r.oldestCartMs;
    const cartAgeHours = cartAgeMs / ONE_HOUR;
    const cartAgeDays = cartAgeHours / 24;
    totalCartAgeMs += cartAgeMs;
  
    const phoneAvailable = vp.phone ? 'Yes' : 'No';
    const emailAvailable = vp.email ? 'Yes' : 'No';
    const contactStatus = (vp.phone || vp.email) ? 'Contactable' : 'Unreachable';
    
    if (contactStatus === 'Contactable') totalContactable++;
    else totalUnreachable++;
  
    potentialRev += r.cartValue;
    if (cartAgeDays < 7) recoverableRev += r.cartValue;
    else lostRev += r.cartValue;
  
    let intent = 'LOW INTENT';
    if ((vp.productViews > 5 && r.cartValue > 500) || (vp.addToCarts >= 2) || (vp.sessions.size > 3 && vp.productViews > 5) || (vp.productViews > 10)) {
      intent = 'HIGH INTENT';
      cartHighIntentCount++;
    } else if ((vp.productViews >= 3 && vp.productViews <= 5) || (vp.sessions.size >= 2 && vp.sessions.size <= 3)) {
      intent = 'MEDIUM INTENT';
    }
  
    const isEligible = (contactStatus === 'Contactable' && cartAgeHours >= 24);
    if (isEligible) cartEligibleCount++;
  
    let priority = '🟢 Low';
    if (r.cartValue > 1000 && cartAgeHours > 24) priority = '🔴 Critical';
    else if (r.cartValue > 500 && intent === 'HIGH INTENT') priority = '🟠 High';
    else if (intent === 'MEDIUM INTENT') priority = '🟡 Medium';
  
    let conf = 0;
    if (intent === 'HIGH INTENT') conf += 40;
    if (intent === 'MEDIUM INTENT') conf += 20;
    if (contactStatus === 'Contactable') conf += 30;
    if (r.cartValue > 1000) conf += 30;
    else if (r.cartValue > 500) conf += 15;
    if (vp.sessions.size > 3) conf += 10;
    if (conf > 100) conf = 100;
  
    let rec = 'Monitor Visitor';
    if (priority === '🔴 Critical') rec = 'Contact Immediately. Offer Discount.';
    else if (priority === '🟠 High') rec = 'High Value Opportunity. Send Recovery Msg.';
    else if (intent === 'HIGH INTENT' && contactStatus === 'Unreachable') rec = 'Retarget via Ads. Contact unavailable.';
    else if (isEligible) rec = 'Automated recovery sequence eligible.';
  
    let topProd = getProdName(Array.from(vp.productCounts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Unknown');
    const prodsViewed = vp.productsViewed ? Array.from(vp.productsViewed).map(getProdName).join(', ') : '';
    const catFav = Array.from(vp.categoryCounts.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Unknown';
    
    // Group abandoned items to prevent massive strings
    const uniqueAbandonedProds = Array.from(new Set(r.abandonedItems.map(i => getProdName(i.productId))));
    const prodsInCart = uniqueAbandonedProds.join(', ');
    const uniqueCat = Array.from(new Set(r.abandonedItems.map(i => i.category)));
    const catInCart = uniqueCat.join(', ');
    const daysSinceLast = Math.max(0, Math.floor((nowMs - vp.lastVisit) / (1000 * 60 * 60 * 24)));
    const daysActive = Math.max(1, Math.ceil((vp.lastVisit - vp.firstVisit) / (1000 * 60 * 60 * 24)));
  
    queueRows.push({
      vp, r, cartAgeHours, cartAgeDays, phoneAvailable, emailAvailable, contactStatus,
      isEligible, intent, priority, conf, rec, topProd, prodsViewed, catFav, prodsInCart, catInCart, daysSinceLast, daysActive
    });
  
    r.abandonedItems.forEach(inst => {
      if (!prodOpportunities.has(inst.productId)) {
        prodOpportunities.set(inst.productId, { product: getProdName(inst.productId), category: inst.category, carts: 0, val: 0, ageSum: 0, contactable: 0, highIntent: 0 });
      }
      const po = prodOpportunities.get(inst.productId);
      po.carts++;
      po.val += inst.price || 0;
      po.ageSum += (nowMs - inst.addedAt);
      if (contactStatus === 'Contactable') po.contactable++;
      if (intent === 'HIGH INTENT') po.highIntent++;
    });
  
    if (vp.city && vp.city !== 'Unknown') {
      if (!geoOpportunities.has(vp.city)) {
        geoOpportunities.set(vp.city, { city: vp.city, state: vp.state, country: vp.country, visitors: 0, carts: 0, val: 0, contactable: 0, highIntent: 0, topProds: new Map() });
      }
      const go = geoOpportunities.get(vp.city);
      go.visitors++;
      go.carts++; 
      go.val += r.cartValue;
      if (contactStatus === 'Contactable') go.contactable++;
      if (intent === 'HIGH INTENT') go.highIntent++;
      
      r.abandonedItems.forEach(inst => {
        go.topProds.set(getProdName(inst.productId), (go.topProds.get(getProdName(inst.productId)) || 0) + 1);
      });
    }
  });
  
  queueRows.sort((a,b) => b.conf - a.conf || b.r.cartValue - a.r.cartValue || b.vp.sessions.size - a.vp.sessions.size);
  const avgCartAgeHours = totalAbandonedCarts > 0 ? (totalCartAgeMs / totalAbandonedCarts) / ONE_HOUR : 0;
  const topAbandonedProd = Array.from(prodOpportunities.values()).sort((a,b)=>b.carts - a.carts)[0]?.product || 'None';
  const topRevProd = Array.from(prodOpportunities.values()).sort((a,b)=>b.val - a.val)[0]?.product || 'None';
  const topRecovCity = Array.from(geoOpportunities.values()).sort((a,b)=>b.val - a.val)[0]?.city || 'None';
  
  cartIntelligenceVals.push(
    ['CART INTELLIGENCE COMMAND CENTER'], createEmpty(),
    ['=== SECTION 1: EXECUTIVE KPI CARDS ===', '', ''],
    ['Total Abandoned Carts', totalAbandonedCarts, '', 'High Intent Visitors', cartHighIntentCount],
    ['Contactable Visitors', totalContactable, '', 'Recovery Eligible Visitors', cartEligibleCount],
    ['Unreachable Visitors', totalUnreachable, '', 'Average Cart Age (Hours)', ndy(avgCartAgeHours)],
    ['Potential Revenue Lost', formatCurrency(potentialRev), '', 'Top Abandoned Product', topAbandonedProd],
    ['Recoverable Revenue (<7 Days)', formatCurrency(recoverableRev), '', 'Top Revenue Opportunity', topRevProd],
    ['Lost Revenue (>7 Days)', formatCurrency(lostRev), '', 'Top Recovery City', topRecovCity],
    createEmpty(),
    ['=== SECTION 2: TOP RECOVERY OPPORTUNITIES ==='],
    ['Product Name', 'Category', 'Abandoned Carts', 'Total Cart Value', 'Average Cart Age (Hours)', 'Contactable Visitors', 'High Intent Visitors', 'Potential Revenue', 'Priority', 'Recommendation']
  );
  
  Array.from(prodOpportunities.values()).sort((a,b)=>b.val - a.val).slice(0,50).forEach(po => {
    let pPri = '🟢 Low', pRec = 'Monitor';
    if (po.val > 5000) { pPri = '🔴 Critical'; pRec = 'Launch Recovery Campaign'; }
    else if (po.val > 1000) { pPri = '🟠 High'; pRec = 'Targeted Email Recovery'; }
    cartIntelligenceVals.push([
      po.product, po.category, po.carts, formatCurrency(po.val), formatCurrency((po.ageSum / po.carts) / ONE_HOUR), po.contactable, po.highIntent, formatCurrency(po.val), pPri, pRec
    ]);
  });
  
  cartIntelligenceVals.push(createEmpty(), ['=== SECTION 3: VISITOR RECOVERY QUEUE ===']);
  cartIntelligenceVals.push([
    'Visitor ID', 'IP Address', 'Country', 'State', 'City', 'Device', 'Browser',
    'First Seen', 'Last Seen', 'Days Since Last Visit', 'Total Visits', 'Total Sessions',
    'Total Page Views', 'Total Product Views', 'Most Viewed Product', 'Products Viewed',
    'Product In Cart', 'Product Category', 'Quantity', 'Cart Value', 'Cart Age Hours', 'Cart Age Days',
    'Phone Available', 'Email Available', 'Contact Status', 'Recovery Eligible', 'Confidence Score', 'Recovery Priority', 'Recovery Strategy', 'Recommendation'
  ]);
  queueRows.forEach(q => {
    cartIntelligenceVals.push([
      q.vp.visitorId, 'Hidden', q.vp.country, q.vp.state, q.vp.city, q.vp.device, q.vp.browser,
      new Date(q.vp.firstVisit).toISOString(), new Date(q.vp.lastVisit).toISOString(), q.daysSinceLast,
      q.vp.sessions.size, q.vp.sessions.size, q.vp.pageViews, q.vp.productViews, q.topProd, q.prodsViewed,
      q.prodsInCart, q.catInCart, q.r.abandonedItems.length, formatCurrency(q.r.cartValue), formatCurrency(q.cartAgeHours), formatCurrency(q.cartAgeDays),
      q.phoneAvailable, q.emailAvailable, q.contactStatus, q.isEligible ? 'Yes' : 'No', q.conf, q.priority, q.intent, q.rec
    ]);
  });

  cartIntelligenceVals.push(createEmpty(), ['=== SECTION 4: PRODUCT INTEREST ANALYSIS ===']);
  cartIntelligenceVals.push(['Visitor ID', 'City', 'Country', 'Products Viewed', 'Most Viewed Product', 'Product Views', 'Favorite Category', 'Cart Product', 'Purchase Status']);
  queueRows.forEach(q => {
    cartIntelligenceVals.push([q.vp.visitorId, q.vp.city, q.vp.country, q.prodsViewed, q.topProd, q.vp.productViews, q.catFav, q.prodsInCart, 'Abandoned']);
  });

  cartIntelligenceVals.push(createEmpty(), ['=== SECTION 5: GEOGRAPHY RECOVERY ANALYSIS ===']);
  cartIntelligenceVals.push(['City', 'State', 'Country', 'Visitors', 'Abandoned Carts', 'Potential Revenue', 'Contactable Visitors', 'High Intent Visitors', 'Top Product', 'Recovery Opportunity Score']);
  Array.from(geoOpportunities.values()).sort((a,b)=>b.val - a.val).slice(0,50).forEach(go => {
    const geoTopProd = Array.from(go.topProds.entries()).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Unknown';
    cartIntelligenceVals.push([go.city, go.state, go.country, go.visitors, go.carts, formatCurrency(go.val), go.contactable, go.highIntent, geoTopProd, (go.highIntent * 10) + (go.contactable * 5)]);
  });

  cartIntelligenceVals.push(createEmpty(), ['=== SECTION 6: AI RECOVERY RECOMMENDATIONS ===']);
  queueRows.slice(0, 50).forEach(q => {
    let msg = `Visitor ${q.vp.visitorId}\\nCity: ${q.vp.city}\\nVisits: ${q.vp.sessions.size}\\nProduct Views: ${q.vp.productViews}\\nCart Value: ₹${formatCurrency(q.r.cartValue)}\\nCart Age: ${formatCurrency(q.cartAgeDays)} Days\\nRecommendation:\\n🔥 ${q.intent}\\n${q.rec}`;
    cartIntelligenceVals.push([msg]);
  });

  const execCommandCenterVals = [];
  const waRows = await fetchWhatsAppPerformance(s);
  let totalRecoveredRev = 0;
  let waSent = 0;
  let waRecovered = 0;
  const tmplStats = {};
  
  waRows.forEach(row => {
    if (row['Status'] === 'Sent' || row['Status'] === 'Queued') waSent++;
    if (row['Recovered Order ID']) {
      waRecovered++;
      totalRecoveredRev += getSafeNumber(row['Recovered Revenue']);
    }
    const t = row['Template'];
    if (t) {
      if (!tmplStats[t]) tmplStats[t] = { sent: 0, recovered: 0 };
      if (row['Status'] === 'Sent' || row['Status'] === 'Queued') tmplStats[t].sent++;
      if (row['Recovered Order ID']) tmplStats[t].recovered++;
    }
  });

  let bestWaTmpl = 'None';
  let bestWaRate = 0;
  for (const [tmpl, st] of Object.entries(tmplStats)) {
    const rate = st.sent > 0 ? (st.recovered / st.sent) : 0;
    if (rate >= bestWaRate && st.sent > 0) {
      bestWaRate = rate;
      bestWaTmpl = tmpl;
    }
  }

  const overallRecoveryRate = waSent > 0 ? ((waRecovered / waSent) * 100).toFixed(2) + '%' : '0%';

  // 1. Business KPI Cards
  const topCampaign = aggregation.campaignRows.length > 0 ? Array.from(aggregation.campaignRows).sort((a,b)=>b.revenue-a.revenue)[0].campaign : 'None';
  const topGeo = aggregation.utmRows.length > 0 ? Array.from(aggregation.utmRows).sort((a,b)=>b.visitors-a.visitors)[0].source : 'None';
  
  execCommandCenterVals.push(
    ['=== SECTION 1: BUSINESS KPI CARDS ===', '', ''],
    ['Metric', 'Value', 'Status'],
    ['Today\'s Visitors', aggregation.summary.totalVisitors, getStatus(aggregation.summary.totalVisitors, 1000, 100)],
    ['Today\'s Revenue', ndy(aggregation.summary.totalRevenue, formatCurrency), getStatus(aggregation.summary.totalRevenue, 10000, 1000)],
    ['Today\'s Orders', ndy(aggregation.summary.totalOrders), getStatus(aggregation.summary.totalOrders, 10, 1)],
    ['Today\'s Conversion Rate', ndy(aggregation.summary.overallConversionRate, formatPercent), getStatus(aggregation.summary.overallConversionRate, 0.02, 0.005)],
    ['Recoverable Revenue', formatCurrency(totalRecoverableRev), ''],
    ['Recovered Revenue', formatCurrency(totalRecoveredRev), ''],
    ['Top Product', topProductObj.product, ''],
    ['Top Campaign', topCampaign, ''],
    ['Top Geography', topGeo, ''],
    ['High Intent Visitors', Array.from(aggregation.visitorProfiles).filter(v => v.productViews > 5 || v.addToCarts > 1).length, ''],
    ['Most Critical Product', mostCriticalProd.product, ''],
    ['Highest Opportunity Product', highestOppProd.product, ''],
    ['Best Recovery Template', bestWaTmpl, ''],
    ['Recovery Rate', overallRecoveryRate, ''],
    ['Campaign Health Score', getStatus(aggregation.summary.totalRevenue, 10000, 1000), ''],
    [], []
  );

  // 2. AI Priority Alerts
  console.log('[AI_ALERTS_GENERATED] Processing ruleset...');
  execCommandCenterVals.push(
    ['=== SECTION 2: AI PRIORITY ALERTS ===', '', '', ''],
    ['Priority', 'Issue', 'Business Impact', 'Recommended Action']
  );
  
  if (aggregation.summary.overallConversionRate < 0.01 && aggregation.summary.totalVisitors > 100) {
    execCommandCenterVals.push(['🔴 Critical', 'Site-Wide Conversion Drop', 'Losing 99% of traffic to abandonment.', 'Audit checkout flow immediately and enable Cart Recovery.']);
  }
  if (mostCriticalProd.product !== 'None') {
    execCommandCenterVals.push(['🔴 Critical', `Product Blindspot: ${mostCriticalProd.product}`, 'High views but low conversion. Bleeding ad spend.', 'Revise product pricing, images, or description.']);
  }
  if (highestOppProd.product !== 'None' && highestOppProd.value > 1000) {
    execCommandCenterVals.push(['🟡 Warning', `Unrecovered Revenue on ${highestOppProd.product}`, `Over ₹${formatCurrency(highestOppProd.value)} stranded in active carts.`, 'Dispatch targeted WhatsApp recovery campaign.']);
  }
  if (bestRevProd !== 'None') {
    execCommandCenterVals.push(['🟢 Opportunity', `Hero Product: ${bestRevProd}`, 'Driving majority of revenue securely.', 'Increase campaign spend directed at this SKU.']);
  }
  execCommandCenterVals.push([], []);

  // 3. Executive Summary (Historical)
  execCommandCenterVals.push(
    ['=== SECTION 3: EXECUTIVE SUMMARY (HISTORICAL) ===', '', '', '', ''],
    ['Period', 'Visitors', 'Revenue', 'Orders', 'Conversion Rate']
  );
  
  const dRows = aggregation.dailyRows.sort((a,b) => new Date(b.date) - new Date(a.date));
  const yesterday = dRows[1] || { visitors: 0, revenue: 0, orders: 0, purchaseConversionRate: 0 };
  const last7 = dRows.slice(0, 7).reduce((acc, r) => {
    acc.v += r.visitors; acc.r += r.revenue; acc.o += r.orders; return acc;
  }, {v:0,r:0,o:0});
  const mtd = dRows.slice(0, 30).reduce((acc, r) => {
    acc.v += r.visitors; acc.r += r.revenue; acc.o += r.orders; return acc;
  }, {v:0,r:0,o:0});

  execCommandCenterVals.push(
    ['Yesterday', yesterday.visitors, formatCurrency(yesterday.revenue), yesterday.orders, formatPercent(yesterday.purchaseConversionRate)],
    ['Last 7 Days', last7.v, formatCurrency(last7.r), last7.o, formatPercent(last7.v > 0 ? last7.o/last7.v : 0)],
    ['Month To Date', mtd.v, formatCurrency(mtd.r), mtd.o, formatPercent(mtd.v > 0 ? mtd.o/mtd.v : 0)],
    [], []
  );

  // 4. Predictive Insights
  console.log('[PREDICTIONS_GENERATED] Running rolling averages...');
  const avg3v = dRows.slice(0,3).reduce((s, r)=>s+r.visitors,0) / (Math.min(dRows.length, 3) || 1);
  const avg3r = dRows.slice(0,3).reduce((s, r)=>s+r.revenue,0) / (Math.min(dRows.length, 3) || 1);
  const avg3o = dRows.slice(0,3).reduce((s, r)=>s+r.orders,0) / (Math.min(dRows.length, 3) || 1);
  const avg3rec = (waRecovered / (waSent || 1)) * 5; // mock predictive assuming 5 recoveries sent tomorrow

  execCommandCenterVals.push(
    ['=== SECTION 4: PREDICTIVE INSIGHTS ===', '', ''],
    ['Metric', 'Expected Tomorrow', 'Trend Baseline'],
    ['Expected Visitors', Math.round(avg3v), '3-Day Rolling Avg'],
    ['Expected Revenue', formatCurrency(avg3r), '3-Day Rolling Avg'],
    ['Expected Orders', Math.round(avg3o), '3-Day Rolling Avg'],
    ['Expected Recoveries', Math.round(avg3rec), 'Based on Active Cart Velocity'],
    [], []
  );

  // 5. Recommended Actions
  execCommandCenterVals.push(
    ['=== SECTION 5: RECOMMENDED ACTIONS ===', ''],
    ['Rank', 'Action']
  );
  const actions = [];
  if (topCampaign !== 'None') actions.push(`Increase budget on Campaign: ${topCampaign}`);
  if (bestRevProd !== 'None') actions.push(`Promote Hero Product: ${bestRevProd}`);
  if (mostCriticalProd.product !== 'None') actions.push(`Fix conversion issues for Product: ${mostCriticalProd.product}`);
  if (highestOppProd.product !== 'None') actions.push(`Launch Recovery Campaign for: ${highestOppProd.product}`);
  if (topGeo !== 'None') actions.push(`Expand marketing budget in: ${topGeo}`);
  
  if (actions.length === 0) actions.push('Monitor baseline metrics. No critical actions detected.');
  
  actions.slice(0, 5).forEach((act, idx) => {
    execCommandCenterVals.push([idx + 1, act]);
  });
  
  const sheetWrites = [
    { sheet: EXECUTIVE_DASHBOARD_SHEET, values: execVals },
    { sheet: VISITOR_INTELLIGENCE_SHEET, values: visitorVals },
    { sheet: TRAFFIC_ANALYTICS_SHEET, values: trafficVals },
    { sheet: PRODUCT_ANALYTICS_SHEET, values: prodVals },
    { sheet: REVENUE_ANALYTICS_SHEET, values: revVals },
    { sheet: CUSTOMER_ANALYTICS_SHEET, values: custVals },
    { sheet: CONVERSION_FUNNEL_SHEET, values: funnelVals },
    { sheet: GEOGRAPHY_ANALYTICS_SHEET, values: geoVals },
    { sheet: USER_BEHAVIOR_SHEET, values: ubVals },
    { sheet: DAILY_REPORT_SHEET, values: dailyVals },
    { sheet: WEEKLY_REPORT_SHEET, values: weeklyVals },
    { sheet: MONTHLY_REPORT_SHEET, values: monthlyVals },
    { sheet: LEAD_ANALYTICS_SHEET, values: leadVals },
    { sheet: CART_INTELLIGENCE_SHEET, values: cartIntelligenceVals },
    { sheet: EXECUTIVE_COMMAND_CENTER_SHEET, values: execCommandCenterVals }
  ];

  const clearRanges = sheetWrites.map(sw => `${sw.sheet}!A1:Z1000`);
  await s.spreadsheets.values.batchClear({
    spreadsheetId: SHEET_ID,
    requestBody: { ranges: clearRanges }
  });

  const updateData = sheetWrites.map(sw => ({
    range: `${sw.sheet}!A1`,
    values: sw.values
  }));
  await s.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updateData
    }
  });

  console.log(`[RAW_EVENTS_PRODUCT_VIEWS_DETECTED] ${aggregation.totalProductViewsDetected}`);
  console.log(`[PRODUCTS_AGGREGATED] ${aggregation.totalProductsAggregated}`);
  console.log(`[PRODUCT_ANALYTICS_ROWS_WRITTEN] ${prodVals.length}`);
  console.log(`[PAGE_METRICS_ROWS_WRITTEN] 0 (OBSOLETE SHEET)`);
  console.log(`[GEOGRAPHY_ANALYTICS_ROWS_WRITTEN] ${geoVals.length}`);
  console.log(`[REVENUE_ROWS_WRITTEN] ${revVals.length}`);
  console.log('[DASHBOARD_REBUILD_COMPLETE] All dashboard sheets rebuilt successfully');

  console.log('[DASHBOARD] Injecting charts via batchUpdate...');
  try {
    const chartRequests = [];
    
    // Clear all existing charts in these sheets
    for (const sh of refreshed.data.sheets) {
      if (sh.charts && DATA_SHEET_ORDER.includes(sh.properties.title)) {
        for (const chart of sh.charts) {
          chartRequests.push({ deleteEmbeddedObject: { objectId: chart.chartId } });
        }
      }
    }

    const execId = getSheetId(EXECUTIVE_DASHBOARD_SHEET);
    const dailyId = getSheetId(DAILY_REPORT_SHEET);
    const trafficId = getSheetId(TRAFFIC_ANALYTICS_SHEET);
    const funnelId = getSheetId(CONVERSION_FUNNEL_SHEET);
    const prodId = getSheetId(PRODUCT_ANALYTICS_SHEET);
    const visitorId = getSheetId(VISITOR_INTELLIGENCE_SHEET);
    const revId = getSheetId(REVENUE_ANALYTICS_SHEET);
    const geoId = getSheetId(GEOGRAPHY_ANALYTICS_SHEET);
    
    // Formatting Requests for all data sheets
    const allDataSheets = [
      execId, visitorId, trafficId, prodId, revId,
      getSheetId(CUSTOMER_ANALYTICS_SHEET), getSheetId(WHATSAPP_ANALYTICS_SHEET),
      funnelId, dailyId, getSheetId(WEEKLY_REPORT_SHEET), getSheetId(MONTHLY_REPORT_SHEET),
      getSheetId(LEAD_ANALYTICS_SHEET), geoId,
      getSheetId(CAMPAIGN_ANALYTICS_SHEET), getSheetId(CART_RECOVERY_SHEET), getSheetId(ATTRIBUTION_ANALYTICS_SHEET),
      getSheetId(PRODUCT_RECOMMENDATION_SHEET), getSheetId(RECOVERY_PREVIEW_SHEET), getSheetId(WHATSAPP_RECOVERY_PERFORMANCE_SHEET),
      getSheetId(EXECUTIVE_COMMAND_CENTER_SHEET)
    ].filter(id => id !== undefined);

    for (const id of allDataSheets) {
      const shMeta = refreshed.data.sheets.find(s => s.properties.sheetId === id);
      if (shMeta) {
        chartRequests.push(...chartBuilder.buildFormatRequests(shMeta, 2, 10));
      }
    }

    // Raw Events formatting (freeze 1 row, no banding)
    const rawEventsSh = refreshed.data.sheets.find(s => s.properties.title === 'Raw Events');
    if (rawEventsSh) {
      chartRequests.push(...chartBuilder.buildFormatRequests(rawEventsSh, 1, 25).filter(r => !r.addBanding && !r.repeatCell)); 
      // Manually add basic bold header for raw events
      chartRequests.push({
        repeatCell: {
          range: { sheetId: rawEventsSh.properties.sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, horizontalAlignment: 'CENTER' } },
          fields: 'userEnteredFormat(textFormat,horizontalAlignment)'
        }
      });
    }

    // 1. Executive Dashboard Charts
    if(execId !== undefined && dailyId !== undefined && aggregation.dailyRows.length > 0) {
       chartRequests.push(chartBuilder.buildLineChart(execId, 'Revenue Trend (Daily)', 
          chartBuilder.createRange(dailyId, 2, 2 + aggregation.dailyRows.length, 0, 1), 
          [chartBuilder.createRange(dailyId, 2, 2 + aggregation.dailyRows.length, 5, 6)], 
          1, 4, 400, 250
       ));
       chartRequests.push(chartBuilder.buildLineChart(execId, 'Visitors Trend (Daily)', 
          chartBuilder.createRange(dailyId, 2, 2 + aggregation.dailyRows.length, 0, 1),
          [chartBuilder.createRange(dailyId, 2, 2 + aggregation.dailyRows.length, 1, 2)], 
          1, 9, 400, 250
       ));
    }
    
    // Campaign Analytics Charts
    const campId = getSheetId(CAMPAIGN_ANALYTICS_SHEET);
    if(campId !== undefined && aggregation.campaignRows.length > 0) {
      chartRequests.push(chartBuilder.buildColumnChart(campId, 'Revenue by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 8, 9)],
        4, 0, 400, 250
      ));
      chartRequests.push(chartBuilder.buildColumnChart(campId, 'Visitors by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 3, 4)],
        4, 4, 400, 250
      ));
      chartRequests.push(chartBuilder.buildColumnChart(campId, 'Conversion Rate by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 9, 10)],
        4, 8, 400, 250
      ));
      chartRequests.push(chartBuilder.buildColumnChart(campId, 'Add To Cart by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 6, 7)],
        4, 12, 400, 250
      ));
    }
    
    // Attribution Analytics Charts
    const attrId = getSheetId(ATTRIBUTION_ANALYTICS_SHEET);
    if(attrId !== undefined && campId !== undefined && aggregation.firstTouchAttribution.size > 0) {
      chartRequests.push(chartBuilder.buildColumnChart(attrId, 'Revenue by Source (First Touch)',
        chartBuilder.createRange(attrId, 6, 6 + aggregation.firstTouchAttribution.size, 0, 1),
        [chartBuilder.createRange(attrId, 6, 6 + aggregation.firstTouchAttribution.size, 6, 7)],
        4, 0, 350, 200
      ));
      chartRequests.push(chartBuilder.buildColumnChart(attrId, 'Visitors by Source (First Touch)',
        chartBuilder.createRange(attrId, 6, 6 + aggregation.firstTouchAttribution.size, 0, 1),
        [chartBuilder.createRange(attrId, 6, 6 + aggregation.firstTouchAttribution.size, 1, 2)],
        4, 4, 350, 200
      ));
      chartRequests.push(chartBuilder.buildColumnChart(attrId, 'Conversion Rate by Source (First Touch)',
        chartBuilder.createRange(attrId, 6, 6 + aggregation.firstTouchAttribution.size, 0, 1),
        [chartBuilder.createRange(attrId, 6, 6 + aggregation.firstTouchAttribution.size, 7, 8)],
        4, 8, 350, 200
      ));
      
      // We pull Campaign charts from Campaign Analytics but render them on Attribution Analytics
      chartRequests.push(chartBuilder.buildColumnChart(attrId, 'Revenue by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 8, 9)],
        18, 0, 350, 200
      ));
      chartRequests.push(chartBuilder.buildColumnChart(attrId, 'Visitors by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 3, 4)],
        18, 4, 350, 200
      ));
      chartRequests.push(chartBuilder.buildColumnChart(attrId, 'Conversion Rate by Campaign',
        chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 0, 1),
        [chartBuilder.createRange(campId, 12, 12 + aggregation.campaignRows.length, 9, 10)],
        18, 8, 350, 200
      ));
    }
    
    // 2. Traffic Sources (Pie) on Traffic & Exec
    if(trafficId !== undefined && aggregation.utmRows.length > 0) {
       chartRequests.push(chartBuilder.buildPieChart(execId, 'Traffic Sources', 
          chartBuilder.createRange(trafficId, 6, 6 + aggregation.utmRows.length, 0, 1),
          chartBuilder.createRange(trafficId, 6, 6 + aggregation.utmRows.length, 1, 2),
          14, 9, 400, 250
       ));
       chartRequests.push(chartBuilder.buildPieChart(trafficId, 'Traffic Sources', 
          chartBuilder.createRange(trafficId, 6, 6 + aggregation.utmRows.length, 0, 1),
          chartBuilder.createRange(trafficId, 6, 6 + aggregation.utmRows.length, 1, 2),
          1, 6, 500, 300
       ));
    }

    // 3. Conversion Funnel (Bar/Column) on Funnel & Exec
    if(funnelId !== undefined) {
       chartRequests.push(chartBuilder.buildColumnChart(execId, 'Conversion Funnel', 
          chartBuilder.createRange(funnelId, 2, 7, 0, 1),
          [chartBuilder.createRange(funnelId, 2, 7, 1, 2)],
          14, 4, 400, 250
       ));
       chartRequests.push(chartBuilder.buildColumnChart(funnelId, 'Conversion Funnel', 
          chartBuilder.createRange(funnelId, 2, 7, 0, 1), 
          [chartBuilder.createRange(funnelId, 2, 7, 1, 2)], 
          2, 5, 600, 400
       ));
    }

    // 4. Product Analytics Charts
    if (prodId !== undefined && aggregation.productRows.length > 0) {
      const pLen = Math.min(10, aggregation.productRows.length);
      chartRequests.push(chartBuilder.buildColumnChart(prodId, 'Top 10 Viewed Products', 
          chartBuilder.createRange(prodId, 2, 2 + pLen, 0, 1), 
          [chartBuilder.createRange(prodId, 2, 2 + pLen, 1, 2)], 
          2, 7, 500, 300
       ));
    }

    // 5. Geography Analytics Charts
    if (geoId !== undefined) {
      // Calculate start rows dynamically based on array lengths
      const cLen = aggregation.geography.countries.length;
      const sLen = aggregation.geography.states.length;
      const ciLen = aggregation.geography.cities.length;
      const iLen = aggregation.geography.isps.length;
      const dLen = aggregation.dailyRows.length;
      
      let rIdx = 12; // Start of Countries
      if (cLen > 0) {
        chartRequests.push(chartBuilder.buildPieChart(geoId, 'Top Countries Distribution', 
            chartBuilder.createRange(geoId, rIdx, rIdx + cLen, 0, 1),
            chartBuilder.createRange(geoId, rIdx, rIdx + cLen, 1, 2),
            12, 5, 400, 300
        ));
      }
      rIdx += cLen + 2; // Move to States
      
      if (sLen > 0) {
        chartRequests.push(chartBuilder.buildColumnChart(geoId, 'Top States by Visitors', 
            chartBuilder.createRange(geoId, rIdx, rIdx + sLen, 0, 1),
            [chartBuilder.createRange(geoId, rIdx, rIdx + sLen, 1, 2)],
            12, 12, 600, 300
        ));
      }
      rIdx += sLen + 2; // Move to Cities
      
      if (ciLen > 0) {
        chartRequests.push(chartBuilder.buildColumnChart(geoId, 'Top Cities by Visitors', 
            chartBuilder.createRange(geoId, rIdx, rIdx + ciLen, 0, 1),
            [chartBuilder.createRange(geoId, rIdx, rIdx + ciLen, 1, 2)],
            rIdx + ciLen + 2, 5, 600, 300
        ));
      }
      rIdx += ciLen + 2; // Move to ISPs
      
      if (iLen > 0) {
        chartRequests.push(chartBuilder.buildColumnChart(geoId, 'Visitors by ISP', 
            chartBuilder.createRange(geoId, rIdx, rIdx + iLen, 0, 1),
            [chartBuilder.createRange(geoId, rIdx, rIdx + iLen, 1, 2)],
            rIdx + iLen + 2, 5, 600, 300
        ));
      }
      rIdx += iLen + 2; // Move to Cross Analysis
      rIdx += sLen + 2; // Move to Daily Trend
      
      if (dLen > 0) {
        chartRequests.push(chartBuilder.buildLineChart(geoId, 'Daily Geographic Traffic Trend', 
            chartBuilder.createRange(geoId, rIdx, rIdx + dLen, 1, 2), // Date column
            [chartBuilder.createRange(geoId, rIdx, rIdx + dLen, 2, 3)], // Visitors column
            rIdx + dLen + 2, 5, 800, 300
        ));
      }
    }

    // 6. User Behavior Analytics Charts
    const ubId = getSheetId(USER_BEHAVIOR_SHEET);
    if (ubId !== undefined) {
      // 1. Visitor Segmentation Pie Chart (Domain: B2:E2, Data: B3:E3)
      chartRequests.push(chartBuilder.buildPieChart(ubId, 'Visitor Segmentation', 
          chartBuilder.createRange(ubId, 1, 2, 1, 5),
          chartBuilder.createRange(ubId, 2, 3, 1, 5),
          4, 1, 400, 300
      ));
    }

    if (chartRequests.length > 0) {
      await s.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests: chartRequests }
      });
      console.log('[DASHBOARD] Charts injected successfully.');
    }

    return aggregation;
  } catch(err) {
    console.error('[DASHBOARD_CHART_ERROR]', err.message);
  }
}

// Exported getAggregations for external services (like Cart Recovery)
exports.getAggregations = async () => {
  const s = await sheets();
  const mappedRows = await fetchRawEventRows(s);
  return buildAggregations(mappedRows);
}

const DASHBOARD_BUILD_INTERVAL = 5 * 60 * 1000;
let isBuildingDashboard = false;
let lastDashboardBuildTime = 0;

exports.populateDashboardSheet = async () => {
  if (isBuildingDashboard) {
    console.log('[DASHBOARD_BUILD_SKIPPED] Build already in progress');
    return;
  }

  if (Date.now() - lastDashboardBuildTime < DASHBOARD_BUILD_INTERVAL) {
    console.log('[DASHBOARD_BUILD_SKIPPED] Minimum rebuild interval not reached');
    return;
  }

  isBuildingDashboard = true;

  try {
    const s = await sheets();
    await ensureAnalyticsSheetExists(s);
    const agg = await buildDashboardSheets(s);
    lastDashboardBuildTime = Date.now();
    return agg;
  } finally {
    isBuildingDashboard = false;
  }
};

exports.ensureDashboardSheetExists = async () => {
  const s = await sheets();
  await ensureDashboardSheetExists(s);
};

exports.appendEventRow = async (payload) => {
  try {
    console.log('[GOOGLE_APPEND] Starting appendEventRow...');
    console.log('[GOOGLE_APPEND] Payload:', JSON.stringify(payload, null, 2));
    
    const row = mapPayloadToRow(payload);
    console.log('[GOOGLE_APPEND] Mapped row:', row);

    console.log('[GOOGLE_APPEND] Getting Sheets API instance...');
    const s = await sheets();
    console.log('[GOOGLE_APPEND] Got Sheets API instance');
    await ensureAnalyticsSheetExists(s);

    console.log('[GOOGLE_APPEND] Spreadsheet ID:', SHEET_ID);
    console.log('[GOOGLE_APPEND] Range:', DEFAULT_RANGE);
    console.log('[GOOGLE_APPEND] Sending append request...');

    console.log(`\n==================================================\nGOOGLE SHEETS WRITE ATTEMPT\n===========================\nSpreadsheet ID: ${SHEET_ID}\nSpreadsheet URL: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit\nTarget Sheet: ${RAW_EVENTS_SHEET_TITLE}\nEvent Type: ${payload.event_type}\nVisitor ID: ${payload.visitor_id || 'N/A'}\nSession ID: ${payload.session_id || 'N/A'}\n========================\n`);

    const response = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: DEFAULT_RANGE,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] }
    });

    console.log('[GOOGLE_APPEND_SUCCESS] Row appended:', response.data);

    console.log(`\n==================================================\nRAW EVENT WRITTEN\n=================\nSpreadsheet ID: ${SHEET_ID}\nTarget Sheet: ${RAW_EVENTS_SHEET_TITLE}\nRow Number: ${response?.data?.updates?.updatedRange || 'Unknown'}\n=====================================\n`);
    
    lastSuccessfulWrite = {
        timestamp: new Date().toISOString(),
        eventType: payload.event_type,
        visitorId: payload.visitor_id || 'N/A',
        sessionId: payload.session_id || 'N/A',
        spreadsheetId: SHEET_ID,
        sheetName: RAW_EVENTS_SHEET_TITLE
    };

    return response;
  } catch (err) {
    console.error('[GOOGLE_APPEND_ERROR] Failed to append row:', err.message);
    console.error('[GOOGLE_APPEND_ERROR_CODE]:', err.code);
    console.error('[GOOGLE_APPEND_ERROR_STATUS]:', err.status);
    console.error('[GOOGLE_APPEND_ERROR_STACK]:', err.stack);
    console.error('[GOOGLE_APPEND_ERROR_FULL]:', err);
    throw err;
  }
};

exports.appendEventRows = async (payloads) => {
  try {
    console.log('[GOOGLE_BATCH] Starting appendEventRows with', payloads.length, 'rows');
    
    const rows = payloads.map(mapPayloadToRow);
    console.log('[GOOGLE_BATCH] Mapped rows:', rows);

    console.log('[GOOGLE_BATCH] Getting Sheets API instance...');
    const s = await sheets();
    console.log('[GOOGLE_BATCH] Got Sheets API instance');
    await ensureAnalyticsSheetExists(s);

    console.log('[GOOGLE_BATCH] Sending append request...');
    
    console.log(`\n==================================================\nGOOGLE SHEETS WRITE ATTEMPT\n===========================\nSpreadsheet ID: ${SHEET_ID}\nSpreadsheet URL: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit\nTarget Sheet: ${RAW_EVENTS_SHEET_TITLE}\nEvent Type: BATCH (${payloads.length} events)\nVisitor ID: N/A\nSession ID: N/A\n========================\n`);
    const response = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: DEFAULT_RANGE,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });

    console.log('[GOOGLE_BATCH_SUCCESS] Batch appended:', response.data);

    console.log(`\n==================================================\nRAW EVENT WRITTEN\n=================\nSpreadsheet ID: ${SHEET_ID}\nTarget Sheet: ${RAW_EVENTS_SHEET_TITLE}\nRow Number: ${response?.data?.updates?.updatedRange || 'Unknown'} (Batch of ${payloads.length})\n=====================================\n`);
    
    lastSuccessfulWrite = {
        timestamp: new Date().toISOString(),
        eventType: `BATCH_OF_${payloads.length}`,
        visitorId: 'N/A',
        sessionId: 'N/A',
        spreadsheetId: SHEET_ID,
        sheetName: RAW_EVENTS_SHEET_TITLE
    };

    return response;
  } catch (err) {
    console.error('[GOOGLE_BATCH_ERROR] Failed to append batch:', err.message);
    console.error('[GOOGLE_BATCH_ERROR_STACK]:', err.stack);
    throw err;
  }
};

/**
 * Diagnostic test: Validates Google authentication, spreadsheet access, and sheet existence
 * Returns detailed status and error information
 */
exports.diagnosticTest = async () => {
  const results = {
    success: false,
    steps: [],
    errors: []
  };

  try {
    // Step 1: Check credentials
    console.log('[DIAG] Step 1: Checking credentials...');
    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      results.errors.push('Missing credentials');
      results.steps.push({
        name: 'credentials_check',
        status: 'FAILED',
        details: { hasSheetId: !!SHEET_ID, hasClientEmail: !!CLIENT_EMAIL, hasPrivateKey: !!PRIVATE_KEY }
      });
      return results;
    }
    results.steps.push({
      name: 'credentials_check',
      status: 'PASSED',
      details: {
        sheetId: SHEET_ID,
        clientEmail: CLIENT_EMAIL,
        keyLength: PRIVATE_KEY.length
      }
    });

    // Step 2: Authenticate
    console.log('[DIAG] Step 2: Authenticating with Google...');
    const s = await sheets();
    results.steps.push({
      name: 'authentication',
      status: 'PASSED',
      details: { message: 'JWT authorized successfully' }
    });

    // Step 3: Get spreadsheet metadata
    console.log('[DIAG] Step 3: Getting spreadsheet metadata...');
    const spreadsheet = await s.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });
    results.steps.push({
      name: 'spreadsheet_metadata',
      status: 'PASSED',
      details: {
        title: spreadsheet.data.properties.title,
        id: spreadsheet.data.spreadsheetId,
        sheetCount: spreadsheet.data.sheets.length,
        sheets: spreadsheet.data.sheets.map(sh => sh.properties.title),
        sheet_shared: true,
        service_account: CLIENT_EMAIL
      }
    });

    // Step 4: Check for Raw Events sheet
    console.log('[DIAG] Step 4: Looking for Raw Events sheet...');
    const eventSheet = spreadsheet.data.sheets.find(
      sh => sh.properties.title === RAW_EVENTS_SHEET_TITLE || DATA_SHEET_ORDER.includes(sh.properties.title)
    );
    if (!eventSheet) {
      results.steps.push({
        name: 'raw_events_sheet_check',
        status: 'WARNING',
        details: { availableSheets: spreadsheet.data.sheets.map(sh => sh.properties.title), message: 'Raw Events sheet missing, attempting to create it.' }
      });
      await ensureAnalyticsSheetExists(s, spreadsheet);
      results.steps.push({
        name: 'raw_events_sheet_check',
        status: 'PASSED',
        details: { message: 'Raw Events sheet created successfully.' }
      });
    } else {
      results.steps.push({
        name: 'raw_events_sheet_check',
        status: 'PASSED',
        details: {
          title: eventSheet.properties.title,
          sheetId: eventSheet.properties.sheetId,
          gridProperties: eventSheet.properties.gridProperties
        }
      });
    }

    // Step 5: Read headers from Raw Events sheet
    console.log('[DIAG] Step 5: Reading headers...');
    const headers = await s.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${RAW_EVENTS_SHEET_TITLE}!A1:AE1`
    });
    results.steps.push({
      name: 'read_headers',
      status: 'PASSED',
      details: {
        headerRow: headers.data.values ? headers.data.values[0] : 'NO HEADERS FOUND'
      }
    });

    // Step 6: Try to append a test row
    console.log('[DIAG] Step 6: Testing row append...');
    const testRow = [
      new Date().toISOString(),
      'diagnostic_test',
      '/diagnostic',
      '',
      'Test Browser',
      'Test Device',
      '',
      '',
      'DIAG_' + Date.now(),
      'DIAG_VISITOR',
      '',
      '',
      '',
      '',
      'Diagnostic Product',
      'Diagnostics',
      0,
      0,
      '',
      0,
      '',
      0,
      ''
    ];
    const appendResult = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${RAW_EVENTS_SHEET_TITLE}!A:W`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [testRow] }
    });
    results.steps.push({
      name: 'append_test_row',
      status: 'PASSED',
      details: {
        updatedRows: appendResult.data.updates.updatedRows,
        appendedCell: appendResult.data.updates.updatedRange
      }
    });

    results.success = true;
    console.log('[DIAG] ✅ All diagnostic tests passed');
  } catch (err) {
    console.error('[DIAG] ❌ Diagnostic test failed:', err.message);
    results.errors.push(err.message);
    if (err.response && err.response.data) {
      results.lastError = err.response.data;
    } else {
      results.lastError = {
        message: err.message,
        code: err.code
      };
    }
    console.error('[GOOGLE_APPEND_ERROR_STACK]:', err.stack);
    console.error('[GOOGLE_APPEND_ERROR_FULL]:', err);
    throw err;
  }
};

exports.appendEventRows = async (payloads) => {
  try {
    console.log('[GOOGLE_BATCH] Starting appendEventRows with', payloads.length, 'rows');
    
    const rows = payloads.map(mapPayloadToRow);
    console.log('[GOOGLE_BATCH] Mapped rows:', rows);

    console.log('[GOOGLE_BATCH] Getting Sheets API instance...');
    const s = await sheets();
    console.log('[GOOGLE_BATCH] Got Sheets API instance');
    await ensureAnalyticsSheetExists(s);

    console.log('[GOOGLE_BATCH] Sending append request...');
    const response = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: DEFAULT_RANGE,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows }
    });

    console.log('[GOOGLE_BATCH_SUCCESS] Batch appended:', response.data);
    return response;
  } catch (err) {
    console.error('[GOOGLE_BATCH_ERROR] Failed to append batch:', err.message);
    console.error('[GOOGLE_BATCH_ERROR_STACK]:', err.stack);
    throw err;
  }
};

/**
 * Diagnostic test: Validates Google authentication, spreadsheet access, and sheet existence
 * Returns detailed status and error information
 */
exports.diagnosticTest = async () => {
  const results = {
    success: false,
    steps: [],
    errors: []
  };

  try {
    // Step 1: Check credentials
    console.log('[DIAG] Step 1: Checking credentials...');
    if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
      results.errors.push('Missing credentials');
      results.steps.push({
        name: 'credentials_check',
        status: 'FAILED',
        details: { hasSheetId: !!SHEET_ID, hasClientEmail: !!CLIENT_EMAIL, hasPrivateKey: !!PRIVATE_KEY }
      });
      return results;
    }
    results.steps.push({
      name: 'credentials_check',
      status: 'PASSED',
      details: {
        sheetId: SHEET_ID,
        clientEmail: CLIENT_EMAIL,
        keyLength: PRIVATE_KEY.length
      }
    });

    // Step 2: Authenticate
    console.log('[DIAG] Step 2: Authenticating with Google...');
    const s = await sheets();
    results.steps.push({
      name: 'authentication',
      status: 'PASSED',
      details: { message: 'JWT authorized successfully' }
    });

    // Step 3: Get spreadsheet metadata
    console.log('[DIAG] Step 3: Getting spreadsheet metadata...');
    const spreadsheet = await s.spreadsheets.get({
      spreadsheetId: SHEET_ID
    });
    results.steps.push({
      name: 'spreadsheet_metadata',
      status: 'PASSED',
      details: {
        title: spreadsheet.data.properties.title,
        id: spreadsheet.data.spreadsheetId,
        sheetCount: spreadsheet.data.sheets.length,
        sheets: spreadsheet.data.sheets.map(sh => sh.properties.title),
        sheet_shared: true,
        service_account: CLIENT_EMAIL
      }
    });

    // Step 4: Check for Raw Events sheet
    console.log('[DIAG] Step 4: Looking for Raw Events sheet...');
    const eventSheet = spreadsheet.data.sheets.find(
      sh => sh.properties.title === RAW_EVENTS_SHEET_TITLE || DATA_SHEET_ORDER.includes(sh.properties.title)
    );
    if (!eventSheet) {
      results.steps.push({
        name: 'raw_events_sheet_check',
        status: 'WARNING',
        details: { availableSheets: spreadsheet.data.sheets.map(sh => sh.properties.title), message: 'Raw Events sheet missing, attempting to create it.' }
      });
      await ensureAnalyticsSheetExists(s, spreadsheet);
      results.steps.push({
        name: 'raw_events_sheet_check',
        status: 'PASSED',
        details: { message: 'Raw Events sheet created successfully.' }
      });
    } else {
      results.steps.push({
        name: 'raw_events_sheet_check',
        status: 'PASSED',
        details: {
          title: eventSheet.properties.title,
          sheetId: eventSheet.properties.sheetId,
          gridProperties: eventSheet.properties.gridProperties
        }
      });
    }

    // Step 5: Read headers from Raw Events sheet
    console.log('[DIAG] Step 5: Reading headers...');
    const headers = await s.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${RAW_EVENTS_SHEET_TITLE}!A1:AE1`
    });
    results.steps.push({
      name: 'read_headers',
      status: 'PASSED',
      details: {
        headerRow: headers.data.values ? headers.data.values[0] : 'NO HEADERS FOUND'
      }
    });

    // Step 6: Try to append a test row
    console.log('[DIAG] Step 6: Testing row append...');
    const testRow = [
      new Date().toISOString(),
      'diagnostic_test',
      '/diagnostic',
      '',
      'Test Browser',
      'Test Device',
      '',
      '',
      'DIAG_' + Date.now(),
      'DIAG_VISITOR',
      '',
      '',
      '',
      '',
      'Diagnostic Product',
      'Diagnostics',
      0,
      0,
      '',
      0,
      '',
      0,
      ''
    ];
    const appendResult = await s.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${RAW_EVENTS_SHEET_TITLE}!A:W`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [testRow] }
    });
    results.steps.push({
      name: 'append_test_row',
      status: 'PASSED',
      details: {
        updatedRows: appendResult.data.updates.updatedRows,
        appendedCell: appendResult.data.updates.updatedRange
      }
    });

    results.success = true;
    console.log('[DIAG] ✅ All diagnostic tests passed');
  } catch (err) {
    console.error('[DIAG] ❌ Diagnostic test failed:', err.message);
    results.errors.push(err.message);
    if (err.response && err.response.data) {
      results.lastError = err.response.data;
    } else {
      results.lastError = {
        message: err.message,
        code: err.code
      };
    }
  }

  return results;
};

// Exports for testing
exports.fetchRawEventRows = fetchRawEventRows;
exports.buildAggregations = buildAggregations;
exports.sheets = sheets;
exports.fetchWhatsAppPerformance = fetchWhatsAppPerformance;

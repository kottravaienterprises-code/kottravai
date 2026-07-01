require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

const IGNORED_ROWS = new Set([
  'category performance', 'diagnostics', 'coconut shell products', 'handmade jewellery',
  'masala powders', 'instant nourish', 'idli podi', 'ready to mix',
  'banana fiber products', 'hampers', 'essential care', 'festival wear',
  'daily wear', 'handicrafts', 'bridal set', 'dosa batter mix',
  'last refresh (ist)', 'data source', '---', 'undefined', 'unknown product',
  'product analytics', 'cart analytics kpis', 'average purchase decision time (hours)',
  'total active carts', 'total abandoned carts', 'fastest converting product',
  'slowest converting product', 'top products'
]);

function normalizeProductName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014]/g, '-') // Normalize en-dash and em-dash to regular hyphen
    .replace(/[^a-z0-9\s\-]/g, ''); // Keep only alphanumeric, spaces, and hyphens
}

async function runAudit() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  console.log("Fetching worksheets...");
  const resCart = await sheetsApi.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'Product Cart Analysis'!A2:M" });
  const resAnalytics = await sheetsApi.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: "'Product Analytics'!A11:Z" });

  const cartRows = resCart.data.values || [];
  const analyticsRows = resAnalytics.data.values || [];

  // Group Product Cart Analysis by normalized product name
  const cartProducts = new Map();
  const cartNormalizedToOriginal = new Map();

  cartRows.forEach(r => {
    const originalName = String(r[1]).trim();
    if (!originalName || IGNORED_ROWS.has(originalName.toLowerCase())) return;
    
    const norm = normalizeProductName(originalName);
    if (!norm) return;

    if (!cartProducts.has(norm)) {
      cartProducts.set(norm, {
        name: originalName,
        views: 0, pPageViews: 0, cartPageViews: 0, adds: 0, checkouts: 0, confirms: 0
      });
      cartNormalizedToOriginal.set(norm, originalName);
    }
    const p = cartProducts.get(norm);
    p.views += parseInt(r[2]) || 0;
    p.pPageViews += parseInt(r[3]) || 0;
    p.cartPageViews += parseInt(r[4]) || 0;
    p.adds += parseInt(r[5]) || 0;
    p.checkouts += parseInt(r[6]) || 0;
    p.confirms += parseInt(r[7]) || 0;
  });

  // Group Product Analytics by normalized product name
  const analyticsProducts = new Map();
  analyticsRows.forEach(r => {
    const originalName = String(r[0]).trim();
    if (!originalName || IGNORED_ROWS.has(originalName.toLowerCase()) || originalName.includes('CATEGORY PERFORMANCE')) return;

    const norm = normalizeProductName(originalName.replace(' (No Matching Product Found)', ''));
    if (!norm) return;

    analyticsProducts.set(norm, {
      name: originalName,
      views: parseInt(r[1]) || 0,
      pPageViews: parseInt(r[2]) || 0,
      cartPageViews: parseInt(r[3]) || 0,
      adds: parseInt(r[4]) || 0,
      checkouts: parseInt(r[5]) || 0,
      confirms: parseInt(r[6]) || 0
    });
  });

  let totalCompared = 0;
  let totalMatched = 0;
  let totalCorrected = 0;
  let totalIgnored = 0;
  let mismatches = [];

  const allKeys = new Set([...cartProducts.keys(), ...analyticsProducts.keys()]);

  allKeys.forEach(norm => {
    totalCompared++;
    const cartP = cartProducts.get(norm);
    const analP = analyticsProducts.get(norm);

    if (cartP && analP) {
      const match = (
        cartP.views === analP.views &&
        cartP.pPageViews === analP.pPageViews &&
        cartP.cartPageViews === analP.cartPageViews &&
        cartP.adds === analP.adds &&
        cartP.checkouts === analP.checkouts &&
        cartP.confirms === analP.confirms
      );

      if (match) {
        totalMatched++;
      } else {
        totalCorrected++;
      }

      mismatches.push({
        name: cartP.name,
        status: match ? 'Matched' : 'Mismatch',
        cart: cartP,
        analytics: analP
      });
    } else if (cartP && !analP) {
      totalCorrected++;
      mismatches.push({
        name: cartP.name,
        status: 'Mismatch (Missing in Product Analytics)',
        cart: cartP,
        analytics: { views: 0, pPageViews: 0, cartPageViews: 0, adds: 0, checkouts: 0, confirms: 0 }
      });
    } else if (!cartP && analP) {
      totalCorrected++;
      mismatches.push({
        name: analP.name,
        status: 'Mismatch (Missing in Product Cart Analysis)',
        cart: { views: 0, pPageViews: 0, cartPageViews: 0, adds: 0, checkouts: 0, confirms: 0 },
        analytics: analP
      });
    }
  });

  // Print Report
  console.log(`\n### Detailed Normalization Audit Report\n`);
  console.log(`- **Total Products Compared:** ${totalCompared}`);
  console.log(`- **Total Matches:** ${totalMatched}`);
  console.log(`- **Total Corrected / Mismatched:** ${totalCorrected}`);
  console.log(`- **Total Ignored Metadata Rows:** ${Array.from(IGNORED_ROWS).length}`);
  console.log(`\n---\n`);

  mismatches.forEach(m => {
    console.log(`Product Name: **${m.name}**`);
    console.log(`Product Cart Analysis:`);
    console.log(`- Product Views: ${m.cart.views}`);
    console.log(`- Product Page Views: ${m.cart.pPageViews}`);
    console.log(`- Cart Page Views: ${m.cart.cartPageViews}`);
    console.log(`- Product to Cart: ${m.cart.adds}`);
    console.log(`- Cart to Checkout: ${m.cart.checkouts}`);
    console.log(`- Checkout Confirm Page Views: ${m.cart.confirms}`);
    console.log(`\nProduct Analytics:`);
    console.log(`- Product Views: ${m.analytics.views}`);
    console.log(`- Product Page Views: ${m.analytics.pPageViews}`);
    console.log(`- Cart Page Views: ${m.analytics.cartPageViews}`);
    console.log(`- Product to Cart: ${m.analytics.adds}`);
    console.log(`- Cart to Checkout: ${m.analytics.checkouts}`);
    console.log(`- Checkout Confirm Page Views: ${m.analytics.confirms}`);
    console.log(`\nStatus: **${m.status}**`);
    console.log(`\n==========================================\n`);
  });
}

runAudit().catch(console.error);

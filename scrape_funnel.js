require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function scrapeCorrectData() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  console.log("Fetching Raw Events data...");
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Raw Events'!A1:AG"
  });

  const allRows = res.data.values || [];
  if (allRows.length <= 1) {
    console.log("No raw events to scrape.");
    return;
  }

  // Filter for last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const sessions = new Map();

  // Process rows
  for (let i = 1; i < allRows.length; i++) {
    const row = allRows[i];
    const timestampStr = row[0];
    if (!timestampStr) continue;

    const eventDate = new Date(timestampStr);
    if (eventDate < sevenDaysAgo) continue; // skip older events

    const sessionId = row[8] || 'unknown_session';
    const eventType = String(row[1] || '').toLowerCase();
    const page = String(row[2] || '').toLowerCase();
    const productName = String(row[14] || '').trim();

    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        dateStr: eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
        hasCartView: false,
        hasCheckoutStart: false,
        hasPurchase: false,
        products: new Map() // productName -> metrics
      });
    }

    const s = sessions.get(sessionId);

    if (page.includes('/cart')) s.hasCartView = true;
    if (eventType === 'checkout_started' || eventType === 'guest_checkout_started' || page.includes('/checkout')) s.hasCheckoutStart = true;
    if (eventType === 'purchase' || page.includes('/checkout/success')) s.hasPurchase = true;

    if (productName && productName !== 'Unknown Product' && productName !== '') {
      if (!s.products.has(productName)) {
        s.products.set(productName, {
          views: 0,
          pageViews: 0,
          addsToCart: 0
        });
      }
      const p = s.products.get(productName);

      if (eventType === 'product_view') p.views++;
      if (eventType === 'page_view' && page.includes('/product/')) p.pageViews++;
      if (eventType === 'add_to_cart') p.addsToCart++;
    }
  }

  // Aggregate by Date and Product
  // Output rows: Date, Product Name, Product Views, Product Page Views, Cart Page Views, Product to Cart, Cart to Checkout, Checkout Confirm Page Views
  const aggregated = {}; // key: "Date|ProductName"

  for (const [sid, s] of sessions.entries()) {
    for (const [pName, pMetrics] of s.products.entries()) {
      const key = `${s.dateStr}|${pName}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          date: s.dateStr,
          name: pName,
          pViews: 0,
          pPageViews: 0,
          cartViews: 0,
          addsToCart: 0,
          checkoutStart: 0,
          purchases: 0
        };
      }
      
      const a = aggregated[key];
      a.pViews += pMetrics.views;
      // fallback: if tracking only tracks product_view, use that for page views too
      a.pPageViews += pMetrics.pageViews > 0 ? pMetrics.pageViews : pMetrics.views; 
      a.addsToCart += pMetrics.addsToCart;
      
      // Funnel attribution logic:
      // If session had a cart view AND interacted with this product (viewed or added)
      if (s.hasCartView && (pMetrics.views > 0 || pMetrics.addsToCart > 0)) a.cartViews++;
      
      // If session started checkout AND added this product to cart
      if (s.hasCheckoutStart && pMetrics.addsToCart > 0) a.checkoutStart++;
      
      // If session purchased AND added this product to cart
      if (s.hasPurchase && pMetrics.addsToCart > 0) a.purchases++;
    }
  }

  let finalRows = Object.values(aggregated).map(a => [
    a.date,
    a.name,
    a.pViews,
    a.pPageViews,
    a.cartViews,
    a.addsToCart,
    a.checkoutStart,
    a.purchases
  ]);

  // Sort by date descending, then by views descending
  finalRows.sort((a, b) => {
    const dateA = new Date(a[0].replace(/-/g, ' '));
    const dateB = new Date(b[0].replace(/-/g, ' '));
    if (dateA.getTime() !== dateB.getTime()) return dateB - dateA;
    return b[2] - a[2];
  });

  if (finalRows.length === 0) {
    console.log("No valid product data found for the last 7 days.");
    return;
  }

  console.log(`Found ${finalRows.length} product metrics rows. Uploading...`);

  // Clear existing A2:H on Product Cart Analysis
  await sheetsApi.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: "'Product Cart Analysis'!A2:H"
  });

  // Write new rows
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: "'Product Cart Analysis'!A2",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: finalRows }
  });

  console.log("Correct data scraped and inserted successfully!");
}

scrapeCorrectData().catch(console.error);

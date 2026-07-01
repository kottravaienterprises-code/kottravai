const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config({ path: './server/.env' });

const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function compareSheets() {
  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });

  console.log('Fetching Product Cart Analysis...');
  const cartRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Product Cart Analysis'!A:M",
    valueRenderOption: 'UNFORMATTED_VALUE'
  });
  
  console.log('Fetching Product Analytics...');
  const analyticsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Product Analytics'!A:M",
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const cartRows = cartRes.data.values || [];
  const analyticsRows = analyticsRes.data.values || [];

  const cartData = new Map();
  // Cart sheet format:
  // Row 1: Headers
  // Col B: Product Name
  // Col C: Views
  // Col D: Product Page Views
  // Col E: Cart Page Views
  // Col F: Product to Cart
  // Col G: Cart to Checkout
  // Col H: Checkout Confirm Page Views
  
  // Need to skip empty rows and header
  for (let i = 1; i < cartRows.length; i++) {
    const r = cartRows[i];
    if (!r || !r[1] || String(r[1]).trim() === '') continue;
    const name = String(r[1]).trim();
    // Ignore summary rows
    if (['category performance', 'diagnostics', 'last refresh (ist)'].some(sub => name.toLowerCase().includes(sub))) continue;
    
    if (!cartData.has(name)) {
      cartData.set(name, {
        views: 0,
        pageViews: 0,
        cartViews: 0,
        productToCart: 0,
        cartToCheckout: 0,
        checkoutConfirm: 0
      });
    }
    const current = cartData.get(name);
    current.views += (Number(r[2]) || 0);
    current.pageViews += (Number(r[3]) || 0);
    current.cartViews += (Number(r[4]) || 0);
    current.productToCart += (Number(r[5]) || 0);
    current.cartToCheckout += (Number(r[6]) || 0);
    current.checkoutConfirm += (Number(r[7]) || 0);
  }

  const analyticsData = new Map();
  // Analytics sheet format:
  // Find "TOP PRODUCTS" header
  let inProducts = false;
  for (let i = 0; i < analyticsRows.length; i++) {
    const r = analyticsRows[i];
    if (!r || !r[0]) continue;
    
    if (r[0] === 'TOP PRODUCTS') {
      inProducts = true;
      continue;
    }
    if (r[0] === '---' || r[0] === 'CATEGORY PERFORMANCE' || r[0] === 'LOW CONVERSION PRODUCTS' || r[0] === '') {
      inProducts = false;
    }

    if (inProducts) {
      let name = String(r[0]).trim();
      // Remove legacy marker if present for clean reporting (though shouldn't exist in cartData anyway)
      if (name.includes('(No Matching Product Found)')) {
          name = name.replace('(No Matching Product Found)', '').trim();
      }
      
      analyticsData.set(name, {
        views: Number(r[1]) || 0,
        pageViews: Number(r[2]) || 0,
        cartViews: Number(r[3]) || 0,
        productToCart: Number(r[4]) || 0,
        cartToCheckout: Number(r[5]) || 0,
        checkoutConfirm: Number(r[6]) || 0
      });
    }
  }

  // Compare
  const report = [];
  report.push('# Data Comparison Report: Product Cart Analysis vs Product Analytics\n');
  report.push('This report compares the exact evaluated numerical metrics between the source-of-truth `Product Cart Analysis` and the dynamically generated `Product Analytics` dashboard.\n');
  
  let perfectMatches = 0;
  let mismatches = 0;
  let missingInAnalytics = 0;
  let extraInAnalytics = 0;

  report.push('## Metric Mismatches\n');
  let mismatchFound = false;

  for (const [name, cartMetrics] of cartData.entries()) {
    if (!analyticsData.has(name)) {
      missingInAnalytics++;
      continue;
    }
    const anMetrics = analyticsData.get(name);
    
    const isMatch = 
      cartMetrics.views === anMetrics.views &&
      cartMetrics.pageViews === anMetrics.pageViews &&
      cartMetrics.cartViews === anMetrics.cartViews &&
      cartMetrics.productToCart === anMetrics.productToCart &&
      cartMetrics.cartToCheckout === anMetrics.cartToCheckout &&
      cartMetrics.checkoutConfirm === anMetrics.checkoutConfirm;

    if (isMatch) {
      perfectMatches++;
    } else {
      mismatches++;
      mismatchFound = true;
      report.push(`### ❌ ${name}`);
      report.push('| Metric | Cart Analysis | Product Analytics | Diff |');
      report.push('|--------|---------------|-------------------|------|');
      
      const cols = [
        { label: 'Views', c: cartMetrics.views, a: anMetrics.views },
        { label: 'Page Views', c: cartMetrics.pageViews, a: anMetrics.pageViews },
        { label: 'Cart Views', c: cartMetrics.cartViews, a: anMetrics.cartViews },
        { label: 'Product to Cart', c: cartMetrics.productToCart, a: anMetrics.productToCart },
        { label: 'Cart to Checkout', c: cartMetrics.cartToCheckout, a: anMetrics.cartToCheckout },
        { label: 'Checkout Confirm', c: cartMetrics.checkoutConfirm, a: anMetrics.checkoutConfirm }
      ];

      for (const col of cols) {
        if (col.c !== col.a) {
          report.push(`| **${col.label}** | ${col.c} | ${col.a} | ${col.a - col.c} |`);
        } else {
          report.push(`| ${col.label} | ${col.c} | ${col.a} | 0 |`);
        }
      }
      report.push('');
    }
  }

  if (!mismatchFound) {
    report.push('**No metric mismatches found!** Every metric evaluated correctly matches the source of truth.\n');
  }

  report.push('## Summary Statistics');
  report.push(`- **Total Active Products in Cart Analysis:** ${cartData.size}`);
  report.push(`- **Perfect Matches:** ${perfectMatches}`);
  report.push(`- **Mismatches:** ${mismatches}`);
  report.push(`- **Missing in Analytics:** ${missingInAnalytics}`);
  
  // Find extra legacy products
  for (const name of analyticsData.keys()) {
    if (!cartData.has(name)) {
      extraInAnalytics++;
    }
  }
  report.push(`- **Legacy/Extra Products in Analytics (No match in Cart):** ${extraInAnalytics}`);

  // Create Sample Table of top 5 products to demonstrate data sync
  report.push('\n## Sample Data Synchronization (Top 5 Active Products)');
  report.push('| Product Name | Views | Page Views | Cart Views | Product->Cart | Cart->Checkout | Checkout Confirm |');
  report.push('|--------------|-------|------------|------------|---------------|----------------|------------------|');
  
  let i = 0;
  for (const [name, cartMetrics] of cartData.entries()) {
    if (i >= 5) break;
    report.push(`| ${name} | ${cartMetrics.views} | ${cartMetrics.pageViews} | ${cartMetrics.cartViews} | ${cartMetrics.productToCart} | ${cartMetrics.cartToCheckout} | ${cartMetrics.checkoutConfirm} |`);
    i++;
  }

  // Write artifact
  fs.writeFileSync('c:/Users/santh/.gemini/antigravity/brain/53affb6c-dcf3-4fc2-b251-01d9f693378d/artifacts/data_comparison_report.md', report.join('\n'));
  console.log('Artifact data_comparison_report.md successfully created.');
}

compareSheets().catch(console.error);

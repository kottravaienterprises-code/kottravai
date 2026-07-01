const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('../utils/googleKeyValidator');

async function extractAllData() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  const getSheetData = async (sheetName) => {
    try {
      const res = await sheetsApi.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${sheetName}'!A1:Z1000`
      });
      return res.data.values || [];
    } catch (err) {
      console.warn(`Could not fetch ${sheetName}:`, err.message);
      return [];
    }
  };

  console.log("Extracting Executive Dashboard...");
  const execDash = await getSheetData('Executive Dashboard');
  
  console.log("Extracting Product Analytics...");
  const productAnalytics = await getSheetData('Product Analytics');
  
  console.log("Extracting Product Cart Analysis...");
  const productCart = await getSheetData('Product Cart Analysis');
  
  console.log("Extracting Revenue Analytics...");
  const revenueAnalytics = await getSheetData('Revenue Analytics');
  
  console.log("Extracting Traffic Analytics...");
  const trafficAnalytics = await getSheetData('Traffic Analytics');
  
  console.log("Extracting Geography Analytics...");
  const geoAnalytics = await getSheetData('Geography Analytics');
  
  console.log("Extracting User Behavior Analytics...");
  const behaviorAnalytics = await getSheetData('User Behavior Analytics');

  // Utility to find a metric safely
  const findMetric = (sheet, labelRow, labelCol, valCol, searchString) => {
    for (let r of sheet) {
      if (r && r[labelCol] && String(r[labelCol]).toLowerCase().includes(searchString.toLowerCase())) {
        return r[valCol] || 'Data Not Available';
      }
    }
    return 'Data Not Available';
  };

  const data = {
    executive: {
      visitors: findMetric(execDash, 0, 0, 1, 'Total Visitors'),
      sessions: findMetric(execDash, 0, 0, 1, 'Total Sessions'),
      pageViews: findMetric(execDash, 0, 0, 1, 'Page Views'),
      productViews: findMetric(execDash, 0, 0, 1, 'Product Views'),
      orders: findMetric(execDash, 0, 0, 1, 'Total Orders'),
      revenue: findMetric(execDash, 0, 0, 1, 'Total Revenue'),
      conversionRate: findMetric(execDash, 0, 0, 1, 'Purchase Conversion Rate'),
      aov: findMetric(execDash, 0, 0, 1, 'Average Order Value (AOV)'),
    },
    products: [],
    cartAnalysis: [],
    trafficSources: [],
    growthTrends: [],
    regionData: []
  };

  // Parse Product Cart Analysis
  if (productCart.length > 1) {
    for (let i = 1; i < productCart.length; i++) {
      const row = productCart[i];
      if (!row[1]) continue; // skip empty product name
      data.cartAnalysis.push({
        date: row[0] || 'Data Not Available',
        productName: row[1] || 'Data Not Available',
        productViews: row[2] || 'Data Not Available',
        productPageViews: row[3] || 'Data Not Available',
        cartPageViews: row[4] || 'Data Not Available',
        productToCart: row[5] || 'Data Not Available',
        cartToCheckout: row[6] || 'Data Not Available',
        checkoutConfirm: row[7] || 'Data Not Available',
        pViewRate: row[8] || 'Data Not Available',
        addCartRate: row[9] || 'Data Not Available',
        checkoutRate: row[10] || 'Data Not Available',
        orderCompRate: row[11] || 'Data Not Available',
        overallConv: row[12] || 'Data Not Available',
      });
    }
  }

  // Parse Product Performance (from Product Analytics sheet)
  if (productAnalytics.length > 3) {
    // Usually starts around row 5
    for (let i = 4; i < productAnalytics.length; i++) {
      const row = productAnalytics[i];
      if (!row[0] || row[0] === '') continue;
      // Assuming layout: Product, Views, Adds To Cart, Purchases, Revenue, Conversion
      data.products.push({
        name: row[0] || 'Data Not Available',
        views: row[1] || 'Data Not Available',
        addToCart: row[2] || 'Data Not Available',
        purchases: row[3] || 'Data Not Available',
        revenue: row[4] || 'Data Not Available',
        conversion: row[5] || 'Data Not Available'
      });
    }
  }

  // Parse Region Analysis
  if (geoAnalytics.length > 5) {
     for (let i = 5; i < geoAnalytics.length; i++) {
      const row = geoAnalytics[i];
      if (!row[0]) continue;
      data.regionData.push({
        country: row[0] || 'Data Not Available',
        state: row[1] || 'Data Not Available',
        city: row[2] || 'Data Not Available',
        visitors: row[3] || 'Data Not Available',
        orders: row[4] || 'Data Not Available',
        revenue: row[5] || 'Data Not Available',
      });
    }
  }

  // Parse Traffic Sources
  if (trafficAnalytics.length > 5) {
     for (let i = 5; i < trafficAnalytics.length; i++) {
        const row = trafficAnalytics[i];
        if (!row[0]) continue;
        if (row[0].toLowerCase() === 'utm source') continue;
        data.trafficSources.push({
            source: row[0],
            visitors: row[1] || '0',
            sessions: row[2] || '0'
        });
     }
  }

  return data;
}

module.exports = { extractAllData };

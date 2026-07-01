const fs = require('fs');

let code = fs.readFileSync('server/services/googleSheetsService.js', 'utf8');

// 1. Add PRODUCTS_SHEET constant
if (!code.includes("const PRODUCTS_SHEET = 'Products';")) {
  code = code.replace(
    "const PRODUCT_ANALYTICS_SHEET = 'Product Analytics';",
    "const PRODUCTS_SHEET = 'Products';\nconst PRODUCT_ANALYTICS_SHEET = 'Product Analytics';"
  );
}

// 2. Add Products fetch inside buildDashboardSheets
const cartFetchStr = `const cartRes = await s.spreadsheets.values.get({ spreadsheetId: spreadsheet.data.spreadsheetId, range: "'Product Cart Analysis'!A2:M" });`;
const productsFetchCode = `
    let priceMap = new Map();
    try {
      let prodMeta = refreshed.data.sheets.find(sh => sh.properties.title === PRODUCTS_SHEET);
      if (!prodMeta) {
        console.log('[GOOGLE_SHEET] Products sheet not found. Creating a new Products sheet.');
        await s.spreadsheets.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            requests: [{ addSheet: { properties: { title: PRODUCTS_SHEET, gridProperties: { frozenRowCount: 1 } } } }]
          }
        });
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: \`\${PRODUCTS_SHEET}!A1:B1\`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['Product Name', 'Selling Price']] }
        });
      } else {
        const prodRes = await s.spreadsheets.values.get({ spreadsheetId: spreadsheet.data.spreadsheetId, range: "'Products'!A2:B" });
        const prodRows = prodRes.data.values || [];
        prodRows.forEach(r => {
          const name = String(r[0] || '').trim();
          const price = parseFloat(String(r[1] || '').replace(/[^0-9.-]+/g, ""));
          if (name && !isNaN(price)) priceMap.set(normalizeProductName(name), price);
        });
      }
    } catch (e) {
      console.error('Failed to fetch Products sheet', e.message);
    }
`;
if (!code.includes('let priceMap = new Map();')) {
  code = code.replace(cartFetchStr, productsFetchCode + '\n    ' + cartFetchStr);
}

// 3. Replace prodVals construction
const oldProdValsStart = `    ['TOP PRODUCTS', 'Views', 'Product Page Views', 'Cart Page Views', 'Product to Cart', 'Cart to Checkout', 'Checkout Confirm Page Views', 'Revenue', 'Conv Rate', 'Avg Purchase Decision Time (Hours)', 'Cart Conversion Rate', 'Cart Abandonment Rate'],`;
const oldProdValsMap = `    ...aggregation.productRows.slice(0, 500).map(p => {`;
const newProdValsStart = `    ['TOP PRODUCTS', 'Product Name', 'Selling Price', 'Product Views', 'Product View Value', 'Product Page Views', 'Product Page Value', 'Cart Page Views', 'Cart Page Value', 'Product to Cart', 'Cart Value', 'Cart to Checkout', 'Checkout Value', 'Checkout Confirm', 'Potential Revenue', 'Purchases', 'Actual Revenue', 'Conversion Rate', 'Avg Purchase Decision Time (Hours)', 'Cart Conversion Rate', 'Cart Abandonment Rate'],`;

const newProdValsMap = `    ...aggregation.productRows.slice(0, 500).map(p => {
      const pName = p.missingInCart ? \`\${p.productName} (No Matching Product Found)\` : p.productName;
      const safeP = p.productName.replace(/"/g, '""');
      const norm = normalizeProductName(p.productName);
      const price = priceMap.has(norm) ? priceMap.get(norm) : null;
      if (price === null) {
        console.warn('[MISSING_PRICE]', p.productName);
      }
      const priceVal = price === null ? "Price Missing" : price;

      const viewsFormula = \`=SUMIFS('Product Cart Analysis'!C:C, 'Product Cart Analysis'!B:B, "\${safeP}")\`;
      const ppvFormula = \`=SUMIFS('Product Cart Analysis'!D:D, 'Product Cart Analysis'!B:B, "\${safeP}")\`;
      const cpvFormula = \`=SUMIFS('Product Cart Analysis'!E:E, 'Product Cart Analysis'!B:B, "\${safeP}")\`;
      const ptcFormula = \`=SUMIFS('Product Cart Analysis'!F:F, 'Product Cart Analysis'!B:B, "\${safeP}")\`;
      const ctcFormula = \`=SUMIFS('Product Cart Analysis'!G:G, 'Product Cart Analysis'!B:B, "\${safeP}")\`;
      const ccpvFormula = \`=SUMIFS('Product Cart Analysis'!H:H, 'Product Cart Analysis'!B:B, "\${safeP}")\`;
      
      const vValFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("D"\&ROW())="Price Missing", "Price Missing", INDIRECT("D"\&ROW()) * INDIRECT("C"\&ROW()))\`;
      const ppValFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("F"\&ROW())="Price Missing", "Price Missing", INDIRECT("F"\&ROW()) * INDIRECT("C"\&ROW()))\`;
      const cpValFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("H"\&ROW())="Price Missing", "Price Missing", INDIRECT("H"\&ROW()) * INDIRECT("C"\&ROW()))\`;
      const cvValFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("J"\&ROW())="Price Missing", "Price Missing", INDIRECT("J"\&ROW()) * INDIRECT("C"\&ROW()))\`;
      const ctcValFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("L"\&ROW())="Price Missing", "Price Missing", INDIRECT("L"\&ROW()) * INDIRECT("C"\&ROW()))\`;
      const potRevFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("N"\&ROW())="Price Missing", "Price Missing", INDIRECT("N"\&ROW()) * INDIRECT("C"\&ROW()))\`;
      const actRevFormula = price === null ? "Price Missing" : \`=IF(INDIRECT("P"\&ROW())="Price Missing", "Price Missing", INDIRECT("P"\&ROW()) * INDIRECT("C"\&ROW()))\`;

      return [
        pName,
        pName,
        priceVal,
        viewsFormula,
        vValFormula,
        ppvFormula,
        ppValFormula,
        cpvFormula,
        cpValFormula,
        ptcFormula,
        cvValFormula,
        ctcFormula,
        ctcValFormula,
        ccpvFormula,
        potRevFormula,
        p.purchases || 0,
        actRevFormula,
        \`=IF(INDIRECT("D"\&ROW())>0, INDIRECT("P"\&ROW())/INDIRECT("D"\&ROW()), 0)\`,
        ndy(p.avgDecisionTime),
        \`=IF(INDIRECT("F"\&ROW())>0, INDIRECT("L"\&ROW())/INDIRECT("F"\&ROW()), 0)\`,
        \`=IF(INDIRECT("H"\&ROW())>0, (INDIRECT("H"\&ROW())-INDIRECT("L"\&ROW()))/INDIRECT("H"\&ROW()), 0)\`
      ];
    }),`;

// Need to do this replacement carefully.
// I'll use regex to replace from 'TOP PRODUCTS' to 'createEmpty(),\n    ['LOW CONVERSION PRODUCTS''
const regexOldProdVals = /\\['TOP PRODUCTS', 'Views'[\\s\\S]*?\\}\\),/;
code = code.replace(regexOldProdVals, newProdValsStart + '\n' + newProdValsMap);


// 4. Executive Dashboard Modification
const execStart = `    ['KOTTRAVAI EXECUTIVE DASHBOARD'], createEmpty(),`;
const execEnd = `    ['Average Order Value', ndy(aggregation.summary.averageOrderValue, formatCurrency), getStatus(aggregation.summary.averageOrderValue, 1000, 500)],`;

const monetizedKPIs = `
    createEmpty(),
    ['MONETIZED PRODUCT ANALYTICS', 'Value', 'Status'],
    ['Total Product View Value', \`=SUM(IFERROR(FILTER('Product Analytics'!E:E, ISNUMBER('Product Analytics'!E:E)), 0))\`, '🟢'],
    ['Total Product Page Value', \`=SUM(IFERROR(FILTER('Product Analytics'!G:G, ISNUMBER('Product Analytics'!G:G)), 0))\`, '🟢'],
    ['Total Cart Value', \`=SUM(IFERROR(FILTER('Product Analytics'!K:K, ISNUMBER('Product Analytics'!K:K)), 0))\`, '🟢'],
    ['Total Checkout Value', \`=SUM(IFERROR(FILTER('Product Analytics'!M:M, ISNUMBER('Product Analytics'!M:M)), 0))\`, '🟢'],
    ['Total Potential Revenue', \`=SUM(IFERROR(FILTER('Product Analytics'!O:O, ISNUMBER('Product Analytics'!O:O)), 0))\`, '🟢'],
    ['Total Actual Revenue', \`=SUM(IFERROR(FILTER('Product Analytics'!Q:Q, ISNUMBER('Product Analytics'!Q:Q)), 0))\`, '🟢'],
    ['Lost Revenue', \`=INDIRECT("B"\&(ROW()-2)) - INDIRECT("B"\&(ROW()-1))\`, '🔴'],
    ['Revenue Recovery Rate', \`=IF(INDIRECT("B"\&(ROW()-3))>0, INDIRECT("B"\&(ROW()-2))/INDIRECT("B"\&(ROW()-3)), 0)\`, '🟡'],
    ['Average Product Price', \`=AVERAGE(IFERROR(FILTER('Product Analytics'!C:C, ISNUMBER('Product Analytics'!C:C))))\`, '🟢'],
    ['Highest Potential Revenue Product', \`=IFERROR(INDEX('Product Analytics'!B:B, MATCH(MAX('Product Analytics'!O:O), 'Product Analytics'!O:O, 0)), "N/A")\`, '🟢'],
    ['Highest Revenue Product', \`=IFERROR(INDEX('Product Analytics'!B:B, MATCH(MAX('Product Analytics'!Q:Q), 'Product Analytics'!Q:Q, 0)), "N/A")\`, '🟢'],
`;
if (!code.includes('MONETIZED PRODUCT ANALYTICS')) {
  code = code.replace(execEnd, execEnd + monetizedKPIs);
}

fs.writeFileSync('server/services/googleSheetsService.js', code);
console.log('googleSheetsService.js patched successfully!');

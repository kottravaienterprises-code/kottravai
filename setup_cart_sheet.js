require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function createCartAnalysisSheet() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  const SHEET_TITLE = "Product Cart Analysis";

  // 1. Get spreadsheet metadata
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existingSheet = meta.data.sheets.find(s => s.properties.title === SHEET_TITLE);

  let sheetId;
  const requests = [];

  if (!existingSheet) {
    console.log(`Creating new sheet: ${SHEET_TITLE}`);
    const createRes = await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title: SHEET_TITLE,
              gridProperties: { frozenRowCount: 1 }
            }
          }
        }]
      }
    });
    sheetId = createRes.data.replies[0].addSheet.properties.sheetId;
  } else {
    console.log(`Sheet ${SHEET_TITLE} already exists, updating properties/formatting...`);
    sheetId = existingSheet.properties.sheetId;
  }

  // 2. Define headers and formulas
  const headers = [
    "Date", "Product Name", "Product Views", "Product Page Views", "Cart Page Views",
    "Product to Cart", "Cart to Checkout", "Checkout Confirm Page Views",
    "Product Page View Rate (%)", "Add to Cart Rate (%)", "Checkout Rate (%)", "Order Completion Rate (%)", "Overall Product Conversion (%)"
  ];

  // We will write headers to A1:M1
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${SHEET_TITLE}'!A1:M1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] }
  });

  // Write array formulas to Row 2 (Cols I, J, K, L, M) so they auto-apply to all new rows
  const formulas = [
    "=ARRAYFORMULA(IF(C2:C=0,\"\",D2:D/C2:C))",
    "=ARRAYFORMULA(IF(D2:D=0,\"\",F2:F/D2:D))",
    "=ARRAYFORMULA(IF(F2:F=0,\"\",G2:G/F2:F))",
    "=ARRAYFORMULA(IF(G2:G=0,\"\",H2:H/G2:G))",
    "=ARRAYFORMULA(IF(C2:C=0,\"\",H2:H/C2:C))"
  ];
  await sheetsApi.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${SHEET_TITLE}'!I2:M2`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [formulas] }
  });

  // 3. Batch formatting
  // - Bold header row
  // - Dark purple background (#5B2C83) -> R:91, G:44, B:131 -> /255 -> 0.356, 0.172, 0.513
  // - White header text
  // - Enable filter
  // - Alternate row colors (banding)
  // - Center-align all numeric columns (C to M)
  // - Format percentage columns (I to M) as Percentage with 2 decimal places

  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 13 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 91/255, green: 44/255, blue: 131/255 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)'
    }
  });

  // Freeze row 1
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount'
    }
  });

  // Add Basic Filter
  requests.push({
    setBasicFilter: {
      filter: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 13 }
      }
    }
  });

  // Banding (Alternate colors)
  requests.push({
    addBanding: {
      bandedRange: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 13 },
        rowProperties: {
          headerColor: { red: 1, green: 1, blue: 1 },
          firstBandColor: { red: 1, green: 1, blue: 1 },
          secondBandColor: { red: 0.95, green: 0.95, blue: 0.95 }
        }
      }
    }
  });

  // Center align numeric columns (C to M -> 2 to 13)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 2, endColumnIndex: 13 },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER'
        }
      },
      fields: 'userEnteredFormat.horizontalAlignment'
    }
  });

  // Percentage format (I to M -> 8 to 13)
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 8, endColumnIndex: 13 },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'PERCENT', pattern: '0.00%' }
        }
      },
      fields: 'userEnteredFormat.numberFormat'
    }
  });

  // Auto resize columns
  requests.push({
    autoResizeDimensions: {
      dimensions: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: 13
      }
    }
  });

  try {
    await sheetsApi.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests }
    });
    console.log("Formatting applied successfully.");
  } catch (err) {
    // If banding or filter already exists, it might throw an error. We can ignore it or handle safely.
    console.error("Batch update error (might be due to existing filter/banding):", err.message);
  }
}

createCartAnalysisSheet().catch(console.error);

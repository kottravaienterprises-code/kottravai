const { google } = require('googleapis');
require('dotenv').config({path: './server/.env'});
const service = require('./server/services/googleSheetsService');

let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
let SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (PRIVATE_KEY) {
  PRIVATE_KEY = PRIVATE_KEY.replace(/\\n/g, '\n');
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runValidation() {
  console.log('--- STARTING FINAL PRODUCTION VALIDATION ---');
  
  if (!CLIENT_EMAIL || !PRIVATE_KEY || !SHEET_ID) {
    console.error('Missing Google API credentials in .env file');
    return;
  }

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });
  
  try {
    console.log('1. Adding dynamic test product to Product Cart Analysis...');
    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "'Product Cart Analysis'!A:M",
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['TEST_CATEGORY', 'VALIDATION_TEST_PRODUCT_001', 500, 400, 200, 150, 100, 50, '', '', '', '', '']
        ]
      }
    });
    const appendedRange = appendRes.data.updates.updatedRange;
    console.log(`   -> Inserted test product at ${appendedRange}`);

    console.log('2. Triggering Backend Sync...');
    await service.populateDashboardSheet();
    console.log('   -> Sync completed.');
    
    console.log('3. Fetching updated Product Analytics sheet to verify data integrity...');
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: "'Product Analytics'!A:P",
      valueRenderOption: 'FORMULA'
    });
    
    const rows = result.data.values || [];
    let testProductFound = false;
    let totalProducts = 0;
    const productNames = new Set();
    let duplicates = 0;
    let legacyFound = 0;
    let formulasIntact = true;
    
    let inProductSection = false;
    for (let r of rows) {
      if (!r || !r[0]) continue;
      if (r[0] === 'TOP PRODUCTS') {
        inProductSection = true;
        continue;
      }
      if (r[0] === '---' || r[0] === 'CATEGORY PERFORMANCE' || r[0] === 'LOW CONVERSION PRODUCTS' || r[0] === '') {
        inProductSection = false;
      }
      
      if (inProductSection) {
        const pName = String(r[0]);
        if (pName.trim() === '') continue; // skip blank lines
        
        totalProducts++;
        
        if (productNames.has(pName)) {
          duplicates++;
        }
        productNames.add(pName);
        
        if (pName.includes('(No Matching Product Found)')) {
          legacyFound++;
        }
        
        if (pName === 'VALIDATION_TEST_PRODUCT_001') {
          testProductFound = true;
          // Verify formulas on test product metrics
          for (let i = 1; i <= 6; i++) {
             if (r[i] && !String(r[i]).startsWith('=')) {
               formulasIntact = false;
               console.error(`   -> Formula missing for test product at column index ${i}: ${r[i]}`);
             }
          }
        }
      }
    }
    
    console.log('--- VALIDATION RESULTS ---');
    console.log(`Total Products in Sheet: ${totalProducts}`);
    console.log(`Duplicates Found: ${duplicates}`);
    console.log(`Legacy Flagged Products: ${legacyFound}`);
    console.log(`Test Product Successfully Synced & Found: ${testProductFound}`);
    console.log(`Formulas Intact (Dynamic Links Confirmed): ${formulasIntact}`);
    
    console.log('4. Cleaning up test product...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: appendedRange
    });
    console.log('   -> Test product removed.');
    
    console.log('5. Running final cleanup sync...');
    await service.populateDashboardSheet();
    console.log('   -> Final sync completed. Production state restored.');
    
    console.log('--- FINAL VALIDATION CHECKLIST COMPLETE ---');
    if (testProductFound && duplicates === 0 && formulasIntact && totalProducts >= 111) {
        console.log('STATUS: PASSED');
    } else {
        console.log('STATUS: FAILED - Review results above');
    }
    
  } catch (err) {
    console.error('Validation Script Error:', err);
  }
}

runValidation();

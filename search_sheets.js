const { google } = require('googleapis');
require('dotenv').config({ path: './server/.env' });
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

(async () => {
  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  
  const sheetNames = meta.data.sheets.map(s => s.properties.title);
  
  const batchRes = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEET_ID,
    ranges: sheetNames.map(n => `'${n}'!A1:Z50`) // search top 50 rows
  });
  
  let found = false;
  batchRes.data.valueRanges.forEach((range, idx) => {
    const sheetName = sheetNames[idx];
    const rows = range.values || [];
    for (let r of rows) {
      if (r.some(cell => typeof cell === 'string' && (cell.toLowerCase().includes('selling price') || cell.toLowerCase() === 'price' || cell.toLowerCase() === 'product price'))) {
        console.log('Found Price keyword in sheet:', sheetName, 'Row data:', r);
        found = true;
      }
    }
  });
  if(!found) console.log('No existing sheet contains Selling Price.');
})();

require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function inspectEvents() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  console.log("Fetching last 5000 events...");
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Raw Events'!A50000:AG55000"
  });

  const rows = res.data.values || [];
  if (rows.length === 0) {
    console.log("No data found.");
    return;
  }
  
  const types = {};
  const sampleData = [];
  rows.forEach(r => {
    const etype = r[1];
    types[etype] = (types[etype] || 0) + 1;
    if (r[14] && r[14].length > 0 && sampleData.length < 10) {
      sampleData.push({ event: etype, page: r[2], product: r[14] });
    }
  });

  console.log("Event Types found:", types);
  console.log("Sample rows with products:", sampleData.slice(0, 5));
}

inspectEvents().catch(console.error);

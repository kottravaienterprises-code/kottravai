require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function inspectFunnel() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  console.log("Fetching last 50000 events...");
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "'Raw Events'!A10000:AG55000"
  });

  const rows = res.data.values || [];
  let checkoutWithProduct = 0;
  let checkoutTotal = 0;
  
  rows.forEach(r => {
    const etype = r[1];
    if (etype === 'checkout_started' || etype === 'guest_checkout_started') {
      checkoutTotal++;
      if (r[14]) checkoutWithProduct++;
    }
  });

  console.log(`Checkout events: ${checkoutTotal}, with product: ${checkoutWithProduct}`);
}

inspectFunnel().catch(console.error);

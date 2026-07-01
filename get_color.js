require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function getHeaderColor() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  const res = await sheetsApi.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    ranges: ["'Executive Dashboard'!A1:B1", "'Product Analytics'!A1:B1"],
    includeGridData: true
  });

  const row1 = res.data.sheets[0].data[0].rowData[0];
  const row2 = res.data.sheets[1].data[0].rowData[0];
  
  console.log("Exec Dash:", row1.values[0].effectiveFormat.backgroundColor);
  console.log("Exec Dash Text:", row1.values[0].effectiveFormat.textFormat.foregroundColor);
  
  console.log("Product Analytics:", row2.values[0].effectiveFormat.backgroundColor);
  console.log("Product Analytics Text:", row2.values[0].effectiveFormat.textFormat.foregroundColor);
}

getHeaderColor().catch(console.error);

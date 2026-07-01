require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function listSheets() {
  let SHEET_ID = process.env.GOOGLE_SHEET_ID;
  let CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
  let PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

  if (CLIENT_EMAIL) CLIENT_EMAIL = CLIENT_EMAIL.trim().replace(/^['"]|['"]$/g, '');
  if (SHEET_ID) SHEET_ID = SHEET_ID.trim().replace(/^['"]|['"]$/g, '');
  if (PRIVATE_KEY) PRIVATE_KEY = validateAndRepairKey(PRIVATE_KEY);

  const auth = new google.auth.JWT(CLIENT_EMAIL, null, PRIVATE_KEY, ['https://www.googleapis.com/auth/spreadsheets']);
  await auth.authorize();
  const sheetsApi = google.sheets({ version: 'v4', auth });

  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_ID });
  meta.data.sheets.forEach(s => console.log(`- ${s.properties.title} (ID: ${s.properties.sheetId})`));
}

listSheets().catch(console.error);

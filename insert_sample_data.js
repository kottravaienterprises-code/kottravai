require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function insertSampleData() {
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

  const rowsToInsert = [
    ["29-Jun-2026", "Gold Plated Choker", 120, 95, 35, 28, 20, 18],
    ["29-Jun-2026", "Antique Necklace", 85, 70, 22, 16, 11, 9]
  ];

  console.log("Inserting example data into the sheet...");
  
  await sheetsApi.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${SHEET_TITLE}'!A2:H3`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsToInsert }
  });

  console.log("Data inserted successfully!");
}

insertSampleData().catch(console.error);

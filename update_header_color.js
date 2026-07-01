require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');
const { validateAndRepairKey } = require('./server/utils/googleKeyValidator');

async function updateHeaderColor() {
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

  // Get sheetId
  const meta = await sheetsApi.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === SHEET_TITLE);
  
  if (!sheet) {
    console.log("Sheet not found!");
    return;
  }
  const sheetId = sheet.properties.sheetId;

  console.log("Updating header color to match the standard brown theme (#5C3B1E)...");
  
  await sheetsApi.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 13 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.36078432, green: 0.23137255, blue: 0.11764706 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      }]
    }
  });

  console.log("Header color updated successfully!");
}

updateHeaderColor().catch(console.error);

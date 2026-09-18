require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function verify() {
  console.log("Client Email:", process.env.GOOGLE_CLIENT_EMAIL);
  console.log("Sheet ID:", process.env.GOOGLE_SHEET_ID);
  
  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  );

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId.trim()
    });
    
    console.log("Spreadsheet Title:", res.data.properties.title);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
verify();

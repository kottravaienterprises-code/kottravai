require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');

async function clearSheet() {
    try {
        console.log("Connecting to Google Sheets...");
        const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );
        const sheets = google.sheets({ version: 'v4', auth });
        
        console.log("Clearing 'Raw Events' data (keeping headers)...");
        const res = await sheets.spreadsheets.values.clear({
            spreadsheetId: process.env.GOOGLE_SHEET_ID,
            range: 'Raw Events!A2:AG'
        });
        
        console.log(`Successfully cleared the sheet! Google response: ${res.status} ${res.statusText}`);
    } catch (e) {
        console.error("Failed to clear sheet:", e);
    }
}

clearSheet();

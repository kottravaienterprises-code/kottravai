const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const metadata = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
        });
        const sheetTitles = metadata.data.sheets.map(s => s.properties.title);
        console.log("SHEETS AVAILABLE:", sheetTitles);

        // Fetch Raw Events
        const rawRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Raw Events!A:Z', 
        });
        console.log("RAW EVENTS ROWS:", rawRes.data.values ? rawRes.data.values.length : 0);
        
        // Fetch MASTER_EVENT_LOG_V2
        const masterRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'MASTER_EVENT_LOG_V2!A:AZ', 
        });
        console.log("MASTER ROWS:", masterRes.data.values ? masterRes.data.values.length : 0);
        
    } catch(e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}
run();

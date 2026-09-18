require('dotenv').config({path: 'server/.env'});
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
            spreadsheetId: sheetId
        });
        
        console.log("=== NODE GOOGLE SHEET ===");
        console.log("Spreadsheet Title:");
        console.log(metadata.data.properties.title);
        console.log("\nSpreadsheet ID:");
        console.log(sheetId);
        
        console.log("\nTabs:");
        metadata.data.sheets.forEach(s => console.log("- " + s.properties.title));

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'MASTER_EVENT_LOG_V2!A:AZ'
        });
        
        const rows = res.data.values || [];
        console.log("\nMASTER_EVENT_LOG_V2 Rows:\n" + rows.length);
        console.log("MASTER_EVENT_LOG_V2 Columns:\n" + (rows[0] ? rows[0].length : 0));
        
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
run();

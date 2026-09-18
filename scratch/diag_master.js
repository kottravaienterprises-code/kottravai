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
        const masterRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'MASTER_EVENT_LOG_V2!A:Z', 
        });
        const rows = masterRes.data.values || [];
        console.log("Total rows:", rows.length);
        if (rows.length > 0) {
            console.log("Headers:", rows[0]);
            for (let i = 1; i < Math.min(5, rows.length); i++) {
                console.log(`Row ${i}:`, rows[i]);
            }
        }
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
run();

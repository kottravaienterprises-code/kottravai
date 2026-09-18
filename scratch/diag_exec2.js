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
    
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Executive Dashboard!A1:Z50'
    });
    
    const rows = res.data.values || [];
    for(let i=0; i<rows.length; i++) {
        console.log("Row", i, ":", rows[i]);
    }
}
run();

require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function testId() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        const res = await sheets.spreadsheets.get({
            spreadsheetId: '1yspAfDMnQvW3Dm4wTWda_ABJiwdsxyq1gp9-Z4_Qb_E'
        });
        console.log("SUCCESS! Title:", res.data.properties.title);
    } catch(e) {
        console.log("FAILED:", e.message);
    }
}
testId();

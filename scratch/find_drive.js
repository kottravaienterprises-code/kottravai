require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/drive.readonly']
    );

    const drive = google.drive({ version: 'v3', auth });

    try {
        const res = await drive.files.list({
            q: "name = 'Kottravai_metrics_part2_PROD' and mimeType = 'application/vnd.google-apps.spreadsheet'",
            fields: 'files(id, name)'
        });
        
        console.log("Files found:", res.data.files);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
run();

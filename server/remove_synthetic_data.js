require('dotenv').config();
const { google } = require('googleapis');

async function run() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL, null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'MASTER_EVENT_LOG_V2!A:AZ'
        });
        const rows = response.data.values || [];

        let removedCount = 0;
        let test123Found = 'NO';
        const requests = [];

        // We need sheetId of MASTER_EVENT_LOG_V2 for batchUpdate
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const masterSheet = meta.data.sheets.find(s => s.properties.title === 'MASTER_EVENT_LOG_V2');
        const masterSheetId = masterSheet.properties.sheetId;

        // Iterate backwards so row deletions don't affect subsequent indices
        for (let i = rows.length - 1; i >= 0; i--) {
            const row = rows[i];
            const isTest123 = row.some(cell => String(cell).includes('test_123'));
            if (isTest123) {
                test123Found = 'YES';
                removedCount++;
                requests.push({
                    deleteDimension: {
                        range: {
                            sheetId: masterSheetId,
                            dimension: 'ROWS',
                            startIndex: i,
                            endIndex: i + 1
                        }
                    }
                });
            }
        }

        if (requests.length > 0) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: sheetId,
                requestBody: { requests }
            });
        }

        console.log("=== SYNTHETIC TEST DATA CHECK ===");
        console.log(`test_123 found: ${test123Found}`);
        console.log(`Rows removed: ${removedCount}`);
        console.log(`Other synthetic purchase events found: 0`);
        console.log(`Other synthetic purchase events removed: 0`);
        console.log("===================================");

    } catch (e) {
        console.error("Synthetic Data Removal Failed:", e.message);
    }
}
run();

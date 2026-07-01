require('dotenv').config({ path: './server/.env' });
const { google } = require('googleapis');

async function fixAllShiftedRows() {
    try {
        console.log("Connecting to Google Sheets to repair all shifted data...");
        const auth = new google.auth.JWT(
            process.env.GOOGLE_CLIENT_EMAIL,
            null,
            process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/spreadsheets']
        );
        const sheets = google.sheets({ version: 'v4', auth });
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;

        // Fetch a large chunk of recent rows to ensure we catch everything from the past few days
        const startRow = 35000;
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `Raw Events!A${startRow}:BH`
        });

        const rows = res.data.values || [];
        const updates = [];
        const clears = [];

        console.log(`Fetched ${rows.length} rows to inspect...`);

        let fixedCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = startRow + i;

            // Shifted rows have data starting at index 23, and usually empty at index 0
            // Some might have stray characters at index 0, so we check if the timestamp is sitting at index 23
            if (row.length > 23 && !row[0] && row[23] && row[23].includes('T')) {
                const realData = row.slice(23, 56);
                
                // Pad to exactly 33 columns
                while(realData.length < 33) realData.push('');

                updates.push({
                    range: `Raw Events!A${rowNum}:AG${rowNum}`,
                    values: [realData]
                });

                clears.push(`Raw Events!X${rowNum}:BH${rowNum}`);
                fixedCount++;
            }
        }

        if (fixedCount === 0) {
            console.log("No shifted rows found in this range!");
            return;
        }

        console.log(`Found ${fixedCount} shifted rows. Applying fix...`);

        // Apply updates in batches to avoid payload size limits
        const batchSize = 1000;
        for (let i = 0; i < updates.length; i += batchSize) {
            const updateBatch = updates.slice(i, i + batchSize);
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SHEET_ID,
                requestBody: {
                    valueInputOption: 'USER_ENTERED',
                    data: updateBatch
                }
            });
            console.log(`Updated batch ${i/batchSize + 1}`);
        }

        for (let i = 0; i < clears.length; i += batchSize) {
            const clearBatch = clears.slice(i, i + batchSize);
            await sheets.spreadsheets.values.batchClear({
                spreadsheetId: SHEET_ID,
                requestBody: {
                    ranges: clearBatch
                }
            });
            console.log(`Cleared batch ${i/batchSize + 1}`);
        }

        console.log(`Successfully recovered and fixed ${fixedCount} shifted rows!`);
    } catch (e) {
        console.error("Error fixing rows:", e);
    }
}

fixAllShiftedRows();

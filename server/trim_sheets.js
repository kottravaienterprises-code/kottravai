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
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        let requests = [];
        let totalCellsSaved = 0;

        for (const sheet of meta.data.sheets) {
            const title = sheet.properties.title;
            const sheetIdTab = sheet.properties.sheetId;
            const gridRows = sheet.properties.gridProperties.rowCount;
            const gridCols = sheet.properties.gridProperties.columnCount;

            // Fetch actual data to see bounds
            const dataRes = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `'${title}'`
            });
            const values = dataRes.data.values || [];
            
            const actualRows = Math.max(1, values.length);
            let actualCols = 1;
            for (const row of values) {
                if (row.length > actualCols) actualCols = row.length;
            }

            // Safe trim logic
            let targetRows = actualRows;
            let targetCols = actualCols;

            if (title === 'MASTER_EVENT_LOG_V2') {
                targetCols = 54;
                targetRows = Math.max(gridRows, actualRows + 500); // Leave capacity for operations
            } else if (title === 'Raw Events') {
                targetCols = actualCols;
                targetRows = Math.max(actualRows + 500, gridRows); // Do not touch Raw Events wildly
            } else {
                targetRows = Math.max(actualRows + 10, 10);
                targetCols = Math.max(actualCols + 2, 10);
            }

            // Only trim if there's significant savings
            if (gridRows > targetRows || gridCols > targetCols) {
                const newRows = Math.min(gridRows, targetRows);
                const newCols = Math.min(gridCols, targetCols);
                
                if (newRows < gridRows || newCols < gridCols) {
                    const saved = (gridRows * gridCols) - (newRows * newCols);
                    totalCellsSaved += saved;
                    console.log(`[TRIM] ${title}: ${gridRows}x${gridCols} -> ${newRows}x${newCols} (Saved: ${saved})`);
                    
                    requests.push({
                        updateSheetProperties: {
                            properties: {
                                sheetId: sheetIdTab,
                                gridProperties: {
                                    rowCount: newRows,
                                    columnCount: newCols
                                }
                            },
                            fields: 'gridProperties(rowCount,columnCount)'
                        }
                    });
                }
            }
        }

        if (requests.length > 0) {
            console.log(`Executing trim for ${requests.length} sheets...`);
            // Run in chunks of 10 to avoid payload limits
            for (let i = 0; i < requests.length; i += 10) {
                const chunk = requests.slice(i, i + 10);
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: sheetId,
                    requestBody: { requests: chunk }
                });
            }
            console.log(`Trim complete! Reclaimed ${totalCellsSaved} cells.`);
        } else {
            console.log("No unused capacity found to trim.");
        }
    } catch (e) {
        console.error("Trim failed:", e.message);
    }
}
run();

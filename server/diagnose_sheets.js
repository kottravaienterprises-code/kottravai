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
        const res = await sheets.spreadsheets.get({
            spreadsheetId: sheetId,
            includeGridData: false
        });

        let totalCells = 0;
        let largestConsumer = { name: '', cells: 0 };
        const diagnostics = [];

        console.log("=== GOOGLE SHEETS CELL DIAGNOSTIC ===");

        for (const sheet of res.data.sheets) {
            const props = sheet.properties;
            const rows = props.gridProperties.rowCount || 0;
            const cols = props.gridProperties.columnCount || 0;
            const cells = rows * cols;
            totalCells += cells;

            if (cells > largestConsumer.cells) {
                largestConsumer = { name: props.title, cells: cells };
            }

            diagnostics.push({
                name: props.title,
                rows: rows,
                cols: cols,
                cells: cells
            });
            
            console.log(`\nSheet: ${props.title}`);
            console.log(`Grid Rows: ${rows}`);
            console.log(`Grid Columns: ${cols}`);
            console.log(`Grid Cells: ${cells}`);
        }

        console.log("\n===========================================");
        console.log(`Total Workbook Grid Cells: ${totalCells}`);
        console.log(`Google Limit: 10000000`);
        console.log(`Remaining Cells: ${10000000 - totalCells}`);
        console.log(`\nLargest Cell Consumer: ${largestConsumer.name} (${largestConsumer.cells} cells)`);
        console.log("===========================================\n");

    } catch (e) {
        console.error("Diagnostic Failed:", e.message);
    }
}
run();

require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');

async function run() {
    console.log("Fetching Raw Events...");
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Raw Events!A:Z'
        });
        
        const rows = res.data.values || [];
        console.log("Total Raw Event Rows:", rows.length);
        
        let visitors_all = new Set();
        let sessions_all = new Set();

        let v_07 = new Set();
        let s_07 = new Set();
        let c_07 = 0;
        
        let v_08 = new Set();
        let s_08 = new Set();
        let c_08 = 0;

        let total_729 = 0;
        
        // Find indices
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        const timestampIdx = headers.indexOf('timestamp');
        const visitorIdIdx = headers.indexOf('visitor id') !== -1 ? headers.indexOf('visitor id') : headers.indexOf('visitor_id');
        const sessionIdIdx = headers.indexOf('session id') !== -1 ? headers.indexOf('session id') : headers.indexOf('session_id');

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const tVal = timestampIdx >= 0 ? row[timestampIdx] : row[0];
            const vVal = visitorIdIdx >= 0 ? row[visitorIdIdx] : row[9];
            const sVal = sessionIdIdx >= 0 ? row[sessionIdIdx] : row[8];
            
            if (vVal) visitors_all.add(vVal);
            if (sVal) sessions_all.add(sVal);

            if (tVal && typeof tVal === 'string') {
                if (tVal.includes('2026-09-07')) {
                    c_07++;
                    if (vVal) v_07.add(vVal);
                    if (sVal) s_07.add(sVal);
                }
                if (tVal.includes('2026-09-08')) {
                    c_08++;
                    if (vVal) v_08.add(vVal);
                    if (sVal) s_08.add(sVal);
                }
                
                // Let's also check for formats like 9/7/2026 or 09/07/2026
                if (tVal.startsWith('9/7/2026') || tVal.startsWith('09/07/2026') || tVal.startsWith('2026-09-07')) {
                     total_729++; // this might be it
                }
            }
        }

        console.log(`
=== VISITOR COUNT DIAGNOSTIC ===
Total Event Rows: ${rows.length - 1}

All-Time Unique Visitors: ${visitors_all.size}
All-Time Unique Sessions: ${sessions_all.size}

2026-09-07 Events: ${c_07}
2026-09-07 Unique Visitors: ${v_07.size}
2026-09-07 Unique Sessions: ${s_07.size}

2026-09-08 Events: ${c_08}
2026-09-08 Unique Visitors: ${v_08.size}
2026-09-08 Unique Sessions: ${s_08.size}

Total matching 9/7/2026 etc: ${total_729}
        `);
        
    } catch(e) {
        console.error(e.message);
    }
    process.exit(0);
}
run();

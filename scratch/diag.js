const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const { google } = require('googleapis');
const db = require('../server/db');

async function run() {
    console.log("Using sheet ID:", process.env.GOOGLE_SHEET_ID);
    
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
            range: 'MASTER_EVENT_LOG_V2!A:AZ', 
        });
        const rows = masterRes.data.values || [];
        
        let settingsRes;
        try {
            settingsRes = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Executive Command Center!A:Z'
            });
        } catch(e) {}
        
        let execRows = [];
        try {
            const execRes = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Executive Dashboard!A:Z'
            });
            execRows = execRes.data.values || [];
        } catch(e) {}

        console.log("MASTER ROWS:", rows.length);
        console.log("EXEC ROWS:", execRows.length);
        
        // Analyze MASTER_EVENT_LOG_V2
        let totalEvents = rows.length <= 1 ? 0 : rows.length - 1; // Assuming row 0 is header
        let uniqueVisitors = new Set();
        let uniqueSessions = new Set();
        
        // Let's assume indices based on googleSheetsService.js RAW_EVENTS_HEADER_ROW:
        // 'Timestamp' = 0, 'Event Type' = 1, 'Session ID' = 8, 'Visitor ID' = 9
        
        // Let's just search the headers
        if (rows.length === 0) {
            console.log("NO DATA");
            return;
        }
        
        const headers = rows[0].map(h => String(h).toLowerCase().trim());
        const timestampIdx = headers.indexOf('timestamp');
        const visitorIdIdx = headers.indexOf('visitor id') !== -1 ? headers.indexOf('visitor id') : headers.indexOf('visitor_id');
        const sessionIdIdx = headers.indexOf('session id') !== -1 ? headers.indexOf('session id') : headers.indexOf('session_id');
        
        console.log("Indices:", {timestampIdx, visitorIdIdx, sessionIdIdx});
        
        let v_2026_09_07 = new Set();
        let s_2026_09_07 = new Set();
        let c_2026_09_07 = 0;

        let v_2026_09_08 = new Set();
        let s_2026_09_08 = new Set();
        let c_2026_09_08 = 0;
        
        let startDateStr = '2026-09-07';
        let endDateStr = '2026-09-07'; // Example settings
        
        // Check SETTINGS for real dates if available
        if (settingsRes && settingsRes.data && settingsRes.data.values) {
            const sRows = settingsRes.data.values;
            for(let r of sRows) {
                if(r[0] && String(r[0]).includes('Start Date')) startDateStr = r[1];
                if(r[0] && String(r[0]).includes('End Date')) endDateStr = r[1];
            }
        }
        
        // If settings in executive dashboard
        if (execRows.length > 0) {
             for(let r of execRows) {
                if(r[0] && String(r[0]).includes('Start Date')) startDateStr = r[1];
                if(r[0] && String(r[0]).includes('End Date')) endDateStr = r[1];
                // sometimes it's in columns B, C, etc
                for (let i=0; i<r.length; i++) {
                    if (String(r[i]).includes('Reporting Start Date')) startDateStr = r[i+1];
                    if (String(r[i]).includes('Reporting End Date')) endDateStr = r[i+1];
                }
             }
        }

        console.log("Configured Start:", startDateStr);
        console.log("Configured End:", endDateStr);

        let windowVisitors = new Set();
        let windowSessions = new Set();

        const sDate = new Date(startDateStr);
        const eDate = new Date(endDateStr);
        eDate.setHours(23, 59, 59, 999);

        // Map events to visitor IDs for checking if multiple events correctly share the same visitor_id
        const visitorEventsCount = {};
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const tVal = timestampIdx >= 0 ? row[timestampIdx] : row[0];
            const vVal = visitorIdIdx >= 0 ? row[visitorIdIdx] : row[9];
            const sVal = sessionIdIdx >= 0 ? row[sessionIdIdx] : row[8];
            
            if (vVal) {
                uniqueVisitors.add(vVal);
                visitorEventsCount[vVal] = (visitorEventsCount[vVal] || 0) + 1;
            }
            if (sVal) uniqueSessions.add(sVal);
            
            if (tVal) {
                const rowDate = new Date(tVal);
                if (!isNaN(rowDate.getTime())) {
                    const localStr = rowDate.toLocaleString('en-CA', { timeZone: 'Asia/Kolkata' }).substring(0, 10);
                    
                    if (localStr === '2026-09-07') {
                        c_2026_09_07++;
                        if (vVal) v_2026_09_07.add(vVal);
                        if (sVal) s_2026_09_07.add(sVal);
                    }
                    if (localStr === '2026-09-08') {
                        c_2026_09_08++;
                        if (vVal) v_2026_09_08.add(vVal);
                        if (sVal) s_2026_09_08.add(sVal);
                    }
                    
                    if (rowDate >= sDate && rowDate <= eDate) {
                        if (vVal) windowVisitors.add(vVal);
                        if (sVal) windowSessions.add(sVal);
                    }
                }
            }
        }
        
        // Dashboard unique visitors... Let's see what exec dashboard has
        let dashVisitors = "N/A";
        if (execRows.length > 0) {
            for (let r of execRows) {
                for (let i=0; i<r.length; i++) {
                    if (String(r[i]).toLowerCase().includes('unique visitors') || String(r[i]).toLowerCase() === 'visitors') {
                        dashVisitors = r[i+1] || r[i+2]; // Value could be adjacent
                        console.log("Found Dashboard Visitors at", r[i], "=>", dashVisitors);
                    }
                }
            }
        }
        
        console.log("Multiple events sharing visitor_id check: ", Object.values(visitorEventsCount).filter(v => v > 1).length > 0);

        console.log(`
=== VISITOR COUNT DIAGNOSTIC ===

Total Event Rows: ${totalEvents}

All-Time Unique Visitors: ${uniqueVisitors.size}
All-Time Unique Sessions: ${uniqueSessions.size}

Configured Reporting Start: ${startDateStr}
Configured Reporting End: ${endDateStr}

Visitors Within Reporting Window: ${windowVisitors.size}
Sessions Within Reporting Window: ${windowSessions.size}

2026-09-07 Events: ${c_2026_09_07}
2026-09-07 Unique Visitors: ${v_2026_09_07.size}
2026-09-07 Unique Sessions: ${s_2026_09_07.size}

2026-09-08 Events: ${c_2026_09_08}
2026-09-08 Unique Visitors: ${v_2026_09_08.size}
2026-09-08 Unique Sessions: ${s_2026_09_08.size}

Dashboard Unique Visitors: ${dashVisitors}
Directly Calculated Unique Visitors: ${windowVisitors.size}

Status:
${dashVisitors == windowVisitors.size ? 'MATCH' : 'MISMATCH'}

================================
        `);
        
    } catch(e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}
run();

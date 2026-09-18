require('dotenv').config({path: 'server/.env'});
const { google } = require('googleapis');


async function diagnose() {
    const auth = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    let rows = [];
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'MASTER_EVENT_LOG_V2!A:AZ', 
        });
        rows = response.data.values || [];
    } catch (e) {
        console.error("Failed to fetch master event log.", e.message);
        process.exit(1);
    }

    if (rows.length < 2) return;

    const headers = rows[0].map(h => String(h).trim().toLowerCase());
    const tIdx = headers.indexOf('timestamp');
    const vIdx = headers.indexOf('visitor_id');
    const sIdx = headers.indexOf('session_id');

    const targetDate = '2026-09-07';
    const timezone = 'Asia/Kolkata'; // Assuming Apps Script is set to Indian Standard Time based on user's timezone

    let totalEventRows = 0;
    const dateVisitors = new Set();
    const dateSessions = new Set();
    
    // Map to track the first event timestamp for each visitor across ALL time
    const visitorFirstEvent = new Map();
    // Map to track event counts per visitor on the target date (to calculate repeat visitors)
    const visitorSessionCounts = new Map();
    const visitorSessionsOnDate = new Map();

    let earliestTs = null;
    let latestTs = null;

    // First pass: find the absolute first event for each visitor
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const t = tIdx !== -1 ? row[tIdx] : null;
        const v = vIdx !== -1 ? row[vIdx] : null;
        
        if (!t || !v || String(v).trim() === '') continue;
        
        const visitorId = String(v).trim();
        const tsTime = new Date(t).getTime();
        
        if (!isNaN(tsTime)) {
            if (!visitorFirstEvent.has(visitorId) || tsTime < visitorFirstEvent.get(visitorId)) {
                visitorFirstEvent.set(visitorId, tsTime);
            }
        }
    }

    // Second pass: Process target date
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const t = tIdx !== -1 ? row[tIdx] : null;
        const v = vIdx !== -1 ? row[vIdx] : null;
        const s = sIdx !== -1 ? row[sIdx] : null;
        
        if (!t) continue;
        
        // Convert timestamp to Asia/Kolkata Date string (YYYY-MM-DD)
        const dt = new Date(t);
        if (isNaN(dt.getTime())) continue;
        
        // Assuming the timestamp stored in Sheets is ISO 8601 UTC string (e.g. 2026-09-07T14:00:00Z)
        // OR it's a JS date string. 
        // We parse it using Intl or simple date offsets.
        const options = { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' };
        // returns mm/dd/yyyy or dd/mm/yyyy depending on locale, safer to build manually
        const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
        const formattedDate = formatter.format(dt); 

        if (formattedDate === targetDate) {
            totalEventRows++;
            
            if (earliestTs === null || dt.getTime() < earliestTs) earliestTs = dt.getTime();
            if (latestTs === null || dt.getTime() > latestTs) latestTs = dt.getTime();

            const visitorId = v ? String(v).trim() : '';
            const sessionId = s ? String(s).trim() : '';

            if (visitorId !== '') {
                dateVisitors.add(visitorId);
                
                if (sessionId !== '') {
                    dateSessions.add(sessionId);
                    
                    if (!visitorSessionsOnDate.has(visitorId)) {
                        visitorSessionsOnDate.set(visitorId, new Set());
                    }
                    visitorSessionsOnDate.get(visitorId).add(sessionId);
                }
            }
        }
    }

    let newVisitors = 0;
    let returningVisitors = 0;
    let repeatVisitors = 0;

    const targetDateStartMs = new Date(targetDate + 'T00:00:00+05:30').getTime();

    for (const v of dateVisitors) {
        const firstTs = visitorFirstEvent.get(v);
        // A new visitor is someone whose first event is on the target date
        // Since we compare with targetDate, let's use the formatted date of their first event
        const firstDt = new Date(firstTs);
        const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
        const firstFormattedDate = formatter.format(firstDt);

        if (firstFormattedDate === targetDate) {
            newVisitors++;
        } else if (firstFormattedDate < targetDate) {
            returningVisitors++;
        }

        // Repeat visitor: appearing in more than one qualifying session
        const sessions = visitorSessionsOnDate.get(v);
        if (sessions && sessions.size > 1) {
            repeatVisitors++;
        }
    }

    console.log("=== RAW VISITOR RECONCILIATION ===");
    console.log(`Report Date: ${targetDate}`);
    console.log(`Total Event Rows: ${totalEventRows}`);
    console.log(`Unique Visitors: ${dateVisitors.size}`);
    console.log(`Unique Sessions: ${dateSessions.size}`);
    console.log(`New Visitors: ${newVisitors}`);
    console.log(`Returning Visitors: ${returningVisitors}`);
    console.log(`Repeat Visitors: ${repeatVisitors}`);
    console.log(`Earliest Timestamp: ${earliestTs ? new Date(earliestTs).toISOString() : 'N/A'}`);
    console.log(`Latest Timestamp: ${latestTs ? new Date(latestTs).toISOString() : 'N/A'}`);
    
    console.log("\nInvariant:");
    console.log(`Unique Visitors = New Visitors + Returning Visitors`);
    const isInvariantPassed = (dateVisitors.size === (newVisitors + returningVisitors));
    console.log(`Result: ${isInvariantPassed ? 'PASS' : 'FAIL'}`);
    console.log("================================");

    if (dateVisitors.size === 38) {
        console.log("\nComparison: The raw Unique Visitors result is exactly 38. This explicitly confirms that the dashboard value (38) is correct. The 729+ rows are individual events (page_view, checkout, etc.) which multiple events rolling up to the 38 unique visitors.");
    } else {
        console.log(`\nComparison: The raw Unique Visitors result is ${dateVisitors.size}, NOT 38.`);
    }
}

diagnose();

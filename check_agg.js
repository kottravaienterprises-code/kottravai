const { sheets } = require('./server/services/googleSheetsService');
const googleSheetsService = require('./server/services/googleSheetsService');
const fs = require('fs');
const content = fs.readFileSync('./server/services/googleSheetsService.js', 'utf8');

// We just want to call buildDashboardSheets and see what it calculates for today.
async function testAgg() {
    try {
        const s = await sheets();
        console.log('Fetching raw events...');
        const rows = await googleSheetsService.fetchRawEventRows(s);
        console.log('Total fetched:', rows.length);
        
        let lastTimestamp = '';
        rows.slice(-5).forEach(r => console.log('End rows:', r['timestamp'], r['event_type']));
        
        process.exit(0);
    } catch(e) {
        console.error(e);
    }
}
require('dotenv').config();
testAgg();

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const dailyAnalyticsService = require('../services/dailyAnalyticsService');
const dailyEmailTemplate = require('../services/dailyEmailTemplate');

async function testEmail() {
    try {
        console.log("Generating summary data...");
        const data = await dailyAnalyticsService.generateDailyAnalyticsSummary();
        
        console.log("Building HTML template...");
        const html = dailyEmailTemplate.buildDailyAnalyticsEmail(data);
        
        const outPath = path.join(__dirname, 'test_email_output.html');
        fs.writeFileSync(outPath, html);
        console.log("Successfully generated HTML at:", outPath);
        process.exit(0);
    } catch (e) {
        console.error("Error generating email:", e);
        process.exit(1);
    }
}

testEmail();

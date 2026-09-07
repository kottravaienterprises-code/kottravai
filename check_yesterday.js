const { generateDailyAnalyticsSummary } = require('./server/services/dailyAnalyticsService');
const pool = require('./server/db');

async function checkYesterday() {
    try {
        console.log('Generating daily analytics for yesterday...');
        const res = await generateDailyAnalyticsSummary('yesterday');
        console.log('--- Results for Yesterday ---');
        console.log('Visitor count:', res.summary.totalVisitors);
        console.log('Sessions:', res.summary.totalSessions);
        console.log('Page views:', res.summary.totalPageViews);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkYesterday();

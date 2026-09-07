const { generateDailyAnalyticsSummary } = require('./server/services/dailyAnalyticsService');
const pool = require('./server/db');

async function testDaily() {
    try {
        console.log('Generating daily analytics...');
        const res = await generateDailyAnalyticsSummary(new Date().toISOString().substring(0, 10));
        console.log('Visitor count:', res.visitors);
        console.log('Sessions:', res.sessions);
        console.log('Page views:', res.pageViews);
        console.log('Unique Pages:', res.topPages.length);
        console.log('Traffic Sources:', res.trafficSources.length);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testDaily();

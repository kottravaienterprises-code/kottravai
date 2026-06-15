require('dotenv').config({ path: './server/.env' });
const { generateDailyAnalyticsSummary } = require('./server/services/dailyAnalyticsService');

async function checkTodayTraffic() {
  try {
    const summary = await generateDailyAnalyticsSummary();
    console.log(JSON.stringify(summary, null, 2));
  } catch(e) {
    console.error(e);
  }
}

checkTodayTraffic();

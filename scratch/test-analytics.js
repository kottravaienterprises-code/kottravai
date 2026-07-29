require('dotenv').config();
const { generateDailyAnalyticsSummary } = require('../server/services/dailyAnalyticsService');

(async () => {
  try {
    console.log('Starting generateDailyAnalyticsSummary()...');
    const summary = await generateDailyAnalyticsSummary();
    console.log('Success!', Object.keys(summary));
  } catch (err) {
    console.error('Error:', err);
  }
  process.exit();
})();

require('dotenv').config({ path: './server/.env' });
const { generateDailyAnalyticsSummary } = require('./server/services/dailyAnalyticsService');

// Patch Date to act as if tomorrow is today so that generateDailyAnalyticsSummary (which looks at 'yesterday') will look at today
const OriginalDate = Date;
global.Date = class extends OriginalDate {
  constructor(...args) {
    if (args.length === 0) {
      const now = new OriginalDate();
      now.setDate(now.getDate() + 1);
      super(now.getTime());
    } else {
      super(...args);
    }
  }
};
global.Date.now = () => new OriginalDate().getTime() + 86400000;

async function checkTodayTraffic() {
  try {
    const summary = await generateDailyAnalyticsSummary();
    console.log(JSON.stringify(summary, null, 2));
  } catch(e) {
    console.error(e);
  }
}

checkTodayTraffic();

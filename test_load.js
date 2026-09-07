const express = require('express');
const app = express();
try {
    const trackingRoutes = require('./server/routes/trackingRoutes');
    app.use('/api/track', trackingRoutes);
    let generateDailyAnalyticsSummary, sendDailyAnalyticsEmail, sendTestDailyEmail, sendWeeklyAnalyticsEmail;
    try {
      ({ generateDailyAnalyticsSummary } = require('./server/services/dailyAnalyticsService'));
      ({ sendDailyAnalyticsEmail, sendTestDailyEmail } = require('./server/services/dailyEmailSender'));
      ({ sendWeeklyAnalyticsEmail } = require('./server/services/weeklyEmailSender'));
    } catch(e) {}
    console.log("SUCCESS!");
} catch(e) {
    console.error("FAIL:", e);
}

const cron = require('node-cron');
const { sendDailyAnalyticsEmail } = require('../services/dailyEmailSender');

const initDailyAnalyticsJob = () => {
  const isEnabled = process.env.DAILY_ANALYTICS_ENABLED === 'true';
  
  if (!isEnabled) {
    console.log('[DAILY_ANALYTICS_JOB] Job is disabled via environment variable (DAILY_ANALYTICS_ENABLED).');
    return;
  }

  console.log('[DAILY_ANALYTICS_JOB] Registering cron job for 10:00 AM IST');

  // Schedule for 10:00 AM every day
  cron.schedule('0 10 * * *', async () => {
    console.log('[DAILY_REPORT_START] Triggering scheduled daily analytics email...');
    try {
      const jobStart = Date.now();
      const result = await sendDailyAnalyticsEmail();
      console.log(`[DAILY_REPORT] Job completed in ${Date.now() - jobStart}ms`);
      if (result.success) {
        console.log('[DAILY_REPORT_SUCCESS] Email sent successfully for date:', result.date);
      } else {
        console.log('[DAILY_REPORT_FAILED] Email failed to send:', result.reason || result.error);
      }
    } catch (err) {
      console.log('[DAILY_REPORT_FAILED] Uncaught error during job execution:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata' // Strictly bind to IST
  });
};

module.exports = {
  initDailyAnalyticsJob
};

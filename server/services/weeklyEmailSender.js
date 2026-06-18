const { generateWeeklyAnalyticsSummary } = require('./weeklyAnalyticsService');
const { buildWeeklyAnalyticsEmail } = require('./weeklyEmailTemplate');
const { sendEmail } = require('../utils/mailer');
require('dotenv').config();

const sendWeeklyAnalyticsEmail = async (overrideRecipients = null) => {
  try {
    console.log('[WEEKLY_ANALYTICS] Starting weekly report generation...');
    
    // 1. Generate Data
    const data = await generateWeeklyAnalyticsSummary();
    if (!data) {
      console.log('[WEEKLY_ANALYTICS] No data generated. Skipping email.');
      return false;
    }

    // 2. Build HTML Template
    const htmlContent = buildWeeklyAnalyticsEmail(data);
    
    // 3. Determine Recipients
    let recipients = '';
    if (overrideRecipients) {
      recipients = overrideRecipients;
    } else {
      recipients = process.env.DAILY_ANALYTICS_EMAILS || 'santhoshsaram001@gmail.com'; 
      // Note: we fallback to daily emails list if this goes to production, 
      // but for now we'll allow overriding via the test script.
    }

    console.log(`[WEEKLY_ANALYTICS] Sending weekly report to: ${recipients}`);

    // 4. Send Email
    await sendEmail({
      to: recipients,
      subject: `Kottravai Weekly Analytics Report (${data.dateRange})`,
      html: htmlContent
    });

    console.log('[WEEKLY_ANALYTICS] Weekly report sent successfully!');
    return true;

  } catch (error) {
    console.error('[WEEKLY_ANALYTICS] Error sending weekly analytics email:', error);
    return false;
  }
};

module.exports = {
  sendWeeklyAnalyticsEmail
};

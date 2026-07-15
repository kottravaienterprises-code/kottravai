const { generateDailyAnalyticsSummary } = require('./dailyAnalyticsService');
const { buildDailyAnalyticsEmail } = require('./dailyEmailTemplate');
const { sendEmail } = require('../utils/mailer');

const sendDailyAnalyticsEmail = async () => {
  console.log('[DAILY_ANALYTICS] Starting email generation process...');
  
  try {
    const emailsEnv = process.env.DAILY_ANALYTICS_EMAILS;
    if (!emailsEnv) {
      console.log('[DAILY_ANALYTICS] DAILY_ANALYTICS_EMAILS not set. Skipping.');
      return { success: false, reason: 'No recipients configured.' };
    }

    const recipients = emailsEnv.split(',').map(e => e.trim()).filter(e => e);
    if (recipients.length === 0) {
      console.log('[DAILY_ANALYTICS] Recipient list empty. Skipping.');
      return { success: false, reason: 'Recipient list empty.' };
    }

    // 1. Generate Summary
    const genStart = Date.now();
    const summary = await generateDailyAnalyticsSummary();
    console.log(`[DAILY_ANALYTICS] Summary generation completed in ${Date.now() - genStart}ms`);

    // 2. Build HTML
    const htmlStart = Date.now();
    const htmlContent = buildDailyAnalyticsEmail(summary);
    console.log(`[DAILY_ANALYTICS] HTML generation completed in ${Date.now() - htmlStart}ms`);

    // 3. Format Date for Subject (DD MMM YYYY)
    const displayDate = new Date(summary.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const subject = `📊 Kottravai Daily Analytics Report - ${displayDate}`;

    // 4. Send Email with Retry Logic
    console.log(`[DAILY_ANALYTICS] Sending Email to ${recipients.length} recipients...`);
    const toAddress = recipients.join(',');
    
    let emailSent = false;
    let attempts = 0;
    let lastError = null;

    while (!emailSent && attempts < 2) {
      try {
        attempts++;
        const sendStart = Date.now();
        await sendEmail({
          to: toAddress,
          subject: subject,
          html: htmlContent,
          type: 'contact' // Use default contact reply-to alias
        });
        console.log(`[DAILY_ANALYTICS] Email send attempt ${attempts} completed in ${Date.now() - sendStart}ms`);
        emailSent = true;
        console.log('[DAILY_ANALYTICS] Email Sent Successfully');
      } catch (err) {
        console.error(`[DAILY_ANALYTICS] SMTP Error on attempt ${attempts}:`, err.message);
        lastError = err;
        if (attempts < 2) {
          console.log('[DAILY_ANALYTICS] Retrying email send in 5 seconds...');
          await new Promise(res => setTimeout(res, 5000));
        }
      }
    }

    if (!emailSent) {
      throw lastError;
    }

    return { success: true, emailSent: true, date: summary.date };

  } catch (error) {
    console.error('[DAILY_ANALYTICS] === FAILED TO SEND EMAIL ===', error);
    // Do not crash server, just return failure
    return { success: false, emailSent: false, error: error.message };
  }
};

const sendTestDailyEmail = async (targetEmail, reportDate = null) => {
  console.log(`[TEST_EMAIL_REQUEST] Initiating test email for: ${targetEmail}, reportDate: ${reportDate || 'yesterday'}`);
  
  try {
    if (!targetEmail || !/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(targetEmail)) {
      console.error('[TEST_EMAIL_FAILED] Invalid email format:', targetEmail);
      return { success: false, statusCode: 400, message: 'Invalid or missing email address.' };
    }

    // 1. Generate Summary
    const summary = await generateDailyAnalyticsSummary(reportDate);

    // 2. Build HTML
    let htmlContent = buildDailyAnalyticsEmail(summary);
    
    // Inject Yellow Banner for Test
    const testBanner = `
      <div style="background-color: #FFF3CD; color: #856404; padding: 12px; text-align: center; font-weight: bold; font-family: Arial, sans-serif; border-bottom: 2px solid #FFEEBA; font-size: 14px;">
        ⚠️ TEST REPORT – Generated using yesterday's completed analytics data.
      </div>
    `;
    htmlContent = htmlContent.replace('<body>', `<body>\n${testBanner}`);
    
    console.log('[TEST_EMAIL_TEMPLATE_GENERATED] HTML template successfully compiled for test.');

    // 3. Format Subject with Reporting Date
    const rDateObj = new Date(summary.date);
    const displayDate = rDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const subject = `🧪 TEST – Kottravai Executive Morning Brief Report Date: ${displayDate}`;

    // 4. Send Email via Zoho
    await sendEmail({
      to: targetEmail,
      subject: subject,
      html: htmlContent,
      type: 'contact'
    });

    console.log(`[TEST_EMAIL_SENT] Successfully sent test email to ${targetEmail}`);
    
    const now = new Date();
    const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utcNow + (330 * 60000));
    
    return { 
      success: true, 
      statusCode: 200, 
      recipient: targetEmail,
      reportDate: summary.date,
      generatedAt: istNow.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
      message: "Test email sent successfully using yesterday's completed data."
    };

  } catch (error) {
    console.error('[TEST_EMAIL_FAILED] === TEST EMAIL EXCEPTION ===', error);
    return { success: false, statusCode: 500, error: error.message, message: 'Failed to generate or send test email.' };
  }
};

module.exports = {
  sendDailyAnalyticsEmail,
  sendTestDailyEmail
};

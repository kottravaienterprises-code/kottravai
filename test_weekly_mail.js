require('dotenv').config({ path: './server/.env' });
const { sendWeeklyAnalyticsEmail } = require('./server/services/weeklyEmailSender');

async function runTest() {
  console.log('--- Triggering Weekly Email Test ---');
  // Pass the target email to override the default list
  const success = await sendWeeklyAnalyticsEmail('santhoshsaram001@gmail.com');
  
  if (success) {
    console.log('✅ Weekly test email dispatched successfully!');
  } else {
    console.log('❌ Failed to dispatch weekly test email.');
  }
  process.exit(0);
}

runTest();

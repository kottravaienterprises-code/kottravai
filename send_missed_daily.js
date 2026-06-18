require('dotenv').config({ path: './server/.env' });

// Override the environment variable to only send to the 3 users who missed it today
process.env.DAILY_ANALYTICS_EMAILS = 'kalaiaram06@gmail.com,dharaniaram03@gmail.com,ananthanayyasamy@gmail.com';

const { sendDailyAnalyticsEmail } = require('./server/services/dailyEmailSender');

async function runTest() {
  console.log('--- Triggering Missed Daily Email Send ---');
  console.log('Sending to:', process.env.DAILY_ANALYTICS_EMAILS);
  
  const result = await sendDailyAnalyticsEmail();
  
  if (result.success) {
    console.log('✅ Daily email dispatched to the remaining recipients successfully!');
  } else {
    console.log('❌ Failed to dispatch daily email.', result.reason || result.error);
  }
  process.exit(0);
}

runTest();

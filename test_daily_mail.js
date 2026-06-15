require('dotenv').config({ path: './server/.env' });
const { sendDailyAnalyticsEmail } = require('./server/services/dailyEmailSender');

async function test() {
  console.log("Testing daily analytics email...");
  try {
    const result = await sendDailyAnalyticsEmail();
    console.log("Result:", result);
  } catch(e) {
    console.error("Error:", e);
  }
}
test();

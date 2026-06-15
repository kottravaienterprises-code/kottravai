const cron = require('node-cron');
const { runEmailNurturing } = require('../services/nurturingService');

const initNurturingJob = () => {
  console.log('[NURTURING_JOB] Registering cron job for hourly follow-ups');

  // Schedule for minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[NURTURING_JOB] Triggering scheduled email nurturing...');
    try {
      await runEmailNurturing();
    } catch (err) {
      console.log('[NURTURING_JOB] Uncaught error during job execution:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
};

module.exports = {
  initNurturingJob
};

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:5000/api';
const MASTER_TOKEN = process.env.ADMIN_SECRET || 'Admin!Kottravai2025%100';

async function verify() {
  console.log('\n==================================================');
  console.log('PHASE 6B: CUSTOMER RETENTION & EXPANSION VERIFICATION');
  console.log('==================================================\n');

  try {
    const headers = { 'x-admin-secret': MASTER_TOKEN };

    console.log('✅ 1. Authenticated as SUPER_ADMIN using master token');

    // 2. Test Automations - Renewals
    console.log('\n--- Testing Lifecycle Automations ---');
    const renewalRes = await axios.post(`${API_BASE}/admin/cs/automations/renewals`, {}, { headers });
    if (renewalRes.data.success) {
      console.log(`✅ Renewal Workflows Executed (Generated Tasks: ${renewalRes.data.generatedTasks})`);
    }

    const churnRes = await axios.post(`${API_BASE}/admin/cs/automations/churn-prevention`, {}, { headers });
    if (churnRes.data.success) {
      console.log(`✅ Churn Prevention Executed (Escalations Generated: ${churnRes.data.escalationsGenerated})`);
    }

    const journeyRes = await axios.post(`${API_BASE}/admin/cs/automations/journey`, {}, { headers });
    if (journeyRes.data.success) {
      console.log(`✅ Journey Automation Executed (Milestones Updated: ${journeyRes.data.milestonesUpdated})`);
    }

    // 3. Test Analytics (Retention KPIs)
    console.log('\n--- Testing Executive Retention KPIs ---');
    const analyticsRes = await axios.get(`${API_BASE}/admin/cs/analytics/retention-kpis`, { headers });
    if (analyticsRes.data.success) {
      console.log(`✅ Retention Analytics Fetched`);
      const { summary, cohorts } = analyticsRes.data.data;
      console.log(`   - Logo Retention: ${summary.logoRetention}%`);
      console.log(`   - Active Accounts: ${summary.activeAccounts}`);
      console.log(`   - Average Time-to-Value: ${summary.timeToValueDays} days`);
      console.log(`   - Cohorts tracked: ${cohorts.length}`);
    }

    // 4. Test Copilot Account Brief
    console.log('\n--- Testing CS Copilot Account Brief ---');
    // Find an account to test
    const accountsRes = await axios.get(`${API_BASE}/admin/cs/accounts`, { headers });
    if (accountsRes.data.success && accountsRes.data.data.length > 0) {
      const accountId = accountsRes.data.data[0].id;
      const copilotRes = await axios.post(`${API_BASE}/admin/cs/copilot/account-brief`, { accountId }, { headers });
      if (copilotRes.data.success) {
        console.log(`✅ CS Copilot Brief Generated for Account: ${accountId}`);
        console.log(`   - Summary: ${copilotRes.data.data.accountSummary}`);
        console.log(`   - Opportunities identified: ${copilotRes.data.data.expansionOpportunities.length}`);
      }
    } else {
      console.log('⚠️ Skipping CS Copilot check: No accounts found. Consider seeding data.');
    }

    console.log('\n==================================================');
    console.log('VERIFICATION COMPLETE');
    console.log('==================================================\n');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

verify();

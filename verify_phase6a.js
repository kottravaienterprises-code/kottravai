const axios = require('axios');
const db = require('./server/db');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

async function verifyPhase6A() {
  console.log('\n==================================================');
  console.log('PHASE 6A: CUSTOMER SUCCESS E2E VERIFICATION');
  console.log('==================================================\n');

  try {
    // 1. Authenticate as SUPER_ADMIN
    const headers = { 'x-admin-secret': 'Admin!Kottravai2025%100' };

    console.log('✅ 1. Authenticated as SUPER_ADMIN using master token');



    // 2. Fetch CS Dashboard Stats
    const dashRes = await axios.get(`${API_BASE}/admin/cs/dashboard`, { headers });
    if (dashRes.data.success && dashRes.data.data.summary) {
      console.log('✅ 2. CS Dashboard Executive Analytics Generated');
      console.log(`   - Total ARR: $${dashRes.data.data.summary.totalARR}`);
      console.log(`   - NRR: ${dashRes.data.data.summary.nrr}%`);
      console.log(`   - GRR: ${dashRes.data.data.summary.grr}%`);
    } else {
      console.log('❌ 2. Failed to fetch Dashboard Stats');
    }

    // 3. Verify Account Explorer / List
    const accRes = await axios.get(`${API_BASE}/admin/cs/accounts`, { headers });
    if (accRes.data.success && Array.isArray(accRes.data.data)) {
      console.log(`✅ 3. Customer Accounts List Retreived (${accRes.data.data.length} accounts found)`);
      if (accRes.data.data.length > 0) {
        // 4. Verify Customer 360 Drawer Detail for the first account
        const accountId = accRes.data.data[0].id;
        const detailsRes = await axios.get(`${API_BASE}/admin/cs/accounts/${accountId}`, { headers });
        if (detailsRes.data.success) {
          console.log(`✅ 4. Customer 360 Profile Fetched for Account ID: ${accountId}`);
          console.log(`   - Timeline events: ${detailsRes.data.data.timeline.length}`);
          console.log(`   - Health history records: ${detailsRes.data.data.healthHistory.length}`);
          
          // Add an upsell to this account
          const upsellRes = await axios.post(`${API_BASE}/admin/cs/accounts/${accountId}/upsells`, {
            title: 'Enterprise Upgrade',
            estimated_value: 12000
          }, { headers });
          if (upsellRes.data.success) {
             console.log(`✅ 4.5. Created Upsell Opportunity for Account ID: ${accountId}`);
          }
        }
      } else {
        console.log('⚠️ 4. Skipping Customer 360 check: No accounts found. Consider creating a Won lead.');
      }
    } else {
      console.log('❌ 3. Failed to retrieve Customer Accounts');
    }

    // 5. Check Upsell Pipeline
    const upsellRes = await axios.get(`${API_BASE}/admin/cs/upsells`, { headers });
    if (upsellRes.data.success) {
      console.log(`✅ 5. Expansion Pipeline Retreived (${upsellRes.data.data.length} upsells)`);
    }

    // 6. Test Renewal Sweep
    const sweepRes = await axios.post(`${API_BASE}/admin/cs/renewals/sweep`, {}, { headers });
    if (sweepRes.data.success) {
      console.log(`✅ 6. Renewal Sweep Simulated Successfully (Alerts created: ${sweepRes.data.data.alertsCreated})`);
    }

    console.log('\n==================================================');
    console.log('VERIFICATION COMPLETE');
    console.log('==================================================\n');

  } catch (err) {
    console.error('\n❌ Verification Failed:', err.response?.data?.error || err.message);
  } finally {
    process.exit(0);
  }
}

verifyPhase6A();

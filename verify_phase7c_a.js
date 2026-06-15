require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const ADMIN_HEADERS = { 'x-admin-secret': 'Admin!Kottravai2025%100' };

let passed = 0;
let failed = 0;

function ok(label, value) {
  console.log(`  ✅ ${label}: ${JSON.stringify(value)}`);
  passed++;
}

function fail(label, err) {
  console.log(`  ❌ ${label}: ${err}`);
  failed++;
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 7C-A: EXECUTIVE AI COMMAND CENTER');
  console.log('══════════════════════════════════════════════════════\n');

  try {
    const overview = await axios.get(`${API_BASE}/admin/executive/overview`, { headers: ADMIN_HEADERS });
    if (!overview.data.success) throw new Error('overview request failed');
    ok('Executive overview loaded', overview.data.data.summary?.title || 'Executive Overview');
  } catch (err) {
    fail('Executive overview loaded', err.response?.data?.error || err.message);
  }

  try {
    const recommendations = await axios.get(`${API_BASE}/admin/executive/recommendations`, { headers: ADMIN_HEADERS });
    if (!recommendations.data.success || !recommendations.data.data?.length) throw new Error('no recommendations returned');
    ok('Recommendations generated', recommendations.data.data[0].category);
  } catch (err) {
    fail('Recommendations generated', err.response?.data?.error || err.message);
  }

  try {
    const orchestrated = await axios.post(`${API_BASE}/admin/executive/orchestrate`, {
      signalType: 'pipeline_slippage',
      context: { pipelineHealth: 'at_risk', forecastVariance: 14 }
    }, { headers: ADMIN_HEADERS });
    if (!orchestrated.data.success) throw new Error('orchestration request failed');
    ok('Orchestration request accepted', orchestrated.data.data.recommendedAction);
  } catch (err) {
    fail('Orchestration request accepted', err.response?.data?.error || err.message);
  }

  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`  VERIFICATION COMPLETE: ${passed} passed / ${failed} failed`);
  console.log(`══════════════════════════════════════════════════════\n`);
}

run().catch(err => {
  console.error('Fatal verification error', err.message);
  process.exit(1);
});

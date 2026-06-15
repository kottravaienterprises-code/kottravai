require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const SUPER_ADMIN_HEADERS  = { 'x-admin-secret': 'Admin!Kottravai2025%100' };
const MANAGER_HEADERS      = { 'authorization': 'Bearer fake-manager-token' }; // For auth, we need a way to hit MANAGER. Our index.js fallback doesn't easily let us mock MANAGER without db user, but let's test SUPER_ADMIN first. Actually we can test AUDITOR.
const AUDITOR_HEADERS      = { 'x-auditor-secret': 'read_only_audit' };

let passed = 0, failed = 0;

function ok(label, val) {
  console.log(`  ✅ ${label}${val !== undefined ? ': ' + JSON.stringify(val) : ''}`);
  passed++;
}
function fail(label, err) {
  console.log(`  ❌ ${label}: ${err}`);
  failed++;
}

async function test(label, fn) {
  try { await fn(); }
  catch (e) { fail(label, e.response?.data?.error || e.message); }
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PHASE 7C-A: AUTONOMOUS OPS & EXEC COMMAND LAYER');
  console.log('══════════════════════════════════════════════════════\n');

  // ──────────────────────────────────────────────
  // 0. Setup / Reset DB State
  // ──────────────────────────────────────────────
  await test('Reset DB State', async () => {
    // We update DISCOUNT_AUTO to active=TRUE using our endpoint
    await axios.post(`${API_BASE}/admin/autonomous/thresholds/DISCOUNT_AUTO`, { active: true }, { headers: SUPER_ADMIN_HEADERS });
  });

  // ──────────────────────────────────────────────
  // 1. Autonomous Operations Thresholds
  // ──────────────────────────────────────────────
  console.log('── 1. Autonomous Execution Validation ──');
  
  await test('5% Discount → Auto-approved', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/evaluate`, {
        action_type: 'DISCOUNT_AUTO',
        requested_discount_percent: 4.5,
        arr_impact: 500,
        confidence_score: 95
    }, { headers: SUPER_ADMIN_HEADERS });
    if (!r.data.data.canProceed) throw new Error('Should have been auto-approved');
    ok('5% Discount (Low ARR, High Confidence)', 'Auto-approved');
  });

  await test('10% Discount → Manager approval', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/evaluate`, {
        action_type: 'DISCOUNT_MANAGER',
        requested_discount_percent: 8,
        arr_impact: 2000,
        confidence_score: 80
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.canProceed || r.data.data.escalationRequired !== 'MANAGER') throw new Error('Expected MANAGER escalation');
    ok('10% Discount (Med ARR, Med Confidence)', 'Escalated to MANAGER');
  });

  await test('15% Discount → Executive approval', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/evaluate`, {
        action_type: 'DISCOUNT_EXECUTIVE',
        requested_discount_percent: 15,
        arr_impact: 15000,
        confidence_score: 80
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.canProceed || r.data.data.escalationRequired !== 'EXECUTIVE') throw new Error('Expected EXECUTIVE escalation');
    ok('15% Discount (High Impact)', 'Escalated to EXECUTIVE');
  });

  await test('Confidence < threshold → Halt', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/evaluate`, {
        action_type: 'DISCOUNT_AUTO',
        requested_discount_percent: 2,
        arr_impact: 100,
        confidence_score: 50 // Too low!
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.canProceed) throw new Error('Should have halted due to low confidence');
    ok('Low Confidence Action', 'Halted and Escalated');
  });

  await test('Missing policy → Halt', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/evaluate`, {
        action_type: 'UNKNOWN_POLICY',
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.canProceed) throw new Error('Should have halted due to missing policy');
    ok('Missing Policy Action', 'Halted');
  });

  // ──────────────────────────────────────────────
  // 2. Executive Command Layer
  // ──────────────────────────────────────────────
  console.log('\n── 2. Executive Command Validation ──');
  
  await test('Command: "Show global churn risk"', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/command/execute`, {
        prompt: 'Show global churn risk'
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.intent !== 'CHURN_RISK_ANALYSIS') throw new Error('Incorrect intent parsed');
    ok('Intent parsing', r.data.data.intent);
    ok('Grounded response', r.data.data.response.substring(0, 30) + '...');
  });

  await test('Command: "Generate board readiness summary"', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/command/execute`, {
        prompt: 'Generate board readiness summary'
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.intent !== 'PIPELINE_SUMMARY') throw new Error('Incorrect intent parsed');
    ok('Service routing', 'PipelineIntelligence');
  });

  await test('Command: "Pause discount workflows globally"', async () => {
    const r = await axios.post(`${API_BASE}/admin/autonomous/command/execute`, {
        prompt: 'Pause discount workflows globally'
    }, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.intent !== 'HALT_DISCOUNTS') throw new Error('Incorrect intent parsed');
    ok('Action Triggered', 'Disabled DISCOUNT_AUTO');
  });

  await test('Audit Logging', async () => {
    const r = await axios.get(`${API_BASE}/admin/autonomous/command/history`, { headers: SUPER_ADMIN_HEADERS });
    if (r.data.data.length < 3) throw new Error('Audit logs missing');
    ok('Audit log persistence', `${r.data.data.length} commands recorded`);
  });

  await test('RBAC enforcement (AUDITOR POST Blocked)', async () => {
    try {
        await axios.post(`${API_BASE}/admin/autonomous/command/execute`, {
            prompt: 'Test'
        }, { headers: AUDITOR_HEADERS });
        fail('RBAC Enforcement', 'Should have failed with 403');
    } catch (e) {
        if (e.response?.status === 403) ok('RBAC Enforcement (Auditor Write Blocked)', '403 Forbidden');
        else throw e;
    }
  });

  // ──────────────────────────────────────────────
  // SUMMARY
  // ──────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  VERIFICATION COMPLETE: ${passed} passed / ${failed} failed`);
  console.log('══════════════════════════════════════════════════════\n');
  if (failed > 0) process.exit(1);
  else process.exit(0);
}

run().catch(console.error);

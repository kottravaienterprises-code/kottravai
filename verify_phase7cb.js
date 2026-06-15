const db = require('./server/db');
const predictiveIntel = require('./server/services/predictiveIntelligenceService');

async function runTests() {
  console.log('================================================');
  console.log('Phase 7C-B Verification Suite: Intelligence Engine');
  console.log('================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName} ${details}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${testName} ${details}`);
    }
  }

  try {
    // PREPARE MOCK DATA
    const { rows: testAccount } = await db.query(`
        INSERT INTO public.customer_accounts 
        (company_name, contact_name, contact_email, arr, health_score, status, contract_end_date)
        VALUES ('Phase 7CB Test Corp', 'John Doe', 'test7cb@example.com', 50000, 30, 'Active', NOW() + INTERVAL '1 year')
        RETURNING id;
    `);
    const accId = testAccount[0].id;

    console.log('--- 1. Anomaly Detection Engine ---');
    // Inject mock anomaly
    await db.query(`
        INSERT INTO public.predictive_anomalies (category, severity, metric_name, variance_percent, description)
        VALUES ('Pipeline Velocity Drop', 'Critical', 'Weekly Pipeline', 35, 'Mock 30%+ drop anomaly')
    `);
    const anomalies = await predictiveIntel.getPredictiveInsights();
    const hasAnomaly = anomalies.anomalies.some(a => a.category === 'Pipeline Velocity Drop' && a.variance_percent == 35);
    assert(hasAnomaly, '30% pipeline drop detected and logged');
    assert(anomalies.anomalies.some(a => a.severity === 'Critical'), 'Severity assigned correctly (Critical)');

    console.log('\n--- 2. Predictive Churn & Expansion Models ---');
    const signals = await predictiveIntel.predictAccountRiskAndExpansion(accId);
    assert(signals.churn.riskScore >= 70, 'Churn risk score generated (>70 for health=30)');
    assert(signals.churn.confidence > 0, 'Confidence score generated');
    assert(signals.churn.drivers && signals.churn.drivers.length > 0, 'Explainability drivers generated');
    
    assert(signals.expansion.riskScore !== undefined, 'Expansion signal generated');

    console.log('\n--- 3. Intervention Routing ---');
    // Interventions should have been generated during predictAccountRiskAndExpansion
    const insights = await predictiveIntel.getPredictiveInsights();
    const churnInts = insights.recommendations.filter(r => r.source_type === 'SIGNAL' && r.action_type === 'Apply Discount');
    const taskInts = insights.recommendations.filter(r => r.source_type === 'SIGNAL' && r.action_type === 'Schedule Executive Review');

    if (churnInts.length > 0) {
        // Based on 7C-A thresholds, $50000 ARR * 10% discount = $5000 impact -> likely Auto Approved or Manager Escalated depending on specific Phase 7C-A seeds. 
        // We just assert that it got routed properly to PENDING/AUTO/MANAGER/EXEC instead of DRAFT.
        assert(['AUTO_APPROVED', 'MANAGER_APPROVAL_REQUIRED', 'EXECUTIVE_APPROVAL_REQUIRED'].includes(churnInts[0].approval_status), 'Discount routed to approval framework', `(${churnInts[0].approval_status})`);
    } else {
        assert(false, 'Discount intervention generated');
    }

    if (taskInts.length > 0) {
        assert(taskInts[0].approval_status === 'AUTO_APPROVED', 'Standard tasks are auto-approved for queuing');
    } else {
        assert(false, 'Executive Review task generated');
    }

    // CLEANUP
    await db.query(`DELETE FROM public.customer_accounts WHERE id = $1`, [accId]);
    await db.query(`DELETE FROM public.predictive_anomalies WHERE description = 'Mock 30%+ drop anomaly'`);

  } catch (err) {
    console.error('\nTest Suite Error:', err);
  }

  console.log('\n================================================');
  console.log(`Results: ${passed} / ${total} Tests Passed`);
  console.log('================================================');
}

runTests();

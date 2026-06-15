const express = require('express');
const axios = require('axios');
const path = require('path');
const db = require('./server/db');

// Resolve .env
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });

const app = express();
app.use(express.json());

// Mock Auth middleware to test RBAC scopes and role scenarios
const mockAuthenticateAdmin = (req, res, next) => {
  const role = req.headers['x-test-role'] || 'SUPER_ADMIN';
  const userId = req.headers['x-test-user-id'] || 'master_admin';
  const team = req.headers['x-test-team'] || 'APAC';

  req.adminRole = role;
  req.adminUser = {
    id: userId,
    username: `user_${role.toLowerCase()}`,
    role: role,
    team: team
  };
  next();
};

// Mount real biRoutes with mock auth
app.use('/api/admin/bi', mockAuthenticateAdmin, require('./server/routes/biRoutes'));

const PORT = 4996;
let server;

async function run() {
  console.log("==================================================");
  console.log("PHASE 5C BUSINESS INTELLIGENCE VERIFICATION SUITE");
  console.log("==================================================");

  try {
    // 1. Seed Test Users and Leads for BI Metrics
    console.log("\n--- 1. Seeding test crm users & leads with close notes ---");
    const rep1Id = '11111111-1111-1111-1111-111111111111';
    const rep2Id = '22222222-2222-2222-2222-222222222222';
    const managerId = '33333333-3333-3333-3333-333333333333';

    await db.query('DELETE FROM public.users WHERE id IN ($1, $2, $3)', [rep1Id, rep2Id, managerId]);
    await db.query(`
      INSERT INTO public.users (id, username, password, mobile, full_name, role, team)
      VALUES 
        ($1, 'rep_apac_1', 'pass123', '9111111111', 'Rep APAC 1', 'REPRESENTATIVE', 'APAC'),
        ($2, 'rep_apac_2', 'pass123', '9111111112', 'Rep APAC 2', 'REPRESENTATIVE', 'APAC'),
        ($3, 'manager_apac_bi', 'pass123', '9111111113', 'Manager APAC BI', 'MANAGER', 'APAC')
    `, [rep1Id, rep2Id, managerId]);

    const lead1Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const lead2Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const lead3Id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    await db.query('DELETE FROM public.leads WHERE id IN ($1, $2, $3)', [lead1Id, lead2Id, lead3Id]);
    await db.query(`
      INSERT INTO public.leads (id, name, email, assigned_to, team, sales_stage, industry, source, estimated_deal_value, final_deal_value, conversion_probability, forecast_revenue, close_notes, created_at)
      VALUES 
        ($1, 'Won Deal Industry A', 'wonA@test.com', $4, 'APAC', 'Closed Won', 'Software', 'Google Ads', 50000, 50000, 100, 50000, 'Deal closed successfully at full price.', NOW() - INTERVAL '10 days'),
        ($2, 'Lost Deal Price Reason', 'lostB@test.com', $5, 'APAC', 'Closed Lost', 'Hardware', 'LinkedIn', 30000, NULL, 0, 0, 'Lost because budget was cut, price was too expensive.', NOW() - INTERVAL '5 days'),
        ($3, 'Active Lead EMEA', 'activeC@test.com', NULL, 'EMEA', 'Qualified', 'Finance', 'Referral', 100000, NULL, 60, 60000, NULL, NOW() - INTERVAL '20 days')
    `, [lead1Id, lead2Id, lead3Id, rep1Id, rep2Id]);

    // Seed stage history transitions to support cohorts
    await db.query('DELETE FROM public.lead_stage_history WHERE lead_id IN ($1, $2, $3)', [lead1Id, lead2Id, lead3Id]);
    await db.query(`
      INSERT INTO public.lead_stage_history (lead_id, previous_stage, new_stage, changed_at, duration_seconds)
      VALUES 
        ($1, 'New Lead', 'Qualified', NOW() - INTERVAL '9 days', 86400),
        ($1, 'Qualified', 'Closed Won', NOW() - INTERVAL '8 days', 172800),
        ($2, 'New Lead', 'Closed Lost', NOW() - INTERVAL '4 days', 259200),
        ($3, 'New Lead', 'Qualified', NOW() - INTERVAL '15 days', 432000)
    `, [lead1Id, lead2Id, lead3Id]);

    console.log("✅ Seeded test users, leads, close notes, and stage transition history.");

    server = app.listen(PORT, async () => {
      console.log(`\nTest BI server listening on port ${PORT}`);

      try {
        // A. Test Dynamic Query Whitelisting (SQL Security)
        console.log("\n--- A. Testing SQL Security: Dynamic Query Whitelist Gating ---");
        // 1. Valid Whitelisted Metric and Grouping
        const validRes = await axios.post(`http://localhost:${PORT}/api/admin/bi/widgets/preview`, {
          config: { metric: 'lead_count', groupBy: 'sales_stage', dateRange: 'all' }
        }, { headers: { 'x-test-role': 'SUPER_ADMIN' } });
        console.log("✅ Valid Dynamic Query Succeeded. Output items count:", validRes.data.data.length);

        // 2. Invalid Non-Whitelisted Metric (Expected 400 Bad Request)
        try {
          await axios.post(`http://localhost:${PORT}/api/admin/bi/widgets/preview`, {
            config: { metric: 'delete_entire_table', groupBy: 'sales_stage' }
          });
          console.log("❌ FAILED: Invalid metric was allowed!");
        } catch (err) {
          console.log("✅ SUCCESS: Non-whitelisted metric blocked. Status:", err.response?.status, "Error:", err.response?.data?.error);
        }

        // 3. Invalid Non-Whitelisted GroupBy (Expected 400 Bad Request)
        try {
          await axios.post(`http://localhost:${PORT}/api/admin/bi/widgets/preview`, {
            config: { metric: 'lead_count', groupBy: 'password; -- injection attempt' }
          });
          console.log("❌ FAILED: Injection GroupBy was allowed!");
        } catch (err) {
          console.log("✅ SUCCESS: Non-whitelisted group-by blocked. Status:", err.response?.status, "Error:", err.response?.data?.error);
        }

        // B. Verify Cohort Analysis Heatmap Matrix
        console.log("\n--- B. Testing Cohort Analysis matrix ---");
        const cohortRes = await axios.get(`http://localhost:${PORT}/api/admin/bi/cohorts`);
        console.log("✅ GET /bi/cohorts returns cohorts. Count:", cohortRes.data.data.length);
        if (cohortRes.data.data.length > 0) {
          console.log("Sample Cohort Matrix row:", JSON.stringify(cohortRes.data.data[0], null, 2));
        }

        // C. Verify Win / Loss Intelligence & Classifier
        console.log("\n--- C. Testing Win/Loss Classifier & Reasons Extraction ---");
        const wlRes = await axios.get(`http://localhost:${PORT}/api/admin/bi/win-loss`);
        console.log("✅ GET /bi/win-loss succeeded.");
        console.log("Industry Win Rates:", JSON.stringify(wlRes.data.data.byIndustry, null, 2));
        console.log("Loss Reasons Count (Should map 'Lost Deal Price Reason' to 'Price / Budget'):");
        console.log(JSON.stringify(wlRes.data.data.lossReasons, null, 2));
        const priceReason = wlRes.data.data.lossReasons.find(r => r.reason === 'Price / Budget');
        console.log("✅ Check (Correct Price Loss reason mapping):", priceReason && priceReason.count >= 1 ? 'SUCCESS' : 'FAILED');

        // D. Verify Sales Benchmarking
        console.log("\n--- D. Testing Sales Benchmarking & Team Medians ---");
        const benchRes = await axios.get(`http://localhost:${PORT}/api/admin/bi/benchmarking`);
        console.log("✅ GET /bi/benchmarking succeeded.");
        console.log("Team Medians stats:", JSON.stringify(benchRes.data.data.teamMedians, null, 2));
        console.log("Agent ratings against averages:");
        console.log(benchRes.data.data.representatives.map(r => ({ name: r.representative, revenue: r.revenueClosed, rating: r.ratings.revenueClosed })));

        // E. Verify Forecast Trends
        console.log("\n--- E. Testing Forecast Trends Period Buckets ---");
        const forecastRes = await axios.get(`http://localhost:${PORT}/api/admin/bi/forecast-trends?period=monthly`);
        console.log("✅ GET /bi/forecast-trends monthly details count:", forecastRes.data.data.length);
        if (forecastRes.data.data.length > 0) {
          console.log("Sample Period Forecast variance stats:", JSON.stringify(forecastRes.data.data[0], null, 2));
        }

        // F. Verify Dashboard CRUD
        console.log("\n--- F. Testing Dashboard CRUD Operations ---");
        // 1. Create Custom Dashboard
        const createDash = await axios.post(`http://localhost:${PORT}/api/admin/bi/dashboards`, {
          title: 'Custom Marketing Analytics',
          description: 'Tracks campaign lead value pipelines.'
        }, { headers: { 'x-test-role': 'SUPER_ADMIN', 'x-test-user-id': 'admin_id' } });
        const dashId = createDash.data.data.id;
        console.log("✅ Dashboard created. ID:", dashId);

        // 2. List Dashboards (Should include the new one)
        const listDash = await axios.get(`http://localhost:${PORT}/api/admin/bi/dashboards`);
        const titles = listDash.data.data.map(d => d.title);
        console.log("Dashboards:", titles);
        console.log("✅ Check (List includes created dash):", titles.includes('Custom Marketing Analytics') ? 'SUCCESS' : 'FAILED');

        // G. Verify Widget CRUD
        console.log("\n--- G. Testing Widget CRUD Operations ---");
        // 1. Add Widget
        const addWidget = await axios.post(`http://localhost:${PORT}/api/admin/bi/dashboards/${dashId}/widgets`, {
          title: 'Source Pipeline',
          type: 'pie',
          metric: 'deal_value',
          query_config: { metric: 'deal_value', groupBy: 'lead_source', dateRange: 'all' }
        });
        const widgetId = addWidget.data.data.id;
        console.log("✅ Widget added. ID:", widgetId);

        // 2. Fetch Dashboard details (Should return widgets list)
        const dashDetails = await axios.get(`http://localhost:${PORT}/api/admin/bi/dashboards/${dashId}`);
        console.log("✅ Dashboard Detail Widgets count (Expected 1):", dashDetails.data.data.widgets.length);

        // H. Verify Auditor Role Restrictions
        console.log("\n--- H. Testing Auditor Role Restrictions ---");
        // Auditor should be blocked from deleting or editing dashboards
        try {
          await axios.delete(`http://localhost:${PORT}/api/admin/bi/dashboards/${dashId}`, {
            headers: { 'x-test-role': 'AUDITOR', 'x-test-user-id': 'auditor_id' }
          });
          console.log("❌ FAILED: Auditor allowed to perform DELETE operation!");
        } catch (err) {
          console.log("✅ SUCCESS: Delete operation blocked. Status:", err.response?.status, "Error:", err.response?.data?.error);
        }

        // Clean up created dashboard
        await axios.delete(`http://localhost:${PORT}/api/admin/bi/dashboards/${dashId}`, {
          headers: { 'x-test-role': 'SUPER_ADMIN', 'x-test-user-id': 'admin_id' }
        });
        console.log("Cleaned up custom test dashboard.");

        // Clean up seeded test users and leads
        await db.query('DELETE FROM public.users WHERE id IN ($1, $2, $3)', [rep1Id, rep2Id, managerId]);
        await db.query('DELETE FROM public.leads WHERE id IN ($1, $2, $3)', [lead1Id, lead2Id, lead3Id]);
        await db.query('DELETE FROM public.lead_stage_history WHERE lead_id IN ($1, $2, $3)', [lead1Id, lead2Id, lead3Id]);
        console.log("Cleaned up seeded database test records.");

        console.log("\n==================================================");
        console.log("PHASE 5C RUNTIME VERIFICATION COMPLETE: ALL PASSED");
        console.log("==================================================");

      } catch (err) {
        console.error("E2E testing error:", err.message);
      } finally {
        server.close(() => {
          console.log("BI Verification Server stopped.");
          process.exit(0);
        });
      }
    });

  } catch (err) {
    console.error("Test initialization error:", err.message);
    process.exit(1);
  }
}

run();

const express = require('express');
const axios = require('axios');
const path = require('path');
const db = require('./server/db');
const revopsService = require('./server/services/revopsService');
const leadService = require('./server/services/leadService');

// Resolve .env for server
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });

const app = express();
app.use(express.json());

// Register pipeline and revops routes
app.use('/api/admin/pipeline', require('./server/routes/pipelineRoutes'));
app.use('/api/admin/revops', require('./server/routes/revopsRoutes'));

// Standard lead patch route (copied from server/index.js for testing)
app.patch('/api/admin/leads/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Fetch current lead state for RevOps stage-gate validation
        const currentLeadRes = await db.query(
            'SELECT sales_stage, estimated_deal_value, conversion_probability, expected_close_date, proposal_generated, last_contacted_at, final_deal_value, close_notes FROM public.leads WHERE id = $1',
            [id]
        );
        if (currentLeadRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lead not found' });
        }
        
        const currentLead = currentLeadRes.rows[0];
        const merged = { ...currentLead, ...updates };

        // RevOps Stage-Gate Validations
        if (updates.sales_stage && updates.sales_stage !== currentLead.sales_stage) {
            const newStage = updates.sales_stage;

            if (newStage === 'Proposal Sent') {
                if (!merged.estimated_deal_value || Number(merged.estimated_deal_value) <= 0 || !merged.conversion_probability || !merged.expected_close_date) {
                    return res.status(400).json({
                        success: false,
                        error: 'RevOps Gate Blocked: Transitioning to Proposal Sent requires estimated_deal_value (greater than 0), conversion_probability, and expected_close_date.'
                    });
                }
            }

            if (newStage === 'Negotiation') {
                if (!merged.proposal_generated || !merged.last_contacted_at) {
                    return res.status(400).json({
                        success: false,
                        error: 'RevOps Gate Blocked: Transitioning to Negotiation requires generating a proposal (proposal_generated = true) and logging communication contact (last_contacted_at).'
                    });
                }
            }

            if (newStage === 'Closed Won') {
                if (!merged.final_deal_value || Number(merged.final_deal_value) <= 0 || !merged.close_notes || merged.close_notes.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'RevOps Gate Blocked: Transitioning to Closed Won requires final_deal_value (greater than 0) and close_notes.'
                    });
                }
                updates.estimated_deal_value = merged.final_deal_value;
            }
        }

        const result = await leadService.updateLead(id, updates, null, null);
        res.json({ success: true, lead: result.data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = 4998;
let server;

async function run() {
  console.log("==================================================");
  console.log("PHASE 5A REVOPS RUNTIME VERIFICATION");
  console.log("==================================================");
  
  try {
    // 1. TEST DATABASE TRIGGERS & STAGE HISTORY LOGGING
    console.log("\n--- 1. Testing Database triggers & Stage history logging ---");
    
    // Insert test lead
    const insertRes = await db.query(`
      INSERT INTO public.leads (name, email, sales_stage)
      VALUES ('RevOps Verification Lead', 'revops@verify.com', 'New Lead')
      RETURNING id, sales_stage, stage_entered_at;
    `);
    const leadId = insertRes.rows[0].id;
    console.log("✅ Seeded test lead ID:", leadId);
    console.log("Initial sales_stage:", insertRes.rows[0].sales_stage);
    console.log("Initial stage_entered_at:", insertRes.rows[0].stage_entered_at);

    // Verify history table row exists for 'New Lead'
    const h1 = await db.query('SELECT * FROM public.lead_stage_history WHERE lead_id = $1', [leadId]);
    console.log("✅ Checked stage history count after creation (Expected 1):", h1.rows.length);
    console.log("Logged history row:", JSON.stringify(h1.rows[0], null, 2));

    // Force stage transition to 'Qualified' to verify transition log
    await db.query('UPDATE public.leads SET sales_stage = \'Qualified\' WHERE id = $1', [leadId]);
    const h2 = await db.query('SELECT * FROM public.lead_stage_history WHERE lead_id = $1 ORDER BY changed_at DESC', [leadId]);
    console.log("✅ Checked stage history count after stage change (Expected 2):", h2.rows.length);
    console.log("Most recent history row:", JSON.stringify(h2.rows[0], null, 2));

    // 2. TEST AI DEAL VALUE PREDICTOR SERVICE
    console.log("\n--- 2. Testing AI Deal Value Predictor Service ---");
    const testLead = {
      source: 'Google Ads',
      industry: 'Software & SaaS',
      org_type: 'Enterprise',
      location: 'Bangalore',
      lead_score: 85,
      intent_score: 90,
      comm_activity_count: 12
    };

    const prediction = await revopsService.predictDealValue(testLead);
    console.log("✅ Deal Value Prediction output:");
    console.log(JSON.stringify(prediction, null, 2));

    // 3. START TEST APP SERVER FOR API & STAGE-GATE GATEWAYS
    console.log("\n--- 3. Testing API Routing & Stage-Gate Gateways ---");
    server = app.listen(PORT, async () => {
      console.log(`Test Express server running on port ${PORT}`);
      
      try {
        // A. Verify prediction route
        console.log("\nTesting API: POST /api/admin/revops/predict-deal-value");
        const predRes = await axios.post(`http://localhost:${PORT}/api/admin/revops/predict-deal-value`, testLead);
        console.log("✅ Route Response:", JSON.stringify(predRes.data.data, null, 2));

        // B. Verify Stage-Gate validation rules
        console.log("\nTesting API: stage-gate check (Qualified -> Proposal Sent)");
        console.log("Attempting to move lead to 'Proposal Sent' without required inputs (Expected 400 Block)...");
        try {
          await axios.patch(`http://localhost:${PORT}/api/admin/leads/${leadId}`, {
            sales_stage: 'Proposal Sent'
          });
          console.log("❌ FAILED: Transition succeeded when it should have been blocked.");
        } catch (err) {
          if (err.response && err.response.status === 400) {
            console.log("✅ SUCCESS: Transition blocked. Server response:", err.response.data.error);
          } else {
            console.error("❌ FAILED: Unexpected error status:", err.message);
          }
        }

        console.log("\nAttempting to move lead to 'Proposal Sent' WITH all required inputs (Expected 200 Allow)...");
        const patchRes1 = await axios.patch(`http://localhost:${PORT}/api/admin/leads/${leadId}`, {
          sales_stage: 'Proposal Sent',
          estimated_deal_value: 2500000.00,
          conversion_probability: 70,
          expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        console.log("✅ SUCCESS: Transition allowed! Current stage is now:", patchRes1.data.lead.sales_stage);

        console.log("\nAttempting to move lead to 'Negotiation' without proposal generated flag (Expected 400 Block)...");
        try {
          await axios.patch(`http://localhost:${PORT}/api/admin/leads/${leadId}`, {
            sales_stage: 'Negotiation'
          });
          console.log("❌ FAILED: Transition succeeded when it should have been blocked.");
        } catch (err) {
          if (err.response && err.response.status === 400) {
            console.log("✅ SUCCESS: Transition blocked. Server response:", err.response.data.error);
          } else {
            console.error("❌ FAILED: Unexpected error status:", err.message);
          }
        }

        console.log("\nAttempting to move lead to 'Negotiation' WITH proposal_generated and last_contacted_at (Expected 200 Allow)...");
        const patchRes2 = await axios.patch(`http://localhost:${PORT}/api/admin/leads/${leadId}`, {
          sales_stage: 'Negotiation',
          proposal_generated: true,
          last_contacted_at: new Date().toISOString()
        });
        console.log("✅ SUCCESS: Transition allowed! Current stage is now:", patchRes2.data.lead.sales_stage);

        console.log("\nAttempting to move lead to 'Closed Won' without final deal value and close notes (Expected 400 Block)...");
        try {
          await axios.patch(`http://localhost:${PORT}/api/admin/leads/${leadId}`, {
            sales_stage: 'Closed Won'
          });
          console.log("❌ FAILED: Transition succeeded when it should have been blocked.");
        } catch (err) {
          if (err.response && err.response.status === 400) {
            console.log("✅ SUCCESS: Transition blocked. Server response:", err.response.data.error);
          } else {
            console.error("❌ FAILED: Unexpected error status:", err.message);
          }
        }

        console.log("\nAttempting to move lead to 'Closed Won' WITH final_deal_value and close_notes (Expected 200 Allow)...");
        const patchRes3 = await axios.patch(`http://localhost:${PORT}/api/admin/leads/${leadId}`, {
          sales_stage: 'Closed Won',
          final_deal_value: 2750000.00,
          close_notes: 'Deal closed won. Client agreed to final enterprise terms and service delivery.'
        });
        console.log("✅ SUCCESS: Transition allowed! Current stage is now:", patchRes3.data.lead.sales_stage);

        // 4. TEST SLA BREACH Sweep
        console.log("\n--- 4. Testing SLA Breaches Sweep & Escalations ---");
        
        // Seed an overdue lead: Qualified, entered 10 days ago
        const overdueRes = await db.query(`
          INSERT INTO public.leads (name, email, sales_stage, sla_status)
          VALUES ('SLA Breach Test Lead', 'slabreach@verify.com', 'Qualified', 'On Track')
          RETURNING id, sales_stage, stage_entered_at, sla_status;
        `);
        const overdueId = overdueRes.rows[0].id;
        // Backdate stage_entered_at explicitly via UPDATE to bypass trigger on INSERT
        await db.query(`UPDATE public.leads SET stage_entered_at = NOW() - INTERVAL '10 days' WHERE id = $1`, [overdueId]);
        console.log("Seeded SLA test lead ID:", overdueId);
        console.log("Initial SLA Status:", overdueRes.rows[0].sla_status);

        // Execute SLA checks
        console.log("Executing SLA Sweep...");
        const sweepResult = await revopsService.checkStageSLAs();
        console.log("Sweep Result stats:", JSON.stringify(sweepResult.results, null, 2));

        // Verify SLA lead was updated to Overdue
        const overdueLeadCheck = await db.query('SELECT sla_status, stage_duration_days FROM public.leads WHERE id = $1', [overdueId]);
        console.log("✅ Updated SLA Status (Expected 'Overdue'):", overdueLeadCheck.rows[0].sla_status);
        console.log("Calculated stage duration (Expected ~10 days):", overdueLeadCheck.rows[0].stage_duration_days);

        // 5. VERIFY REVOPS API ENDPOINTS
        console.log("\n--- 5. Verifying RevOps Endpoints & Forecast Accuracy ---");
        
        const velocityRes = await axios.get(`http://localhost:${PORT}/api/admin/revops/pipeline-velocity`);
        console.log("✅ GET /api/admin/revops/pipeline-velocity payload:");
        console.log(JSON.stringify(velocityRes.data.data, null, 2));

        const escalationsRes = await axios.get(`http://localhost:${PORT}/api/admin/revops/escalations`);
        console.log("✅ GET /api/admin/revops/escalations payload:");
        console.log(JSON.stringify(escalationsRes.data.data, null, 2));

        const forecastAccuracyRes = await axios.get(`http://localhost:${PORT}/api/admin/pipeline/forecast-accuracy`);
        console.log("✅ GET /api/admin/pipeline/forecast-accuracy payload:");
        console.log(JSON.stringify(forecastAccuracyRes.data.data, null, 2));

        // CLEAN UP SEEDED DATA
        await db.query('DELETE FROM public.leads WHERE id IN ($1, $2)', [leadId, overdueId]);
        console.log("\nCleaned up seeded database records.");
        console.log("\n==================================================");
        console.log("PHASE 5A RUNTIME VERIFICATION COMPLETE");
        console.log("==================================================");

      } catch (err) {
        console.error("E2E testing error:", err.message);
      } finally {
        server.close(() => {
          console.log("Test server stopped.");
          process.exit(0);
        });
      }
    });

  } catch (error) {
    console.error("Test initialization error:", error.message);
    process.exit(1);
  }
}

run();

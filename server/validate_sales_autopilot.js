const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const request = require('axios');
const http = require('http');
const db = require('./db');
const { createLeadWithActivity, analyzeLeadAIById } = require('./utils/leadHelpers');
const { runEmailNurturing } = require('./services/nurturingService');
const webhooksRouter = require('./routes/webhooks');

const app = express();
app.use(express.json());
app.use('/api/webhooks', webhooksRouter);
const server = http.createServer(app);


const REPORT = {
  total: 0,
  passed: 0,
  failed: 0,
  results: []
};

function pass(name, details = '') {
  REPORT.total++;
  REPORT.passed++;
  REPORT.results.push(`✅ PASS | ${name} | ${details}`);
}

function fail(name, error) {
  REPORT.total++;
  REPORT.failed++;
  REPORT.results.push(`❌ FAIL | ${name} | Error: ${error}`);
}

let TEST_LEAD_ID = null;

async function runTests() {
  console.log("Starting End-to-End Sales AutoPilot Validation...\n");

  await new Promise((resolve) => server.listen(5001, () => resolve()));
  
  try {
    // 1. Lead Capture Validation
    console.log("--- 1. Lead Capture Validation ---");
    const testEmail = `e2e_test_${Date.now()}@example.com`;
    const leadData = {
      name: "E2E Test Lead",
      email: testEmail,
      phone: "+919876543210",
      company: "E2E Inc",
      requirements: "Looking for 500 premium corporate hampers.",
      source: "website"
    };

    const newLead = await createLeadWithActivity(leadData);
    if (newLead && newLead.id) {
      TEST_LEAD_ID = newLead.id;
      pass("Lead Creation", `Lead created with ID: ${TEST_LEAD_ID}`);
      
      const { rows: acts } = await db.query(`SELECT * FROM lead_activities WHERE lead_id = $1`, [TEST_LEAD_ID]);
      if (acts && acts.length > 0) pass("Lead Activity Logging", `Found ${acts.length} activities`);
      else fail("Lead Activity Logging", "No activities found");

      if (newLead.source === 'website') pass("Source Tracking", "Source recorded correctly");
      else fail("Source Tracking", `Source was ${newLead.source}`);
    } else {
      fail("Lead Creation", "Failed to create lead via createLeadWithActivity");
    }

    // 2. AI Lead Scoring Validation
    console.log("\n--- 2. AI Lead Scoring Validation ---");
    if (TEST_LEAD_ID) {
      await analyzeLeadAIById(TEST_LEAD_ID);
      const { rows: updatedLeads } = await db.query(`SELECT * FROM leads WHERE id = $1`, [TEST_LEAD_ID]);
      const updatedLead = updatedLeads[0];
      
      if (updatedLead.lead_score !== null) pass("AI Score Populated", `Score: ${updatedLead.lead_score}`);
      else fail("AI Score Populated", "Score is null");

      if (updatedLead.ai_summary) pass("AI Summary Populated", "Summary exists");
      else fail("AI Summary Populated", "Summary is null");

      if (updatedLead.estimated_deal_value !== undefined) pass("Estimated Deal Value Generated", `Value: ₹${updatedLead.estimated_deal_value}`);
      else fail("Estimated Deal Value Generated", "Value is undefined");

      if (updatedLead.conversion_probability !== undefined) pass("Conversion Probability Generated", `Probability: ${updatedLead.conversion_probability}%`);
      else fail("Conversion Probability Generated", "Probability is undefined");
    }

    // 4. Calendly Integration Validation
    console.log("\n--- 4. Calendly Integration Validation ---");
    if (TEST_LEAD_ID) {
      try {
        const calendlyPayload = {
          event: 'invitee.created',
          payload: {
            email: testEmail,
            scheduled_event: {
              start_time: new Date(Date.now() + 86400000).toISOString(),
              uri: "https://calendly.com/events/123"
            }
          }
        };

        const res = await request.post('http://localhost:5001/api/webhooks/calendly', calendlyPayload);
        if (res.status === 200) pass("Webhook Endpoint Exists", "Responded 200 OK");
        else fail("Webhook Endpoint Exists", `Responded ${res.status}`);

        const { rows: calLeads } = await db.query(`SELECT * FROM leads WHERE id = $1`, [TEST_LEAD_ID]);
        const calLead = calLeads[0];
        if (calLead.sales_stage === 'Qualified') pass("Lead Stage Updates", "Stage updated to Qualified");
        else fail("Lead Stage Updates", `Stage is ${calLead.sales_stage}`);

        if (calLead.next_followup_at) pass("Next Followup Updated", `Updated to ${calLead.next_followup_at}`);
        else fail("Next Followup Updated", "next_followup_at is null");

        const { rows: calActs } = await db.query(`SELECT * FROM lead_activities WHERE lead_id = $1 AND activity_type = 'meeting'`, [TEST_LEAD_ID]);
        if (calActs && calActs.length > 0) pass("Meeting Activity Logged", "Meeting activity exists");
        else fail("Meeting Activity Logged", "No meeting activity found");
      } catch (err) {
        fail("Calendly Integration", err.response?.data?.error || err.message);
      }
    }

    // 5. Email Nurturing Validation
    console.log("\n--- 5. Email Nurturing Validation ---");
    if (TEST_LEAD_ID) {
      try {
        await db.query(`UPDATE leads SET next_followup_at = $1 WHERE id = $2`, [new Date(Date.now() - 3600000).toISOString(), TEST_LEAD_ID]);
        
        const nurtureRes = await runEmailNurturing();
        if (nurtureRes.success) {
          pass("followupNurturingJob executes", "Function ran without crashing");
          if (nurtureRes.processed > 0) pass("Eligible Leads Detected", `Processed ${nurtureRes.processed} leads`);
          else fail("Eligible Leads Detected", "Processed 0 leads");
        } else {
          fail("followupNurturingJob executes", nurtureRes.error);
        }

        const { rows: nurLeads } = await db.query(`SELECT next_followup_at FROM leads WHERE id = $1`, [TEST_LEAD_ID]);
        const nurLead = nurLeads[0];
        if (new Date(nurLead.next_followup_at) > new Date()) pass("Next Follow-up Date Updates", "Date bumped to future");
        else fail("Next Follow-up Date Updates", "Date not bumped");
        
        const { rows: nurActs } = await db.query(`SELECT * FROM lead_activities WHERE lead_id = $1 AND activity_type = 'email' AND activity_description LIKE '%Automated nurturing%'`, [TEST_LEAD_ID]);
        if (nurActs && nurActs.length > 0) pass("Activity Logging after send", "Email sent activity found");
        else fail("Activity Logging after send", "No automated email activity found");
      } catch (err) {
        fail("Email Nurturing Validation", err.message);
      }
    }

    // 6. n8n Integration Validation
    console.log("\n--- 6. n8n Integration Validation ---");
    if (TEST_LEAD_ID) {
      try {
        const n8nPayload = {
          action: 'add_note',
          lead_id: TEST_LEAD_ID,
          data: { note: "This is an automated n8n test note." }
        };

        const resN8n = await request.post('http://localhost:5001/api/webhooks/n8n', n8nPayload);
        if (resN8n.status === 200) pass("/api/webhooks/n8n Endpoint", "Responded 200 OK");
        else fail("/api/webhooks/n8n Endpoint", `Responded ${resN8n.status}`);

        const { rows: n8nActs } = await db.query(`SELECT * FROM lead_activities WHERE lead_id = $1 AND activity_type = 'note' AND activity_description LIKE '%n8n%'`, [TEST_LEAD_ID]);
        if (n8nActs && n8nActs.length > 0) pass("Note Creation via n8n", "n8n note found in activities");
        else fail("Note Creation via n8n", "No n8n note found");
      } catch (err) {
        fail("n8n Integration Validation", err.response?.data?.error || err.message);
      }
    }

    // Generate Final Report Artifact Format
    let reportMd = `# E2E Sales AutoPilot Validation Report\n\n`;
    reportMd += `**Date:** ${new Date().toISOString()}\n`;
    reportMd += `**Total Tests:** ${REPORT.total}\n`;
    reportMd += `**Passed:** ${REPORT.passed}\n`;
    reportMd += `**Failed:** ${REPORT.failed}\n\n`;

    reportMd += `## Test Results\n\n`;
    REPORT.results.forEach(res => {
      reportMd += `- ${res}\n`;
    });

    reportMd += `\n## Configuration & Environment Review\n`;
    const requiredEnv = ['SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SMTP_USER', 'SMTP_PASSWORD'];
    requiredEnv.forEach(env => {
      reportMd += `- ${env}: ${process.env[env] ? '✅ Configured' : '❌ Missing'}\n`;
    });

    const score = Math.round((REPORT.passed / REPORT.total) * 100);
    reportMd += `\n## Production Readiness Score: ${score}%\n\n`;
    if (score >= 90) {
      reportMd += `### ✅ Ready for Production\n`;
      reportMd += `The core components of the Sales AutoPilot (Lead Capture, AI Scoring, Nurturing, and Orchestration) are functioning correctly end-to-end.\n`;
    } else {
      reportMd += `### ❌ Not Ready for Production\n`;
      reportMd += `Critical failures detected in the validation. See results above for details.\n`;
    }

    fs.writeFileSync(path.join(__dirname, 'validation_report.md'), reportMd);
    console.log("\nValidation Complete. Report written to artifacts/validation_report.md");

  } catch (err) {
    console.error("FATAL ERROR during validation:", err);
  } finally {
    if (TEST_LEAD_ID) {
      // Cleanup
      console.log(`Cleaning up test lead ${TEST_LEAD_ID}...`);
      await db.query(`DELETE FROM lead_activities WHERE lead_id = $1`, [TEST_LEAD_ID]);
      await db.query(`DELETE FROM leads WHERE id = $1`, [TEST_LEAD_ID]);
    }
    server.close();
    process.exit(0);
  }
}

runTests();

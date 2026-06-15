const express = require('express');
const router = express.Router();
const db = require('../db');
const { analyzeLeadAIById } = require('../utils/leadHelpers');

// ==========================================
// CALENDLY WEBHOOK
// ==========================================
router.post('/calendly', async (req, res) => {
  console.log('[WEBHOOK] Calendly Event Received:', req.body);
  try {
    const { payload, event } = req.body;

    if (event === 'invitee.created') {
      const email = payload.email;
      const eventTime = payload.scheduled_event.start_time;

      // Find lead by email
      const { rows: leads } = await db.query(
        `SELECT * FROM leads WHERE email = $1 ORDER BY created_at DESC LIMIT 1`,
        [email]
      );

      if (leads && leads.length > 0) {
        const lead = leads[0];

        // Update lead status to Qualified/Negotiation because they booked a meeting
        const newStage = lead.sales_stage === 'New Lead' ? 'Qualified' : lead.sales_stage;
        
        await db.query(
          `UPDATE leads SET sales_stage = $1, next_followup_at = $2, next_action = $3 WHERE id = $4`,
          [newStage, eventTime, `Attend Scheduled Meeting on ${new Date(eventTime).toLocaleString()}`, lead.id]
        );

        // Log the activity
        await db.query(
          `INSERT INTO lead_activities (lead_id, activity_type, activity_description, metadata, created_at)
           VALUES ($1, 'meeting', $2, $3::jsonb, NOW())`,
          [lead.id, `Meeting Scheduled via Calendly for ${new Date(eventTime).toLocaleString()}`, JSON.stringify({ calendly_event: payload.scheduled_event.uri })]
        );

        // Trigger AI Re-Analysis
        await analyzeLeadAIById(lead.id);

        console.log(`[WEBHOOK] Calendly - Processed Lead ${lead.id}`);
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[WEBHOOK] Calendly Error:', err.stack);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ==========================================
// N8N GENERIC WEBHOOK (INBOUND)
// ==========================================
router.post('/n8n', async (req, res) => {
  console.log('[WEBHOOK] n8n Trigger Received:', req.body);
  try {
    const { action, lead_id, data } = req.body;

    if (!action || !lead_id) {
      return res.status(400).json({ error: 'Missing action or lead_id' });
    }

    switch (action) {
      case 'update_lead_stage':
        if (data.sales_stage) {
          await db.query(`UPDATE leads SET sales_stage = $1 WHERE id = $2`, [data.sales_stage, lead_id]);
          await db.query(
            `INSERT INTO lead_activities (lead_id, activity_type, activity_description, created_at) VALUES ($1, 'system', $2, NOW())`,
            [lead_id, `Lead stage updated to ${data.sales_stage} via n8n automation`]
          );
        }
        break;

      case 'add_note':
        if (data.note) {
          await db.query(
            `INSERT INTO lead_activities (lead_id, activity_type, activity_description, created_at) VALUES ($1, 'note', $2, NOW())`,
            [lead_id, `n8n Note: ${data.note}`]
          );
        }
        break;

      default:
        console.warn('[WEBHOOK] n8n - Unknown action:', action);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[WEBHOOK] n8n Error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;

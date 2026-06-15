const express = require('express');
const router = express.Router();
const db = require('../db');
const revopsService = require('../services/revopsService');

const getNum = (val) => Number(val || 0);

// 1. POST /api/admin/revops/predict-deal-value
router.post('/predict-deal-value', async (req, res) => {
  try {
    const result = await revopsService.predictDealValue(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('RevOps Prediction Error:', error);
    res.status(500).json({ success: false, error: 'Failed to predict deal value' });
  }
});

// 2. GET /api/admin/revops/pipeline-velocity
router.get('/pipeline-velocity', async (req, res) => {
  try {
    // Averages spent in each stage (in days)
    const qStageAvgs = `
      SELECT 
        new_stage as stage,
        ROUND(AVG(duration_seconds) / 86400.0, 1)::float as avg_days
      FROM public.lead_stage_history
      WHERE duration_seconds IS NOT NULL AND duration_seconds > 0
      GROUP BY new_stage
    `;
    
    // Time-to-milestones
    const qMilestones = `
      SELECT 
        (
          SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (h2.changed_at - h1.changed_at)) / 86400.0), 1)::float, 0.0)
          FROM public.lead_stage_history h1
          JOIN public.lead_stage_history h2 ON h1.lead_id = h2.lead_id
          WHERE h1.new_stage = 'New Lead' AND h2.new_stage = 'Qualified' AND h2.changed_at > h1.changed_at
        ) as time_to_qualification,
        (
          SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (h2.changed_at - h1.changed_at)) / 86400.0), 1)::float, 0.0)
          FROM public.lead_stage_history h1
          JOIN public.lead_stage_history h2 ON h1.lead_id = h2.lead_id
          WHERE h1.new_stage = 'New Lead' AND h2.new_stage = 'Proposal Sent' AND h2.changed_at > h1.changed_at
        ) as time_to_proposal,
        (
          SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (h2.changed_at - h1.changed_at)) / 86400.0), 1)::float, 0.0)
          FROM public.lead_stage_history h1
          JOIN public.lead_stage_history h2 ON h1.lead_id = h2.lead_id
          WHERE h1.new_stage = 'New Lead' AND h2.new_stage = 'Negotiation' AND h2.changed_at > h1.changed_at
        ) as time_to_negotiation,
        (
          SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (h2.changed_at - h1.changed_at)) / 86400.0), 1)::float, 0.0)
          FROM public.lead_stage_history h1
          JOIN public.lead_stage_history h2 ON h1.lead_id = h2.lead_id
          WHERE h1.new_stage = 'New Lead' AND h2.new_stage = 'Closed Won' AND h2.changed_at > h1.changed_at
        ) as time_to_close
    `;

    const [stageAvgsRes, milestonesRes] = await Promise.all([
      db.query(qStageAvgs),
      db.query(qMilestones)
    ]);

    // Ensure all standard stages are represented
    const defaultStages = ['New Lead', 'Qualified', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const velocityData = defaultStages.map(stage => {
      const dbRow = stageAvgsRes.rows.find(r => r.stage.toLowerCase() === stage.toLowerCase());
      return {
        stage,
        avgDays: dbRow ? getNum(dbRow.avg_days) : 0.0
      };
    });

    const milestones = milestonesRes.rows[0] || {
      time_to_qualification: 0.0,
      time_to_proposal: 0.0,
      time_to_negotiation: 0.0,
      time_to_close: 0.0
    };

    res.json({
      success: true,
      data: {
        stageAverages: velocityData,
        milestones
      }
    });
  } catch (error) {
    console.error('RevOps Pipeline Velocity Error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate pipeline velocity' });
  }
});

// 3. GET /api/admin/revops/escalations
router.get('/escalations', async (req, res) => {
  try {
    const qSlas = `
      SELECT id, name, company, sales_stage, stage_entered_at, stage_duration_days, sla_status
      FROM public.leads
      WHERE sla_status = 'Overdue' AND sales_stage NOT IN ('Closed Won', 'Closed Lost')
      ORDER BY stage_duration_days DESC
    `;

    const qStale = `
      SELECT id, name, company, sales_stage, COALESCE(last_contacted_at, created_at) as last_activity
      FROM public.leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
        AND (
          last_contacted_at < NOW() - INTERVAL '30 days'
          OR (last_contacted_at IS NULL AND created_at < NOW() - INTERVAL '30 days')
        )
      ORDER BY last_activity ASC
    `;

    const qMissed = `
      SELECT id, name, company, sales_stage, next_followup_at
      FROM public.leads
      WHERE sales_stage NOT IN ('Closed Won', 'Closed Lost')
        AND next_followup_at < NOW()
      ORDER BY next_followup_at ASC
    `;

    const [slasRes, staleRes, missedRes] = await Promise.all([
      db.query(qSlas),
      db.query(qStale),
      db.query(qMissed)
    ]);

    res.json({
      success: true,
      data: {
        slaViolations: slasRes.rows,
        staleLeads: staleRes.rows,
        missedFollowUps: missedRes.rows
      }
    });
  } catch (error) {
    console.error('RevOps Escalations Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch escalations data' });
  }
});

// 4. POST /api/admin/revops/run-sla-check
router.post('/run-sla-check', async (req, res) => {
  try {
    const result = await revopsService.checkStageSLAs();
    res.json(result);
  } catch (error) {
    console.error('RevOps SLA check manual trigger failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

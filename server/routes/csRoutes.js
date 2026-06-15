const express = require('express');
const router = express.Router();
const db = require('../db');
const csService = require('../services/csService');
const csCopilotService = require('../services/csCopilotService');

// Middleware to block Auditor write operations
const blockAuditorWrites = (req, res, next) => {
  if (req.adminRole === 'AUDITOR' && req.method !== 'GET') {
    return res.status(403).json({ success: false, error: 'Auditor has read-only access' });
  }
  next();
};

router.use(blockAuditorWrites);

// 1. Analytical CS Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const data = await csService.getCSDashboardStats(req);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[CS API] Dashboard stats error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve Customer Success dashboard stats' });
  }
});

// AI Copilot Endpoint
router.post('/copilot/account-brief', async (req, res) => {
  try {
    const { accountId } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'Account ID required' });
    const result = await csCopilotService.generateAccountBrief(accountId);
    res.json(result);
  } catch (error) {
    console.error('[CS Copilot API] Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const lifecycleAutomationService = require('../services/lifecycleAutomationService');

// Lifecycle Automation Endpoints
router.post('/automations/renewals', async (req, res) => {
  try {
    const result = await lifecycleAutomationService.runRenewalWorkflows();
    res.json(result);
  } catch (error) {
    console.error('[CS Automation] Renewals error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/analytics/retention-kpis', async (req, res) => {
  try {
    const data = await csService.getRetentionAnalytics();
    res.json(data);
  } catch (err) {
    console.error('[CS API] Retention stats error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve retention stats' });
  }
});

router.post('/automations/churn-prevention', async (req, res) => {
  try {
    const result = await lifecycleAutomationService.runChurnPrevention();
    res.json(result);
  } catch (error) {
    console.error('[CS Automation] Churn prevention error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/automations/journey', async (req, res) => {
  try {
    const result = await lifecycleAutomationService.runJourneyAutomation();
    res.json(result);
  } catch (error) {
    console.error('[CS Automation] Journey error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. List Customer Accounts
router.get('/accounts', async (req, res) => {
  try {
    const { status, health, csm, search } = req.query;
    let query = `
      SELECT 
        a.*,
        u.full_name as csm_name
      FROM public.customer_accounts a
      LEFT JOIN public.users u ON a.assigned_csm = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND a.status = $${params.length}`;
    }
    if (health) {
      params.push(health);
      query += ` AND a.health_status = $${params.length}`;
    }
    if (csm) {
      params.push(csm);
      query += ` AND a.assigned_csm = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (a.company_name ILIKE $${params.length} OR a.contact_name ILIKE $${params.length} OR a.contact_email ILIKE $${params.length})`;
    }

    query += ' ORDER BY a.health_score ASC, a.company_name ASC';

    const { rows } = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[CS API] List accounts error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve customer accounts' });
  }
});

// 3. Get Account Profile Drawer Details (Customer 360)
router.get('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch account details
    const accountQuery = `
      SELECT 
        a.*,
        u.full_name as csm_name
      FROM public.customer_accounts a
      LEFT JOIN public.users u ON a.assigned_csm = u.id
      WHERE a.id = $1
    `;
    const accRes = await db.query(accountQuery, [id]);
    if (accRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer account not found' });
    }

    const account = accRes.rows[0];

    // Fetch health history
    const historyQuery = `
      SELECT score, recorded_at 
      FROM public.account_health_history 
      WHERE account_id = $1 
      ORDER BY recorded_at ASC
    `;
    const histRes = await db.query(historyQuery, [id]);

    // Fetch upsells
    const upsellsQuery = `
      SELECT * 
      FROM public.upsell_opportunities 
      WHERE account_id = $1 
      ORDER BY created_at DESC
    `;
    const upsellsRes = await db.query(upsellsQuery, [id]);

    // Fetch Unified Timeline
    const timeline = await csService.getAccountTimeline(id);

    res.json({
      success: true,
      data: {
        account,
        healthHistory: histRes.rows,
        upsellOpportunities: upsellsRes.rows,
        timeline
      }
    });
  } catch (err) {
    console.error('[CS API] Get account details error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve Customer 360 profile' });
  }
});

// 4. Update NPS, Usage, Support Tickets Metrics
router.post('/accounts/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { support_tickets_count, nps_score, usage_rate, last_activity_date, support_integration_source, external_support_metadata } = req.body;

    const fields = {};
    if (support_tickets_count !== undefined) fields.support_tickets_count = Number(support_tickets_count);
    if (nps_score !== undefined) fields.nps_score = nps_score === null ? null : Number(nps_score);
    if (usage_rate !== undefined) fields.usage_rate = Number(usage_rate);
    if (last_activity_date !== undefined) fields.last_activity_date = last_activity_date;
    if (support_integration_source !== undefined) fields.support_integration_source = support_integration_source;
    if (external_support_metadata !== undefined) fields.external_support_metadata = external_support_metadata;

    // Recalculate and update
    const updated = await csService.updateAccountMetrics(id, fields);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[CS API] Update metrics error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to update customer health metrics' });
  }
});

// 5. Update Contract Status, CSM, ARR/MRR (SUPER_ADMIN and MANAGER only)
router.put('/accounts/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_csm, mrr, arr, contract_end_date } = req.body;

    // RBAC: Block representatives from changing financial or ownership details
    if (req.adminRole === 'REPRESENTATIVE') {
      return res.status(403).json({ success: false, error: 'Representatives cannot modify account assignments or revenue metrics' });
    }

    const fields = {};
    if (status !== undefined) fields.status = status;
    if (assigned_csm !== undefined) fields.assigned_csm = assigned_csm;
    if (mrr !== undefined) fields.mrr = Number(mrr);
    if (arr !== undefined) fields.arr = Number(arr);
    if (contract_end_date !== undefined) fields.contract_end_date = contract_end_date;

    const updated = await csService.updateAccountMetrics(id, fields);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[CS API] Update status error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to update customer status' });
  }
});

// 6. Create Upsell Expansion Opportunity
router.post('/accounts/:id/upsells', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, estimated_value, status = 'Identified' } = req.body;

    if (!title || !estimated_value) {
      return res.status(400).json({ success: false, error: 'Title and estimated_value are required' });
    }

    // Check account
    const checkRes = await db.query('SELECT id FROM public.customer_accounts WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer account not found' });
    }

    const query = `
      INSERT INTO public.upsell_opportunities (account_id, title, estimated_value, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const { rows } = await db.query(query, [id, title, Number(estimated_value), status]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[CS API] Create upsell error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record upsell opportunity' });
  }
});

// 7. Update Upsell Status
router.put('/accounts/:id/upsells/:oppId', async (req, res) => {
  try {
    const { id, oppId } = req.params;
    const { status, title, estimated_value } = req.body;

    const checkRes = await db.query(
      'SELECT id FROM public.upsell_opportunities WHERE id = $1 AND account_id = $2',
      [oppId, id]
    );
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Upsell opportunity not found' });
    }

    let query = 'UPDATE public.upsell_opportunities SET updated_at = NOW()';
    const params = [oppId];
    const updates = [];

    if (status !== undefined) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    if (estimated_value !== undefined) {
      params.push(Number(estimated_value));
      updates.push(`estimated_value = $${params.length}`);
    }

    query += ', ' + updates.join(', ') + ' WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, params);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[CS API] Update upsell error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update upsell opportunity' });
  }
});

// 8. List all upsells in expansion pipeline
router.get('/upsells', async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*,
        a.company_name,
        u.full_name as csm_name
      FROM public.upsell_opportunities o
      JOIN public.customer_accounts a ON o.account_id = a.id
      LEFT JOIN public.users u ON a.assigned_csm = u.id
      ORDER BY o.created_at DESC
    `;
    const { rows } = await db.query(query);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[CS API] List upsells error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve upsell pipeline' });
  }
});

// 9. Trigger Renewal Sweep manually / cron simulation
router.post('/renewals/sweep', async (req, res) => {
  try {
    const sweep = await csService.sweepRenewalContracts();
    res.json({ success: true, data: sweep });
  } catch (err) {
    console.error('[CS API] Renewal sweep error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to run renewal reminder sweep' });
  }
});

module.exports = router;

/**
 * workflowRoutes.js
 * Phase 7B API Contracts
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const eventBus = require('../services/eventBusService');
const workflowEngine = require('../services/workflowEngineService');
const aiOperations = require('../services/aiOperationsService');

// ─────────────────────────────────────────────
// RBAC Middleware (Requires MANAGER or SUPER_ADMIN)
// ─────────────────────────────────────────────
const requireManagerOrAbove = (req, res, next) => {
  const allowed = ['SUPER_ADMIN', 'MANAGER', 'AUDITOR'];
  if (!allowed.includes(req.adminRole)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions' });
  }
  // Auditors can only GET
  if (req.adminRole === 'AUDITOR' && req.method !== 'GET') {
    return res.status(403).json({ success: false, error: 'Auditor has read-only access' });
  }
  next();
};

router.use(requireManagerOrAbove);

// ─────────────────────────────────────────────
// 1. EVENT BUS
// ─────────────────────────────────────────────
router.get('/events', async (req, res) => {
  try {
    const events = await eventBus.getEvents({ limit: 50 });
    res.json({ success: true, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/events', async (req, res) => {
  try {
    const { eventType, category, source, payload } = req.body;
    const published = await eventBus.publishEvent({ 
      eventType, 
      category, 
      source, 
      actor: req.adminUser?.id || 'admin', 
      payload 
    });
    res.json({ success: true, data: published });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// 2. PLAYBOOKS & EXECUTIONS
// ─────────────────────────────────────────────
router.get('/playbooks', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM public.workflow_playbooks ORDER BY created_at DESC`);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/playbooks/:id/execute', async (req, res) => {
  try {
    const execution = await workflowEngine.executePlaybook(req.params.id, req.body.context || {});
    res.json({ success: true, data: execution });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/executions', async (req, res) => {
  try {
    const { rows: execs } = await db.query(`
      SELECT e.*, p.name as playbook_name 
      FROM public.workflow_executions e
      LEFT JOIN public.workflow_playbooks p ON e.playbook_id = p.id
      ORDER BY e.created_at DESC LIMIT 20
    `);
    
    // Attach tasks to executions for UI timeline
    for (let e of execs) {
      const { rows: tasks } = await db.query(
        `SELECT * FROM public.workflow_tasks WHERE execution_id = $1 ORDER BY step_index ASC`,
        [e.id]
      );
      e.tasks = tasks;
    }
    
    res.json({ success: true, data: execs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// 3. APPROVALS
// ─────────────────────────────────────────────
router.get('/approvals', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, t.title as task_title, e.playbook_id, p.name as playbook_name
      FROM public.workflow_approvals a
      JOIN public.workflow_tasks t ON a.task_id = t.id
      JOIN public.workflow_executions e ON a.execution_id = e.id
      JOIN public.workflow_playbooks p ON e.playbook_id = p.id
      ORDER BY a.requested_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/approvals/:id', async (req, res) => {
  try {
    const { status, comments } = req.body; // 'Approved' or 'Rejected'
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be Approved or Rejected' });
    }
    
    const approval = await workflowEngine.processApproval(req.params.id, status, req.adminUser?.id, comments);
    res.json({ success: true, data: approval });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// 4. AI & SLA OPS
// ─────────────────────────────────────────────
router.get('/ai-traces', async (req, res) => {
  try {
    const traces = await aiOperations.getAITraces();
    res.json({ success: true, data: traces });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sla/check', async (req, res) => {
  try {
    const result = await workflowEngine.handleSLAEscalations();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

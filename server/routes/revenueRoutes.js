/**
 * revenueRoutes.js
 * Phase 6C: Unified Revenue Intelligence API Layer
 * 
 * Inherits authenticateAdmin (Phase 5B) from index.js injection.
 * RBAC enforced per role.
 * Audit logged per spec.
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const revIntel = require('../services/revenueIntelligenceService');
const forecastSvc = require('../services/revenueForecastService');
const boardSvc = require('../services/boardReportingService');
const copilotSvc = require('../services/revenueCopilotService');
const executiveAutomationSvc = require('../services/executiveAutomationService');

// ─────────────────────────────────────────────
// RBAC Middleware
// ─────────────────────────────────────────────
const blockAuditorWrites = (req, res, next) => {
  if (req.adminRole === 'AUDITOR' && req.method !== 'GET') {
    return res.status(403).json({ success: false, error: 'Auditor has read-only access' });
  }
  next();
};

// Restrict REPRESENTATIVE from revenue intelligence
const requireManagerOrAbove = (req, res, next) => {
  const allowed = ['SUPER_ADMIN', 'MANAGER', 'AUDITOR'];
  if (!allowed.includes(req.adminRole)) {
    return res.status(403).json({ success: false, error: 'Insufficient permissions for revenue intelligence' });
  }
  next();
};

// Audit logger for board report generation
const auditBoardReport = async (req, action, metadata = {}) => {
  try {
    const adminId = req.adminUser?.id || req.adminUser?.username || 'unknown';
    const adminRole = req.adminRole || 'ADMIN';
    await db.query(
      `INSERT INTO public.admin_audit_logs (admin_id, action, resource_type, resource_id, metadata, ip_address, admin_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, action, 'REVENUE_REPORT', 'global', JSON.stringify({ ...metadata, generatedBy: adminId }), req.ip, adminRole]
    );
  } catch (err) {
    console.error('[Revenue Audit] Failed to log:', err.message);
  }
};

router.use(blockAuditorWrites);
router.use(requireManagerOrAbove);

// ─────────────────────────────────────────────
// GET /dashboard
// Revenue Overview — main KPI layer
// ─────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const overview = await revIntel.getRevenueOverview(req);
    res.json({ success: true, data: overview });
  } catch (err) {
    console.error('[Revenue API] Dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve revenue overview' });
  }
});

// ─────────────────────────────────────────────
// GET /forecast?window=quarterly|monthly|yearly
// ─────────────────────────────────────────────
router.get('/forecast', async (req, res) => {
  try {
    const window = req.query.window || 'quarterly';
    if (!['monthly', 'quarterly', 'yearly'].includes(window)) {
      return res.status(400).json({ success: false, error: 'Invalid window. Use: monthly, quarterly, yearly' });
    }
    const forecast = await forecastSvc.getForecast(window);
    res.json({ success: true, data: forecast });
  } catch (err) {
    console.error('[Revenue API] Forecast error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate revenue forecast' });
  }
});

// ─────────────────────────────────────────────
// GET /composition
// Revenue segmentation breakdown
// ─────────────────────────────────────────────
router.get('/composition', async (req, res) => {
  try {
    const composition = await revIntel.getRevenueComposition(req);
    res.json({ success: true, data: composition });
  } catch (err) {
    console.error('[Revenue API] Composition error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve revenue composition' });
  }
});

// ─────────────────────────────────────────────
// GET /risks
// Weighted risk registry
// ─────────────────────────────────────────────
router.get('/risks', async (req, res) => {
  try {
    const risks = await revIntel.getRevenueRisks(req);
    res.json({ success: true, data: risks });
  } catch (err) {
    console.error('[Revenue API] Risks error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve revenue risks' });
  }
});

// ─────────────────────────────────────────────
// GET /opportunities
// Growth & expansion opportunities
// ─────────────────────────────────────────────
router.get('/opportunities', async (req, res) => {
  try {
    const opps = await revIntel.getGrowthOpportunities(req);
    res.json({ success: true, data: opps });
  } catch (err) {
    console.error('[Revenue API] Opportunities error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve growth opportunities' });
  }
});

// ─────────────────────────────────────────────
// GET /snapshots
// Revenue snapshot history
// ─────────────────────────────────────────────
router.get('/snapshots', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '30'), 90);
    const snapshots = await revIntel.getRevenueSnapshotHistory(limit);
    res.json({ success: true, data: snapshots });
  } catch (err) {
    console.error('[Revenue API] Snapshots error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve snapshots' });
  }
});

// ─────────────────────────────────────────────
// GET /predictive-insights
// Phase 7C-B: Predictive anomalies, risks, and interventions
// ─────────────────────────────────────────────
const predictiveIntel = require('../services/predictiveIntelligenceService');
router.get('/predictive-insights', async (req, res) => {
  try {
    const insights = await predictiveIntel.getPredictiveInsights();
    res.json({ success: true, data: insights });
  } catch (err) {
    console.error('[Predictive API] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve predictive insights' });
  }
});

// ─────────────────────────────────────────────
// POST /copilot/brief  — SUPER_ADMIN & MANAGER only
// ─────────────────────────────────────────────
router.post('/copilot/brief', async (req, res) => {
  if (!['SUPER_ADMIN', 'MANAGER'].includes(req.adminRole)) {
    return res.status(403).json({ success: false, error: 'Copilot requires MANAGER or SUPER_ADMIN role' });
  }
  try {
    const result = await copilotSvc.generateExecutiveBrief(req);
    res.json(result);
  } catch (err) {
    console.error('[Revenue Copilot API] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /board-report?timeframe=quarterly
// Board Pack generation — SUPER_ADMIN only
// ─────────────────────────────────────────────
router.get('/board-report', async (req, res) => {
  if (req.adminRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Board Report requires SUPER_ADMIN role' });
  }
  try {
    const timeframe = req.query.timeframe || 'quarterly';
    const boardPack = await boardSvc.generateBoardPack(timeframe, req);

    // Audit log per spec
    await auditBoardReport(req, 'BOARD_REPORT_GENERATED', { timeframe, format: 'JSON' });

    res.json({ success: true, data: boardPack });
  } catch (err) {
    console.error('[Revenue Board Report API] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /board-report/export?timeframe=quarterly&format=csv
// CSV export — SUPER_ADMIN only
// ─────────────────────────────────────────────
router.get('/board-report/export', async (req, res) => {
  if (req.adminRole !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Board Report export requires SUPER_ADMIN role' });
  }
  try {
    const timeframe = req.query.timeframe || 'quarterly';
    const format = req.query.format || 'csv';
    const boardPack = await boardSvc.generateBoardPack(timeframe, req);

    // Audit log per spec
    await auditBoardReport(req, 'BOARD_REPORT_EXPORTED', { timeframe, format });

    if (format === 'csv') {
      const csv = boardSvc.generateBoardPackCSV(boardPack);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="board-report-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csv);
    }

    res.json({ success: true, data: boardPack });
  } catch (err) {
    console.error('[Revenue Export API] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// Executive Automation & Command Center
// ─────────────────────────────────────────────
router.get('/executive/command-center', async (req, res) => {
  try {
    const commandCenter = await executiveAutomationSvc.getExecutiveCommandCenter(req);
    res.json({ success: true, data: commandCenter });
  } catch (err) {
    console.error('[Executive Command Center] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/executive/alerts', async (req, res) => {
  try {
    const alerts = await executiveAutomationSvc.getAlerts(20);
    res.json({ success: true, data: alerts });
  } catch (err) {
    console.error('[Executive Alerts] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/executive/watchlists', async (req, res) => {
  try {
    const overview = await revIntel.getRevenueOverview(req);
    const forecast = await forecastSvc.getForecast('quarterly');
    const risks = await revIntel.getRevenueRisks(req);
    const watchlists = executiveAutomationSvc.getWatchlists({ overview, forecast, risks });
    res.json({ success: true, data: watchlists });
  } catch (err) {
    console.error('[Executive Watchlists] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/executive/digest', async (req, res) => {
  try {
    const [overview, forecast, risks, opportunities] = await Promise.all([
      revIntel.getRevenueOverview(req),
      forecastSvc.getForecast('quarterly'),
      revIntel.getRevenueRisks(req),
      revIntel.getGrowthOpportunities(req)
    ]);
    const digest = executiveAutomationSvc.buildDigest({ overview, forecast, risks, opportunities, boardPack: { boardHighlights: [] } });
    res.json({ success: true, data: digest });
  } catch (err) {
    console.error('[Executive Digest] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/executive/feed', async (req, res) => {
  try {
    const feed = await executiveAutomationSvc.getFeedEvents(20);
    res.json({ success: true, data: feed });
  } catch (err) {
    console.error('[Executive Feed] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/executive/schedules', async (req, res) => {
  try {
    const schedules = await executiveAutomationSvc.listSchedules();
    res.json({ success: true, data: schedules });
  } catch (err) {
    console.error('[Executive Schedules] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/executive/schedules', async (req, res) => {
  try {
    const schedule = await executiveAutomationSvc.createSchedule({ ...req.body, req });
    res.json({ success: true, data: schedule });
  } catch (err) {
    console.error('[Executive Schedules] Create error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/executive/schedules/:id/run', async (req, res) => {
  try {
    const result = await executiveAutomationSvc.runExecutiveReport({ req, frequency: req.body?.frequency || 'quarterly', recipient: req.body?.recipient, scheduleId: req.params.id });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Executive Schedules] Run error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/executive/report/dispatch', async (req, res) => {
  try {
    const result = await executiveAutomationSvc.runExecutiveReport({ req, frequency: req.body?.frequency || 'quarterly', recipient: req.body?.recipient || req.body?.email });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Executive Dispatch] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// Phase 7C-C: Simulation & Strategic Planning
// ─────────────────────────────────────────────
const simulationSvc = require('../services/revenueSimulationService');

router.post('/simulation/run', async (req, res) => {
  try {
    const result = await simulationSvc.runSimulation(req.body, req);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[Simulation API] Run error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/save', async (req, res) => {
  try {
    const { name, description, variables, results, aiAnalysis, status } = req.body;
    const scenario = await simulationSvc.saveScenario(req, name, description, variables, results, aiAnalysis, status);
    res.json({ success: true, data: scenario });
  } catch (err) {
    console.error('[Simulation API] Save error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/simulation/history', async (req, res) => {
  try {
    const scenarios = await simulationSvc.getHistory(req.query.status);
    res.json({ success: true, data: scenarios });
  } catch (err) {
    console.error('[Simulation API] History error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/:id/analyze', async (req, res) => {
  try {
    const scenario = await simulationSvc.getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ success: false, error: 'Scenario not found' });
    const analysis = await simulationSvc.generateStrategicAnalysis(scenario.variables, scenario.projection_results);
    
    // Save the analysis back to the scenario
    const { rows } = await db.query(`UPDATE public.revenue_scenarios SET ai_analysis = $1 WHERE id = $2 RETURNING *`, [JSON.stringify(analysis), scenario.id]);
    
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[Simulation API] Analyze error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/:id/lock', async (req, res) => {
  try {
    const scenario = await simulationSvc.updateStatus(req.params.id, 'LOCKED');
    res.json({ success: true, data: scenario });
  } catch (err) {
    console.error('[Simulation API] Lock error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/simulation/:id/approve', async (req, res) => {
  if (req.adminRole !== 'SUPER_ADMIN' && req.adminRole !== 'MANAGER') {
    return res.status(403).json({ success: false, error: 'Only executives can approve scenarios' });
  }
  try {
    const scenario = await simulationSvc.updateStatus(req.params.id, 'APPROVED');
    res.json({ success: true, data: scenario });
  } catch (err) {
    console.error('[Simulation API] Approve error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/simulation/:id/compare', async (req, res) => {
  try {
    const scenario = await simulationSvc.getScenario(req.params.id);
    const baseline = await simulationSvc.runSimulation({}, req); // Baseline with 0 modifiers
    res.json({ success: true, data: { scenario, baseline: baseline.baseline } });
  } catch (err) {
    console.error('[Simulation API] Compare error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

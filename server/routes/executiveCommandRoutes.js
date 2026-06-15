const express = require('express');
const router = express.Router();
const db = require('../db');
const sharedContext = require('../services/sharedContextService');
const orchestrator = require('../services/autonomousRevenueOrchestrator');
const governanceService = require('../services/governanceService');

router.get('/overview', async (req, res) => {
  try {
    const overview = await sharedContext.getExecutiveOverview();
    res.json({ success: true, data: overview });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/recommendations', async (req, res) => {
  try {
    const payload = await orchestrator.generateRecommendations(req.query || {}, {
      userRole: req.adminUser?.role || 'SUPER_ADMIN',
      signalType: req.query?.signalType || 'overview',
      context: req.query || {},
    });
    res.json({ success: true, data: payload.recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/governance', async (req, res) => {
  try {
    const payload = await orchestrator.generateRecommendations(req.query || {}, {
      userRole: req.adminUser?.role || 'SUPER_ADMIN',
      signalType: req.query?.signalType || 'overview',
      context: req.query || {},
    });
    const auditTrail = await governanceService.getAuditTrail(8);
    res.json({ success: true, data: { recommendations: payload.recommendations, auditTrail, summary: payload.summary } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/orchestrate', async (req, res) => {
  try {
    const payload = await orchestrator.orchestrate({
      ...req.body,
      userRole: req.adminUser?.role || 'SUPER_ADMIN',
    });
    await governanceService.logGovernanceEvent({
      req,
      action: 'EXECUTIVE_ORCHESTRATION',
      resourceId: payload.recommendation?.recommendationId || 'n/a',
      metadata: payload,
    });
    res.json({ success: true, data: payload });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/override', async (req, res) => {
  try {
    const recommendationId = req.body?.recommendationId || 'n/a';
    await governanceService.logGovernanceEvent({
      req,
      action: 'EXECUTIVE_OVERRIDE',
      resourceId: recommendationId,
      metadata: { reason: req.body?.reason || 'Human override requested', recommendationId },
    });
    res.json({ success: true, data: { recommendationId, status: 'override-recorded' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

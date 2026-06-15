const express = require('express');
const router = express.Router();
const autonomousOpsService = require('../services/autonomousOpsService');
const db = require('../db');

// @route   GET /api/admin/autonomous/thresholds
// @desc    Get all active autonomous thresholds
// @access  SUPER_ADMIN, MANAGER, AUDITOR
router.get('/thresholds', async (req, res) => {
    try {
        const thresholds = await autonomousOpsService.getThresholds();
        res.json({ success: true, data: thresholds });
    } catch (err) {
        console.error('[AutonomousRoutes] Error fetching thresholds:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/admin/autonomous/thresholds
// @desc    Update a specific threshold (e.g. increase max discount)
// @access  SUPER_ADMIN ONLY
router.post('/thresholds/:action_type', async (req, res) => {
    // Only Super Admin can change these rules
    if (req.adminRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: 'Only SUPER_ADMIN can modify autonomous thresholds' });
    }

    const { action_type } = req.params;
    const { max_discount_percent, max_arr_impact, min_confidence, approval_required, active } = req.body;

    try {
        const updateQuery = `
            UPDATE public.autonomous_thresholds 
            SET 
                max_discount_percent = COALESCE($1, max_discount_percent),
                max_arr_impact = COALESCE($2, max_arr_impact),
                min_confidence = COALESCE($3, min_confidence),
                approval_required = COALESCE($4, approval_required),
                active = COALESCE($5, active),
                updated_at = CURRENT_TIMESTAMP
            WHERE action_type = $6
            RETURNING *;
        `;
        
        const result = await db.query(updateQuery, [max_discount_percent, max_arr_impact, min_confidence, approval_required, active, action_type]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Threshold action type not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('[AutonomousRoutes] Error updating threshold:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   POST /api/admin/autonomous/evaluate
// @desc    Evaluate if an action can be performed autonomously
// @access  SUPER_ADMIN, MANAGER
router.post('/evaluate', async (req, res) => {
    if (req.adminRole === 'AUDITOR' || req.adminRole === 'REPRESENTATIVE') {
        return res.status(403).json({ success: false, error: 'Unauthorized to evaluate autonomous actions' });
    }

    try {
        const evaluation = await autonomousOpsService.evaluateAction(req.body);
        res.json({ success: true, data: evaluation });
    } catch (err) {
        console.error('[AutonomousRoutes] Error evaluating action:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

const executiveCommandService = require('../services/executiveCommandService');

// @route   POST /api/admin/autonomous/command/execute
// @desc    Submit a natural language prompt to the Executive AI
// @access  SUPER_ADMIN, MANAGER
router.post('/command/execute', async (req, res) => {
    // Only Executives (SUPER_ADMIN) or specific roles can run executive commands.
    // The requirement says "Verify RBAC enforcement for MANAGER vs SUPER_ADMIN"
    if (req.adminRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, error: 'Only SUPER_ADMIN can execute Executive AI Commands' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    try {
        const result = await executiveCommandService.executeCommand(
            req.adminUser.id, 
            req.adminRole, 
            prompt
        );
        res.json(result);
    } catch (err) {
        console.error('[AutonomousRoutes] Error executing command:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// @route   GET /api/admin/autonomous/command/history
// @desc    View past executive commands
// @access  SUPER_ADMIN, AUDITOR
router.get('/command/history', async (req, res) => {
    if (req.adminRole !== 'SUPER_ADMIN' && req.adminRole !== 'AUDITOR') {
         return res.status(403).json({ success: false, error: 'Unauthorized to view command history' });
    }
    try {
        const history = await executiveCommandService.getCommandHistory();
        res.json({ success: true, data: history });
    } catch (err) {
        console.error('[AutonomousRoutes] Error fetching command history:', err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

module.exports = router;

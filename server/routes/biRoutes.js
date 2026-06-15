const express = require('express');
const router = express.Router();
const db = require('../db');
const biService = require('../services/biService');

// Middleware to block Auditor write operations
const blockAuditorWrites = (req, res, next) => {
  if (req.adminRole === 'AUDITOR' && req.method !== 'GET') {
    return res.status(403).json({ success: false, error: 'Auditor has read-only access' });
  }
  next();
};

router.use(blockAuditorWrites);

// 1. Analytical API Endpoints
router.get('/cohorts', async (req, res) => {
  try {
    const data = await biService.getCohorts(req);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BI API] Cohorts error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve cohort analysis' });
  }
});

router.get('/win-loss', async (req, res) => {
  try {
    const data = await biService.getWinLossAnalysis(req);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BI API] Win/Loss error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve win/loss analysis' });
  }
});

router.get('/benchmarking', async (req, res) => {
  try {
    const data = await biService.getSalesBenchmarking(req);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BI API] Benchmarking error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve sales performance benchmarks' });
  }
});

router.get('/forecast-trends', async (req, res) => {
  try {
    const data = await biService.getForecastTrends(req);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BI API] Forecast trends error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve forecast trends' });
  }
});

// 2. Dashboard CRUD Routes
// List dashboards
router.get('/dashboards', async (req, res) => {
  try {
    const query = `
      SELECT id, title, description, created_by_username, is_default, layout, created_at, updated_at
      FROM public.bi_dashboards
      ORDER BY is_default DESC, created_at DESC
    `;
    const { rows } = await db.query(query);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('[BI API] List dashboards error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve dashboards' });
  }
});

// Create dashboard
router.post('/dashboards', async (req, res) => {
  try {
    const { title, description, layout = '[]' } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const query = `
      INSERT INTO public.bi_dashboards (title, description, created_by, created_by_username, layout)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, created_by_username, is_default, layout
    `;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userId = uuidRegex.test(req.adminUser?.id) ? req.adminUser.id : null;
    const username = req.adminUser?.username || 'admin';
    
    const { rows } = await db.query(query, [title, description, userId, username, JSON.stringify(layout)]);
    
    // Log audit log
    await db.query(`
      INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
      VALUES ($1, 'SETTINGS_CHANGE', 'bi_dashboards', $2, $3, $4, $5, $6)
    `, [
      username,
      rows[0].id,
      JSON.stringify({ action: 'CREATE_DASHBOARD', title }),
      req.ip,
      req.adminRole,
      req.headers['user-agent']
    ]).catch(err => console.error('BI Log fail:', err.message));

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[BI API] Create dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to create dashboard' });
  }
});

// Get specific dashboard with its widgets
router.get('/dashboards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dashQuery = `SELECT * FROM public.bi_dashboards WHERE id = $1`;
    const widgetsQuery = `SELECT * FROM public.bi_widgets WHERE dashboard_id = $1 ORDER BY created_at ASC`;

    const [dashRes, widgetsRes] = await Promise.all([
      db.query(dashQuery, [id]),
      db.query(widgetsQuery, [id])
    ]);

    if (dashRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dashboard not found' });
    }

    res.json({
      success: true,
      data: {
        dashboard: dashRes.rows[0],
        widgets: widgetsRes.rows
      }
    });
  } catch (err) {
    console.error('[BI API] Get dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve dashboard details' });
  }
});

// Update dashboard
router.put('/dashboards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, layout } = req.body;

    const checkRes = await db.query('SELECT id, is_default FROM public.bi_dashboards WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Dashboard not found' });

    let query = 'UPDATE public.bi_dashboards SET updated_at = NOW()';
    const params = [id];
    const updates = [];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    if (description !== undefined) {
      params.push(description);
      updates.push(`description = $${params.length}`);
    }
    if (layout !== undefined) {
      params.push(JSON.stringify(layout));
      updates.push(`layout = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.json({ success: true, message: 'No updates provided' });
    }

    query += ', ' + updates.join(', ') + ' WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, params);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[BI API] Update dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update dashboard' });
  }
});

// Delete dashboard
router.delete('/dashboards/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkRes = await db.query('SELECT id, is_default, title FROM public.bi_dashboards WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Dashboard not found' });
    
    if (checkRes.rows[0].is_default) {
      return res.status(400).json({ success: false, error: 'Cannot delete the default system dashboard' });
    }

    await db.query('DELETE FROM public.bi_dashboards WHERE id = $1', [id]);

    // Log audit log
    await db.query(`
      INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
      VALUES ($1, 'SETTINGS_CHANGE', 'bi_dashboards', $2, $3, $4, $5, $6)
    `, [
      req.adminUser?.username || 'admin',
      id,
      JSON.stringify({ action: 'DELETE_DASHBOARD', title: checkRes.rows[0].title }),
      req.ip,
      req.adminRole,
      req.headers['user-agent']
    ]).catch(err => console.error('BI Log fail:', err.message));

    res.json({ success: true, message: 'Dashboard deleted successfully' });
  } catch (err) {
    console.error('[BI API] Delete dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete dashboard' });
  }
});

// 3. Widget CRUD Routes
// Add widget to dashboard
router.post('/dashboards/:id/widgets', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, metric, query_config, layout_config = '{}' } = req.body;

    if (!title || !type || !metric || !query_config) {
      return res.status(400).json({ success: false, error: 'Missing required widget configuration fields' });
    }

    const checkDash = await db.query('SELECT id FROM public.bi_dashboards WHERE id = $1', [id]);
    if (checkDash.rows.length === 0) return res.status(404).json({ success: false, error: 'Dashboard not found' });

    const query = `
      INSERT INTO public.bi_widgets (dashboard_id, title, type, metric, query_config, layout_config)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const { rows } = await db.query(query, [
      id,
      title,
      type,
      metric,
      JSON.stringify(query_config),
      JSON.stringify(layout_config)
    ]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[BI API] Add widget error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to add widget' });
  }
});

// Edit widget
router.put('/dashboards/:id/widgets/:widgetId', async (req, res) => {
  try {
    const { id, widgetId } = req.params;
    const { title, type, metric, query_config, layout_config } = req.body;

    const checkWidget = await db.query(
      'SELECT id FROM public.bi_widgets WHERE id = $1 AND dashboard_id = $2',
      [widgetId, id]
    );
    if (checkWidget.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Widget not found on this dashboard' });
    }

    let query = 'UPDATE public.bi_widgets SET updated_at = NOW()';
    const params = [widgetId];
    const updates = [];

    if (title !== undefined) {
      params.push(title);
      updates.push(`title = $${params.length}`);
    }
    if (type !== undefined) {
      params.push(type);
      updates.push(`type = $${params.length}`);
    }
    if (metric !== undefined) {
      params.push(metric);
      updates.push(`metric = $${params.length}`);
    }
    if (query_config !== undefined) {
      params.push(JSON.stringify(query_config));
      updates.push(`query_config = $${params.length}`);
    }
    if (layout_config !== undefined) {
      params.push(JSON.stringify(layout_config));
      updates.push(`layout_config = $${params.length}`);
    }

    query += ', ' + updates.join(', ') + ' WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, params);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[BI API] Edit widget error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update widget' });
  }
});

// Delete widget
router.delete('/dashboards/:id/widgets/:widgetId', async (req, res) => {
  try {
    const { id, widgetId } = req.params;
    const checkWidget = await db.query(
      'SELECT id FROM public.bi_widgets WHERE id = $1 AND dashboard_id = $2',
      [widgetId, id]
    );
    if (checkWidget.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Widget not found on this dashboard' });
    }

    await db.query('DELETE FROM public.bi_widgets WHERE id = $1', [widgetId]);
    res.json({ success: true, message: 'Widget deleted successfully' });
  } catch (err) {
    console.error('[BI API] Delete widget error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to delete widget' });
  }
});

// 4. Widget Query Preview
router.post('/widgets/preview', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config || !config.metric) {
      return res.status(400).json({ success: false, error: 'Widget query config and metric are required' });
    }

    const data = await biService.runDynamicWidgetQuery(req, config);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BI API] Widget preview error:', err.message);
    res.status(400).json({ success: false, error: err.message || 'Failed to run widget preview' });
  }
});

module.exports = router;

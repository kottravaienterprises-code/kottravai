const express = require('express');
const router = express.Router();
const db = require('../db');

// Map roles to permission arrays
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: ["leads:read", "leads:write", "users:manage", "exports:run", "audit:read", "security:manage"],
  MANAGER: ["leads:read", "leads:write", "team:manage", "exports:run", "audit:read"],
  REPRESENTATIVE: ["leads:read", "leads:write:own"],
  AUDITOR: ["leads:read", "audit:read", "security:read"]
};

// Middleware to restrict access to specific roles
const requireRoles = (roles) => {
  return (req, res, next) => {
    if (!req.adminRole || !roles.includes(req.adminRole)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges.' });
    }
    next();
  };
};

// 1. GET /api/admin/security/permissions
router.get('/permissions', (req, res) => {
  const role = req.adminRole || 'REPRESENTATIVE';
  const teamScope = req.adminUser?.team || 'Domestic';
  const permissions = ROLE_PERMISSIONS[role] || [];
  
  res.json({
    success: true,
    data: {
      role,
      permissions,
      teamScope
    }
  });
});

// 2. GET /api/admin/security/audit-logs (Auditors and Super Admins only)
router.get('/audit-logs', requireRoles(['SUPER_ADMIN', 'AUDITOR']), async (req, res) => {
  try {
    const { action, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT id, admin_id, role, action, resource, resource_id, metadata, ip_address, user_agent, created_at
      FROM public.admin_audit_logs
    `;
    const params = [];
    const conditions = [];

    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(admin_id ILIKE $${params.length} OR resource ILIKE $${params.length} OR action ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    // Get logs count for pagination
    let countQuery = `SELECT COUNT(*) FROM public.admin_audit_logs`;
    const countParams = [];
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.map((c, i) => c.replace(/\$\d+/g, () => `$${i + 1}`)).join(' AND ');
      countParams.push(...params.slice(0, params.length - 2));
    }

    const [logsRes, countRes] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    res.json({
      success: true,
      data: {
        logs: logsRes.rows,
        total: parseInt(countRes.rows[0].count, 10)
      }
    });
  } catch (error) {
    console.error('[Security API] Audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve audit logs.' });
  }
});

// 3. GET /api/admin/security/compliance-summary
router.get('/compliance-summary', requireRoles(['SUPER_ADMIN', 'AUDITOR']), async (req, res) => {
  try {
    const qStats = `
      SELECT
        COUNT(*) as total_logs,
        COUNT(*) FILTER (WHERE action = 'EXPORT') as export_count,
        COUNT(*) FILTER (WHERE action = 'SECURITY_VIOLATION') as violation_count,
        COUNT(*) FILTER (WHERE action = 'ROLE_CHANGE') as role_change_count
      FROM public.admin_audit_logs
    `;

    const qActionDistribution = `
      SELECT action, COUNT(*) as count
      FROM public.admin_audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT 8
    `;

    const qViolations = `
      SELECT admin_id, resource, resource_id, metadata, ip_address, created_at
      FROM public.admin_audit_logs
      WHERE action = 'SECURITY_VIOLATION'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const [statsRes, distRes, violationsRes] = await Promise.all([
      db.query(qStats),
      db.query(qActionDistribution),
      db.query(qViolations)
    ]);

    res.json({
      success: true,
      data: {
        stats: statsRes.rows[0],
        actionDistribution: distRes.rows,
        recentViolations: violationsRes.rows
      }
    });
  } catch (error) {
    console.error('[Security API] Compliance summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to build compliance summary.' });
  }
});

// 4. GET /api/admin/security/users (Super Admins and Managers)
router.get('/users', requireRoles(['SUPER_ADMIN', 'MANAGER']), async (req, res) => {
  try {
    let query = `
      SELECT id, username, mobile, full_name, role, team, created_at 
      FROM public.users
    `;
    const params = [];
    
    // Managers can only list users inside their team
    if (req.adminRole === 'MANAGER') {
      query += ` WHERE team = $1`;
      params.push(req.adminUser.team || 'Domestic');
    }

    query += ` ORDER BY created_at DESC`;
    const { rows } = await db.query(query, params);

    res.json({
      success: true,
      data: {
        users: rows
      }
    });
  } catch (error) {
    console.error('[Security API] List users error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve user list.' });
  }
});

// 5. PATCH /api/admin/security/users/:id/role (Super Admins only)
router.patch('/users/:id/role', requireRoles(['SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, team } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required.' });
    }

    // Verify user exists
    const userCheck = await db.query('SELECT id, username, role, team FROM public.users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    const oldUser = userCheck.rows[0];

    const updateRes = await db.query(`
      UPDATE public.users
      SET role = $1, team = $2
      WHERE id = $3
      RETURNING id, username, full_name, role, team
    `, [role, team || null, id]);

    const updatedUser = updateRes.rows[0];

    // Log the change
    await db.query(`
      INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      req.adminUser?.id || 'master_admin',
      'ROLE_CHANGE',
      'users',
      id,
      JSON.stringify({
        username: oldUser.username,
        old_role: oldUser.role,
        new_role: role,
        old_team: oldUser.team,
        new_team: team || null
      }),
      req.ip,
      req.adminRole,
      req.headers['user-agent'] || 'N/A'
    ]).catch(err => console.error('Failed to log role change audit:', err.message));

    res.json({
      success: true,
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('[Security API] Update role error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update user role.' });
  }
});

module.exports = router;

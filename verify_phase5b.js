const express = require('express');
const axios = require('axios');
const path = require('path');
const db = require('./server/db');

// Resolve .env
require('dotenv').config({ path: path.resolve(__dirname, 'server', '.env') });

const app = express();
app.use(express.json());

// Helper functions (copied from server/index.js for testing)
const logSecurityViolation = async (adminId, role, action, resource, ipAddress, userAgent) => {
    try {
        await db.query(`
            INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            adminId || 'unauthenticated',
            'SECURITY_VIOLATION',
            resource || 'api',
            action || 'UNAUTHORIZED_ACCESS',
            JSON.stringify({ violation: true, timestamp: new Date().toISOString() }),
            ipAddress || '127.0.0.1',
            role || 'NONE',
            userAgent || 'N/A'
        ]);
    } catch (err) {
        console.error('Failed to log security violation:', err.message);
    }
};

const checkLeadAccess = async (req, leadId) => {
    if (req.adminRole === 'SUPER_ADMIN') return { allowed: true };

    const leadRes = await db.query(
        'SELECT assigned_to, team FROM public.leads WHERE id = $1',
        [leadId]
    );
    if (leadRes.rows.length === 0) return { allowed: false, status: 404, error: 'Lead not found' };

    const lead = leadRes.rows[0];

    if (req.adminRole === 'AUDITOR') {
        if (req.method !== 'GET') {
            return { allowed: false, status: 403, error: 'Auditor has read-only access' };
        }
        return { allowed: true };
    }

    if (req.adminRole === 'REPRESENTATIVE') {
        if (lead.assigned_to === null || lead.assigned_to === req.adminUser.id) {
            return { allowed: true };
        }
        return { allowed: false, status: 403, error: 'Forbidden: You do not own this lead' };
    }

    if (req.adminRole === 'MANAGER') {
        if (lead.assigned_to === null || lead.team === req.adminUser.team) {
            return { allowed: true };
        }
        return { allowed: false, status: 403, error: 'Forbidden: Lead belongs to another team' };
    }

    return { allowed: false, status: 403, error: 'Unauthorized role' };
};

// Mock Auth middleware that accepts custom header for testing role scenarios
const mockAuthenticateAdmin = (req, res, next) => {
    const role = req.headers['x-test-role'] || 'REPRESENTATIVE';
    const userId = req.headers['x-test-user-id'] || 'test_user_id';
    const team = req.headers['x-test-team'] || 'APAC';

    req.adminRole = role;
    req.adminUser = {
        id: userId,
        username: `user_${role.toLowerCase()}`,
        role: role,
        team: team
    };

    if (role === 'AUDITOR' && req.method !== 'GET') {
        return res.status(403).json({ error: 'Auditor has read-only access' });
    }
    next();
};

// 1. GET /api/admin/leads (leads list with visibility filtering)
app.get('/api/admin/leads', mockAuthenticateAdmin, async (req, res) => {
    try {
        let sql = `SELECT id, name, assigned_to, team FROM public.leads`;
        const params = [];
        
        if (req.adminRole === 'REPRESENTATIVE') {
            sql += ` WHERE assigned_to = $1 OR assigned_to IS NULL`;
            params.push(req.adminUser.id);
        } else if (req.adminRole === 'MANAGER') {
            sql += ` WHERE team = $1 OR assigned_to IS NULL`;
            params.push(req.adminUser.team || 'APAC');
        }
        
        sql += ` ORDER BY created_at DESC`;
        const result = await db.query(sql, params);
        res.json({ success: true, leads: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. PATCH /api/admin/leads/:id (lead updates with checkLeadAccess)
app.patch('/api/admin/leads/:id', mockAuthenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const access = await checkLeadAccess(req, id);
        if (!access.allowed) {
            return res.status(access.status || 403).json({ success: false, error: access.error });
        }

        // Simulating DB write
        res.json({ success: true, message: 'Lead updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. GET /api/admin/leads/export (governed lead downloads)
app.get('/api/admin/leads/export', mockAuthenticateAdmin, async (req, res) => {
    try {
        if (req.adminRole === 'REPRESENTATIVE') {
            await logSecurityViolation(req.adminUser?.id, req.adminRole, 'EXPORT_BLOCKED', 'leads', req.ip, req.headers['user-agent']);
            return res.status(403).json({ error: 'Exports are disabled for representatives' });
        }

        let sql = `SELECT id, name, assigned_to, team FROM public.leads`;
        const params = [];

        if (req.adminRole === 'MANAGER') {
            sql += ` WHERE team = $1 OR team IS NULL`;
            params.push(req.adminUser.team || 'APAC');
        }

        const result = await db.query(sql, params);
        const leads = result.rows || [];

        // Log export action to immutable audit logs
        await db.query(`
            INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address, role, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            req.adminUser?.id || 'unknown_admin',
            'EXPORT',
            'leads',
            'all',
            JSON.stringify({ format: 'csv', count: leads.length, filterTeam: req.adminUser.team || null }),
            req.ip,
            req.adminRole,
            req.headers['user-agent'] || 'N/A'
        ]);

        res.json({ success: true, message: 'CSV Export successful', count: leads.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Register security routes
app.use('/api/admin/security', mockAuthenticateAdmin, require('./server/routes/securityRoutes'));

const PORT = 4997;
let server;

async function run() {
    console.log("==================================================");
    console.log("PHASE 5B ENTERPRISE SECURITY RUNTIME VERIFICATION");
    console.log("==================================================");

    try {
        // Seed test CRM Users
        console.log("\n--- 1. Seeding test crm users & leads ---");
        const rep1Id = '44444444-4444-4444-4444-444444444444';
        const rep2Id = '55555555-5555-5555-5555-555555555555';
        const managerId = '66666666-6666-6666-6666-666666666666';

        // Clean up prior runs
        await db.query('DELETE FROM public.users WHERE id IN ($1, $2, $3)', [rep1Id, rep2Id, managerId]);

        await db.query(`
            INSERT INTO public.users (id, username, password, mobile, full_name, role, team)
            VALUES 
                ($1, 'agent_apac_1', 'pass123', '9000000001', 'Agent APAC 1', 'REPRESENTATIVE', 'APAC'),
                ($2, 'agent_apac_2', 'pass123', '9000000002', 'Agent APAC 2', 'REPRESENTATIVE', 'APAC'),
                ($3, 'manager_apac', 'pass123', '9000000003', 'Manager APAC', 'MANAGER', 'APAC')
        `, [rep1Id, rep2Id, managerId]);

        console.log("✅ Seeded crm users with roles: REPRESENTATIVE (APAC), MANAGER (APAC).");

        // Seed test leads
        const lead1Id = '77777777-7777-7777-7777-777777777777';
        const lead2Id = '88888888-8888-8888-8888-888888888888';
        const lead3Id = '99999999-9999-9999-9999-999999999999';

        await db.query('DELETE FROM public.leads WHERE id IN ($1, $2, $3)', [lead1Id, lead2Id, lead3Id]);

        await db.query(`
            INSERT INTO public.leads (id, name, email, assigned_to, team, sales_stage)
            VALUES 
                ($1, 'APAC Lead Owned by Agent 1', 'lead1@apac.com', $4, 'APAC', 'New Lead'),
                ($2, 'APAC Lead Owned by Agent 2', 'lead2@apac.com', $5, 'APAC', 'New Lead'),
                ($3, 'Unassigned EMEA Lead', 'lead3@emea.com', NULL, 'EMEA', 'New Lead')
        `, [lead1Id, lead2Id, lead3Id, rep1Id, rep2Id]);

        console.log("✅ Seeded leads: Lead 1 (assigned to Agent 1), Lead 2 (assigned to Agent 2), Lead 3 (unassigned).");

        server = app.listen(PORT, async () => {
            console.log(`\nTest security server running on port ${PORT}`);

            try {
                // A. Test Lead Visibility (REPRESENTATIVE)
                console.log("\n--- A. Testing Lead Visibility: REPRESENTATIVE ---");
                // Agent 1 should only see Lead 1 (their own) and Lead 3 (unassigned), NOT Lead 2 (owned by Agent 2)
                const rep1Leads = await axios.get(`http://localhost:${PORT}/api/admin/leads`, {
                    headers: { 'x-test-role': 'REPRESENTATIVE', 'x-test-user-id': rep1Id, 'x-test-team': 'APAC' }
                });
                const rep1LeadNames = rep1Leads.data.leads.map(l => l.name);
                console.log("Agent 1 Visible Leads:", rep1LeadNames);
                const hasLead2 = rep1LeadNames.includes('APAC Lead Owned by Agent 2');
                console.log("✅ Check (Should NOT include Lead 2):", !hasLead2 ? 'SUCCESS' : 'FAILED');

                // B. Test Lead Visibility (MANAGER)
                console.log("\n--- B. Testing Lead Visibility: MANAGER ---");
                // Manager should see all APAC team leads (Lead 1 and Lead 2) and unassigned leads, but let's test team scoping
                const managerLeads = await axios.get(`http://localhost:${PORT}/api/admin/leads`, {
                    headers: { 'x-test-role': 'MANAGER', 'x-test-user-id': managerId, 'x-test-team': 'APAC' }
                });
                const managerLeadNames = managerLeads.data.leads.map(l => l.name);
                console.log("Manager Visible Leads:", managerLeadNames);
                console.log("✅ Check (Should include Lead 1 and Lead 2):", 
                    (managerLeadNames.includes('APAC Lead Owned by Agent 1') && managerLeadNames.includes('APAC Lead Owned by Agent 2')) ? 'SUCCESS' : 'FAILED'
                );

                // C. Test Lead Visibility Block (REPRESENTATIVE accessing other's lead)
                console.log("\n--- C. Testing Access Block: REPRESENTATIVE PATCH on other's lead ---");
                try {
                    await axios.patch(`http://localhost:${PORT}/api/admin/leads/${lead2Id}`, { sales_stage: 'Qualified' }, {
                        headers: { 'x-test-role': 'REPRESENTATIVE', 'x-test-user-id': rep1Id, 'x-test-team': 'APAC' }
                    });
                    console.log("❌ FAILED: Agent 1 was allowed to modify Agent 2's lead.");
                } catch (err) {
                    console.log("✅ SUCCESS: Modify blocked. Server returned status:", err.response?.status, "Error:", err.response?.data?.error);
                }

                // D. Test Auditor Read-Only Block
                console.log("\n--- D. Testing Auditor Block: AUDITOR write attempt ---");
                try {
                    await axios.patch(`http://localhost:${PORT}/api/admin/leads/${lead1Id}`, { sales_stage: 'Qualified' }, {
                        headers: { 'x-test-role': 'AUDITOR', 'x-test-user-id': 'auditor_id', 'x-test-team': 'Global' }
                    });
                    console.log("❌ FAILED: Auditor allowed to perform PATCH write operation.");
                } catch (err) {
                    console.log("✅ SUCCESS: Write blocked. Server returned status:", err.response?.status, "Error:", err.response?.data?.error);
                }

                // E. Test Export Governance
                console.log("\n--- E. Testing Export Governance & Auditing ---");
                // 1. Agent export should be blocked
                try {
                    await axios.get(`http://localhost:${PORT}/api/admin/leads/export`, {
                        headers: { 'x-test-role': 'REPRESENTATIVE', 'x-test-user-id': rep1Id, 'x-test-team': 'APAC' }
                    });
                    console.log("❌ FAILED: Agent allowed to run export.");
                } catch (err) {
                    console.log("✅ SUCCESS: Agent export blocked. Server returned status:", err.response?.status, "Error:", err.response?.data?.error);
                }

                // 2. Manager export should succeed and log
                const managerExport = await axios.get(`http://localhost:${PORT}/api/admin/leads/export`, {
                    headers: { 'x-test-role': 'MANAGER', 'x-test-user-id': managerId, 'x-test-team': 'APAC' }
                });
                console.log("✅ Manager Export Succeeded:", managerExport.data.message, "Row Count:", managerExport.data.count);

                // F. Test Audit Log Immutability
                console.log("\n--- F. Testing Hardening: Audit Log Immutability ---");
                const logsCheck = await db.query("SELECT id FROM public.admin_audit_logs ORDER BY created_at DESC LIMIT 1");
                const logId = logsCheck.rows[0].id;
                console.log("Found recent log row ID:", logId);
                
                // Attempt to update log row
                await db.query("UPDATE public.admin_audit_logs SET action = 'MALICIOUS_TAMPER' WHERE id = $1", [logId]);
                const verifyUpdate = await db.query("SELECT action FROM public.admin_audit_logs WHERE id = $1", [logId]);
                console.log("Log action after UPDATE attempt (Expected unchanged):", verifyUpdate.rows[0].action);
                console.log("✅ Check (Update blocked):", verifyUpdate.rows[0].action !== 'MALICIOUS_TAMPER' ? 'SUCCESS' : 'FAILED');

                // Attempt to delete log row
                await db.query("DELETE FROM public.admin_audit_logs WHERE id = $1", [logId]);
                const verifyDelete = await db.query("SELECT COUNT(*) FROM public.admin_audit_logs WHERE id = $1", [logId]);
                console.log("Log row count after DELETE attempt (Expected 1):", verifyDelete.rows[0].count);
                console.log("✅ Check (Delete blocked):", parseInt(verifyDelete.rows[0].count, 10) === 1 ? 'SUCCESS' : 'FAILED');

                // G. Verify Security Endpoints
                console.log("\n--- G. Verifying Security & Compliance Endpoints ---");
                const permissionsRes = await axios.get(`http://localhost:${PORT}/api/admin/security/permissions`, {
                    headers: { 'x-test-role': 'SUPER_ADMIN', 'x-test-user-id': 'admin_id' }
                });
                console.log("✅ GET /security/permissions payload:", JSON.stringify(permissionsRes.data.data, null, 2));

                const auditLogsRes = await axios.get(`http://localhost:${PORT}/api/admin/security/audit-logs`, {
                    headers: { 'x-test-role': 'SUPER_ADMIN', 'x-test-user-id': 'admin_id' }
                });
                console.log("✅ GET /security/audit-logs payload size:", auditLogsRes.data.data.logs.length, "total logs count:", auditLogsRes.data.data.total);

                const complianceSummaryRes = await axios.get(`http://localhost:${PORT}/api/admin/security/compliance-summary`, {
                    headers: { 'x-test-role': 'SUPER_ADMIN', 'x-test-user-id': 'admin_id' }
                });
                console.log("✅ GET /security/compliance-summary stats:", JSON.stringify(complianceSummaryRes.data.data.stats, null, 2));

                // CLEAN UP SEEDED TEST DATA
                await db.query('DELETE FROM public.users WHERE id IN ($1, $2, $3)', [rep1Id, rep2Id, managerId]);
                await db.query('DELETE FROM public.leads WHERE id IN ($1, $2, $3)', [lead1Id, lead2Id, lead3Id]);
                console.log("\nCleaned up seeded database test records.");
                console.log("\n==================================================");
                console.log("PHASE 5B RUNTIME VERIFICATION COMPLETE");
                console.log("==================================================");

            } catch (err) {
                console.error("E2E testing error:", err.message);
            } finally {
                server.close(() => {
                    console.log("Test server stopped.");
                    process.exit(0);
                });
            }
        });

    } catch (err) {
        console.error("Test initialization error:", err.message);
        process.exit(1);
    }
}

run();

const eventService = require('../services/eventService');
const db = require('../db');
const { Parser } = require('json2csv');

/**
 * Handle POST /api/events/register
 */
const registerEvent = async (req, res) => {
    try {
        const registration = await eventService.registerForEvent(req.body);
        
        // TODO: Phase 5 & 6 (Google Sheets & Email) will be triggered here non-blocking.
        // We will implement them in the subsequent phases.

        return res.status(201).json({
            success: true,
            registrationId: registration.id,
            message: "Registration successful"
        });
        
    } catch (error) {
        if (error.code === 'VALIDATION_ERROR') {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: error.message
            });
        }
        
        if (error.code === 'ALREADY_REGISTERED') {
            return res.status(409).json({
                success: false,
                code: "ALREADY_REGISTERED",
                message: error.message
            });
        }

        // Do not expose database errors or stack traces to the frontend
        console.error('❌ [EVENT REGISTRATION] Server error:', error.message);
        return res.status(500).json({
            success: false,
            code: "REGISTRATION_FAILED",
            message: "Unable to complete registration."
        });
    }
};

/**
 * Handle GET /api/admin/events/registrations
 * Authenticated Admin Route
 */
const getRegistrations = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 25,
            search = '',
            event_slug = '',
            status = ''
        } = req.query;

        const offset = (page - 1) * limit;
        
        let whereClauses = [];
        let params = [];
        let paramCount = 1;

        if (event_slug) {
            whereClauses.push(`event_slug = $${paramCount++}`);
            params.push(event_slug);
        }

        if (status) {
            whereClauses.push(`status = $${paramCount++}`);
            params.push(status);
        }

        if (search) {
            whereClauses.push(`(full_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR organization ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) FROM event_registrations ${whereString}`;
        const dataQuery = `
            SELECT id, event_slug, full_name, email, phone, organization, status, created_at 
            FROM event_registrations 
            ${whereString} 
            ORDER BY created_at DESC 
            LIMIT $${paramCount++} OFFSET $${paramCount}
        `;

        const [countResult, dataResult] = await Promise.all([
            db.query(countQuery, params),
            db.query(dataQuery, [...params, limit, offset])
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);

        // Sanitize the response (remove internal UUID if not explicitly requested, though requirements said "do not expose unless needed", let's keep it out of the UI, but send it to frontend just in case for React keys, wait, no, requirements: "Do NOT display the internal database UUID unless specifically needed". React needs a key, we'll send it but not show it in UI, or just use email as key. I'll send it but frontend won't show it).
        // The requirement said: "Do NOT display the internal database UUID unless it is specifically needed for internal debugging".
        
        return res.status(200).json({
            success: true,
            registrations: dataResult.rows,
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages
        });
    } catch (error) {
        console.error('❌ [ADMIN EVENTS] Error fetching registrations:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Handle GET /api/admin/events/registrations/export
 * Authenticated Admin Route
 */
const exportRegistrations = async (req, res) => {
    try {
        const {
            search = '',
            event_slug = '',
            status = ''
        } = req.query;
        
        let whereClauses = [];
        let params = [];
        let paramCount = 1;

        if (event_slug) {
            whereClauses.push(`event_slug = $${paramCount++}`);
            params.push(event_slug);
        }

        if (status) {
            whereClauses.push(`status = $${paramCount++}`);
            params.push(status);
        }

        if (search) {
            whereClauses.push(`(full_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR phone ILIKE $${paramCount} OR organization ILIKE $${paramCount})`);
            params.push(`%${search}%`);
            paramCount++;
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const dataQuery = `
            SELECT full_name as "Full Name", email as "Email", phone as "Phone", 
                   organization as "Organization", event_slug as "Event", 
                   status as "Status", created_at as "Registered Date"
            FROM event_registrations 
            ${whereString} 
            ORDER BY created_at DESC 
        `;

        const { rows } = await db.query(dataQuery, params);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "No registrations found to export." });
        }

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(rows);

        res.setHeader('Content-Type', 'text/csv');
        const filename = event_slug ? `${event_slug}-registrations.csv` : 'event-registrations.csv';
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        
        return res.status(200).send(csv);

    } catch (error) {
        console.error('❌ [ADMIN EVENTS EXPORT] Error exporting registrations:', error.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

module.exports = {
    registerEvent,
    getRegistrations,
    exportRegistrations
};

const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const eventBus = require('../services/eventBus');

const router = express.Router();

// Middleware: API Key Auth & HMAC Validation
const authenticateAPI = async (req, res, next) => {
    const apiKey = req.header('x-api-key');
    const signature = req.header('x-signature');
    const timestamp = req.header('x-timestamp');

    if (!apiKey) return res.status(401).json({ success: false, error: "Missing x-api-key header" });

    try {
        const { rows } = await db.query(`SELECT * FROM public.api_keys WHERE api_key_hash = $1 AND status = 'ACTIVE'`, [apiKey]);
        if (rows.length === 0) return res.status(401).json({ success: false, error: "Invalid API Key" });

        const consumer = rows[0];

        // Rate Limiting Check (Simple DB implementation for now)
        const recentRequests = await db.query(`
            SELECT count(*) FROM public.api_audit_logs 
            WHERE consumer_name = $1 AND created_at > NOW() - INTERVAL '1 minute'
        `, [consumer.consumer_name]);
        
        if (parseInt(recentRequests.rows[0].count) >= consumer.rate_limit_per_min) {
            return res.status(429).json({ success: false, error: "Rate limit exceeded" });
        }

        // Validate HMAC Signature if present
        if (signature && timestamp) {
            const timeDiff = Math.abs(Date.now() - parseInt(timestamp));
            if (timeDiff > 5 * 60 * 1000) return res.status(401).json({ success: false, error: "Timestamp expired" });

            const payload = req.method === 'GET' ? req.originalUrl : JSON.stringify(req.body);
            const expectedSig = crypto.createHmac('sha256', consumer.hmac_secret)
                                      .update(timestamp + '.' + payload)
                                      .digest('hex');
                                      
            if (expectedSig !== signature) return res.status(401).json({ success: false, error: "Invalid HMAC signature" });
        }

        req.apiConsumer = consumer;
        next();
    } catch (err) {
        console.error("Auth middleware error", err);
        res.status(500).json({ success: false, error: "Internal Auth Error" });
    }
};

// Middleware: Audit Logging
const auditAPICall = (req, res, next) => {
    const start = Date.now();
    res.on('finish', async () => {
        if (!req.apiConsumer) return;
        try {
            await db.query(`
                INSERT INTO public.api_audit_logs 
                (consumer_name, endpoint, method, status_code, ip_address, response_time_ms)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                req.apiConsumer.consumer_name,
                req.originalUrl,
                req.method,
                res.statusCode,
                req.ip || '127.0.0.1',
                Date.now() - start
            ]);
        } catch (e) {
            console.error("API Audit log failed", e);
        }
    });
    next();
};

router.use(authenticateAPI);
router.use(auditAPICall);

// Endpoints

router.get('/revenue/forecast', async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT unified_forecast, snapshot_date 
            FROM public.revenue_snapshots 
            ORDER BY snapshot_date DESC LIMIT 1
        `);
        res.json({ success: true, data: rows[0] || {} });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/events', async (req, res) => {
    try {
        const eventId = await eventBus.publish({
            eventType: req.body.eventType,
            source: req.apiConsumer.consumer_name,
            tenantId: req.body.tenantId,
            payload: req.body.payload
        });
        res.json({ success: true, eventId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/events/replay', async (req, res) => {
    // DLQ Replay Endpoint
    try {
        const result = await eventBus.replayDeadLetterEvents();
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;

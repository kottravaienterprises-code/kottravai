const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.provider = process.env.EVENT_BUS_PROVIDER || 'POSTGRES'; // Fallback default
        this.subscriptions = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        if (this.provider === 'POSTGRES') {
            await this._initPostgresListener();
        }
        this.initialized = true;
    }

    async _initPostgresListener() {
        // Postgres LISTEN/NOTIFY is set up using the existing db pool
        const client = await db.pool.connect();
        try {
            await client.query('LISTEN kottravai_events');
            client.on('notification', (msg) => {
                if (msg.channel === 'kottravai_events') {
                    console.log('[EventBus] Received Postgres notification');
                    try {
                        const event = JSON.parse(msg.payload);
                        this._routeEvent(event);
                    } catch (e) {
                        console.error('[EventBus] Failed to parse Postgres notification', e);
                    }
                }
            });
            console.log('📡 [EventBus] PostgreSQL LISTEN/NOTIFY initialized');
        } catch (err) {
            console.error('Failed to init Postgres listener', err);
            client.release();
        }
    }

    /**
     * Subscribe to an event type.
     * @param {string} eventType 
     * @param {function} handler 
     */
    subscribe(eventType, handler) {
        if (!this.subscriptions.has(eventType)) {
            this.subscriptions.set(eventType, []);
        }
        this.subscriptions.get(eventType).push(handler);
        console.log(`[EventBus] Subscribed to ${eventType}`);
    }

    /**
     * Publish an event to the bus.
     * @param {object} event 
     * { eventType, source, tenantId, payload }
     */
    async publish(eventData) {
        const event = {
            eventId: uuidv4(),
            timestamp: new Date().toISOString(),
            ...eventData
        };

        // 1. Audit Log the Publish (Idempotency Check)
        const isDuplicate = await this._auditLog(event, 'PUBLISHED');
        if (isDuplicate) {
            console.log(`[EventBus] Idempotency Hit: Event ${event.eventId} already exists, skipping.`);
            return event.eventId;
        }

        // 2. Dispatch via provider
        try {
            if (this.provider === 'POSTGRES') {
                await db.query(`SELECT pg_notify('kottravai_events', $1)`, [JSON.stringify(event)]);
            } else {
                // Redis implementation stub
                // await redis.xadd('kottravai_stream', '*', 'event', JSON.stringify(event));
                console.warn(`[EventBus] Provider ${this.provider} not fully implemented, falling back to local emit`);
                this._routeEvent(event);
            }
            return event.eventId;
        } catch (err) {
            console.error(`[EventBus] Publish failed for ${event.eventId}`, err);
            await this._auditLog(event, 'FAILED', err.message);
            throw err;
        }
    }

    async _routeEvent(event) {
        const handlers = this.subscriptions.get(event.eventType) || [];
        for (const handler of handlers) {
            this._executeWithRetry(event, handler);
        }
    }

    async _executeWithRetry(event, handler, attempt = 1, maxRetries = 3) {
        try {
            await handler(event);
            await this._updateAuditStatus(event.eventId, 'PROCESSED', attempt);
        } catch (err) {
            console.error(`[EventBus] Handler failed for ${event.eventType} (Attempt ${attempt}/${maxRetries}):`, err.message);
            if (attempt < maxRetries) {
                // Exponential backoff
                const delay = Math.pow(2, attempt) * 1000;
                setTimeout(() => this._executeWithRetry(event, handler, attempt + 1, maxRetries), delay);
            } else {
                console.error(`[EventBus] Event ${event.eventId} sent to DLQ`);
                await this._updateAuditStatus(event.eventId, 'DEAD_LETTER', attempt, err.message);
            }
        }
    }

    async _auditLog(event, status, errorMsg = null) {
        try {
            const { rowCount } = await db.query(`
                INSERT INTO public.event_audit_logs 
                (event_id, event_type, source, tenant_id, payload, status, error_message)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (event_id) DO NOTHING
            `, [
                event.eventId,
                event.eventType,
                event.source,
                event.tenantId,
                JSON.stringify(event.payload || {}),
                status,
                errorMsg
            ]);
            // If rowCount is 0, it means the event already exists (duplicate)
            return rowCount === 0;
        } catch (err) {
            console.error('[EventBus] Failed to write audit log:', err);
            return false;
        }
    }

    async _updateAuditStatus(eventId, status, retryCount, errorMsg = null) {
        try {
            await db.query(`
                UPDATE public.event_audit_logs 
                SET status = $1, retry_count = $2, error_message = COALESCE($3, error_message)
                WHERE event_id = $4
            `, [status, retryCount, errorMsg, eventId]);
        } catch (err) {
            console.error('[EventBus] Failed to update audit status:', err);
        }
    }

    async getMetrics() {
        const { rows } = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM public.event_audit_logs 
            GROUP BY status
        `);
        return rows;
    }

    /**
     * Replays DEAD_LETTER events by resetting their status and re-routing them.
     */
    async replayDeadLetterEvents() {
        console.log('[EventBus] Replaying DEAD_LETTER events...');
        const { rows } = await db.query(`
            SELECT event_id, event_type, source, tenant_id, payload
            FROM public.event_audit_logs
            WHERE status = 'DEAD_LETTER'
        `);

        for (const row of rows) {
            const event = {
                eventId: row.event_id,
                eventType: row.event_type,
                source: row.source,
                tenantId: row.tenant_id,
                payload: row.payload
            };
            
            // Reset status to RETRYING
            await this._updateAuditStatus(event.eventId, 'RETRYING', 0, 'Replayed from DLQ');
            
            // Re-route locally (since it's already in the DB)
            this._routeEvent(event);
        }

        return { replayedCount: rows.length };
    }
}

module.exports = new EventBus();

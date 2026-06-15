const db = require('../db');
const crypto = require('crypto');
const axios = require('axios');
const eventBus = require('./eventBus');

class WebhookService {
    constructor() {
        // Initialize dynamic listeners for the eventBus
        this._initDynamicListeners();
    }

    async _initDynamicListeners() {
        // Since we want to send webhooks for events, we can either subscribe to a wildcard 
        // or poll subscriptions and listen dynamically.
        // For simplicity, we hook into EventBus directly by wrapping _routeEvent or listening to specific high-level events.
        
        const coreEvents = [
            'DEAL_WON', 'DEAL_LOST', 'INVOICE_GENERATED', 'PAYMENT_RECEIVED', 
            'PAYMENT_FAILED', 'SUBSCRIPTION_RENEWED', 'SUBSCRIPTION_CANCELLED', 
            'CHURN_RISK_DETECTED', 'EXPANSION_SIGNAL_DETECTED', 'ANOMALY_DETECTED', 
            'APPROVAL_REQUIRED', 'APPROVAL_COMPLETED', 'WORKFLOW_EXECUTED'
        ];

        coreEvents.forEach(eventType => {
            eventBus.subscribe(eventType, async (event) => {
                await this.dispatchToSubscribers(event);
            });
        });
    }

    async dispatchToSubscribers(event) {
        // Find subscriptions for this event type
        try {
            const { rows: subscriptions } = await db.query(`
                SELECT * FROM public.webhook_subscriptions 
                WHERE status = 'ACTIVE' 
                AND event_types @> $1::jsonb
            `, [JSON.stringify([event.eventType])]);

            for (const sub of subscriptions) {
                // Log delivery attempt
                const { rows: logRows } = await db.query(`
                    INSERT INTO public.webhook_delivery_logs 
                    (webhook_id, event_id, payload, status)
                    VALUES ($1, $2, $3, 'PENDING')
                    RETURNING id
                `, [sub.id, event.eventId, JSON.stringify(event)]);

                const logId = logRows[0].id;
                await this._fireWebhook(sub, event, logId, 0);
            }
        } catch (err) {
            console.error('[WebhookSvc] Failed to dispatch', err);
        }
    }

    async _fireWebhook(subscription, event, logId, retryCount) {
        const payloadStr = JSON.stringify(event);
        const timestamp = Date.now().toString();
        const signature = crypto.createHmac('sha256', subscription.hmac_secret)
                                .update(timestamp + '.' + payloadStr)
                                .digest('hex');

        try {
            const res = await axios.post(subscription.target_url, event, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-kottravai-signature': signature,
                    'x-kottravai-timestamp': timestamp
                },
                timeout: 5000
            });

            await this._updateDeliveryLog(logId, 'SUCCESS', res.status, res.data ? JSON.stringify(res.data).substring(0, 500) : null, retryCount, null);
        } catch (err) {
            const status = err.response ? err.response.status : 500;
            const body = err.response ? JSON.stringify(err.response.data).substring(0, 500) : err.message;
            
            if (retryCount < 3) {
                const nextRetry = new Date(Date.now() + Math.pow(2, retryCount) * 1000);
                await this._updateDeliveryLog(logId, 'RETRYING', status, body, retryCount, nextRetry);
                
                // Schedule retry in memory for now (in production, use a queue like bullmq)
                setTimeout(() => {
                    this._fireWebhook(subscription, event, logId, retryCount + 1);
                }, Math.pow(2, retryCount) * 1000);
            } else {
                await this._updateDeliveryLog(logId, 'FAILED', status, body, retryCount, null);
            }
        }
    }

    async _updateDeliveryLog(logId, status, responseCode, responseBody, retryCount, nextRetryAt) {
        try {
            await db.query(`
                UPDATE public.webhook_delivery_logs 
                SET status = $1, response_code = $2, response_body = $3, retry_count = $4, next_retry_at = $5
                WHERE id = $6
            `, [status, responseCode, responseBody, retryCount, nextRetryAt, logId]);
        } catch (e) {
            console.error('[WebhookSvc] Failed to update delivery log', e);
        }
    }

    async getDeliveryMetrics() {
        const { rows } = await db.query(`
            SELECT status, COUNT(*) as count 
            FROM public.webhook_delivery_logs 
            GROUP BY status
        `);
        return rows;
    }
}

module.exports = new WebhookService();

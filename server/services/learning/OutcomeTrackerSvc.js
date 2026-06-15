const db = require('../../db');
const eventBus = require('../eventBus');

class OutcomeTrackerSvc {
    constructor() {
        this._initListeners();
        // Attribution Window Configuration
        this.windows = {
            'Operational': 30, // days
            'Pricing': 90,
            'Retention': 180,
            'Contract': 365
        };
    }

    _initListeners() {
        eventBus.subscribe('DECISION_FINALIZED', async (event) => this.handleDecisionFinalized(event));
        
        // Listen to potential outcome events
        const outcomeEvents = [
            'DEAL_WON', 'DEAL_LOST', 'CUSTOMER_CHURNED', 
            'CUSTOMER_REMAINED_ACTIVE', 'INVOICE_PAID', 'PRODUCT_USAGE_INCREASED'
        ];
        
        for (const evt of outcomeEvents) {
            eventBus.subscribe(evt, async (event) => this.handleLaggingOutcome(event));
        }
    }

    async handleDecisionFinalized(event) {
        const { payload } = event;
        const tenantId = event.tenantId || 'system';
        const sagaId = payload.sagaId;
        const domain = payload.domain || 'Operational';
        
        const days = this.windows[domain] || 30;
        const windowEnd = new Date();
        windowEnd.setDate(windowEnd.getDate() + days);

        try {
            await db.query(`
                INSERT INTO public.decision_outcomes 
                (tenant_id, saga_id, domain, status, classification, attribution_window_end)
                VALUES ($1, $2, $3, 'PENDING', 'INCONCLUSIVE', $4)
                ON CONFLICT (saga_id) DO NOTHING
            `, [tenantId, sagaId, domain, windowEnd.toISOString()]);
        } catch (e) {
            console.error("[OutcomeTrackerSvc] Error creating pending outcome:", e);
        }
    }

    async handleLaggingOutcome(event) {
        const { eventType, payload, tenantId } = event;
        
        // 1. Correlation: Primary (Direct Saga) or Secondary (EKG Fallback)
        const correlation = await this._correlateEventToSaga(payload, tenantId);
        if (!correlation || !correlation.sagaId) return; // No correlating decision

        const { sagaId, method, confidence } = correlation;

        // 2. Fetch the decision outcome
        const { rows } = await db.query(`
            SELECT * FROM public.decision_outcomes 
            WHERE saga_id = $1 AND status != 'FINALIZED'
        `, [sagaId]);

        if (rows.length === 0) return; // Already finalized or doesn't exist
        const outcomeRecord = rows[0];

        // 3. Update Evidence
        const evidence = outcomeRecord.evidence || [];
        evidence.push({
            eventType,
            timestamp: new Date().toISOString(),
            payload
        });

        // 4. Aggregation and Classification Scoring
        const evaluation = this._evaluateEvidence(evidence);

        // 5. Check Early Finalization
        let newStatus = 'UNDER_EVALUATION';
        if (evaluation.classification === 'SUCCESS' || evaluation.classification === 'FAILURE') {
            newStatus = 'FINALIZED'; // Irreversible/Overwhelming evidence
        }

        // 6. Persist
        const updateResult = await db.query(`
            UPDATE public.decision_outcomes 
            SET status = $1, classification = $2, outcome_score = $3, 
                correlation_method = $4, correlation_confidence = $5, evidence = $6
            WHERE saga_id = $7
            RETURNING id
        `, [
            newStatus, 
            evaluation.classification, 
            evaluation.score, 
            method, 
            confidence, 
            JSON.stringify(evidence), 
            sagaId
        ]);
        
        console.log(`[OutcomeTrackerSvc] Correlated ${eventType} to saga ${sagaId} with method ${method} (${confidence}). Status: ${newStatus}`);

        // 7. Emit OUTCOME_FINALIZED so ReputationEngine can adjust agent scores
        if (newStatus === 'FINALIZED') {
            const outcomeId = updateResult.rows[0]?.id || null;
            eventBus.publish({
                eventType: 'OUTCOME_FINALIZED',
                tenantId,
                payload: {
                    sagaId,
                    outcomeId,
                    classification: evaluation.classification,
                    score: evaluation.score,
                    tenantId
                },
                source: 'OutcomeTrackerSvc'
            });
        }
    }

    async _correlateEventToSaga(payload, tenantId) {
        // Primary Correlation
        if (payload.sagaId || payload.saga_id) {
            return {
                sagaId: payload.sagaId || payload.saga_id,
                method: 'DIRECT_SAGA',
                confidence: 'HIGH'
            };
        }

        // Secondary Correlation (EKG Match Fallback)
        if (payload.customer_id) {
            // In a full implementation, query EKG nodes.
            // For this phase, we query event_audit_logs to find the last decision touching this customer
            const { rows } = await db.query(`
                SELECT saga_id 
                FROM public.swarm_decisions 
                WHERE final_recommendation::text LIKE $1
                ORDER BY updated_at DESC LIMIT 1
            `, [`%${payload.customer_id}%`]);

            if (rows.length > 0) {
                return {
                    sagaId: rows[0].saga_id,
                    method: 'EKG_MATCH',
                    confidence: 'MEDIUM'
                };
            }
        }
        
        return null; // Could not correlate
    }

    _evaluateEvidence(evidence) {
        // Simple heuristic for POC:
        let score = 0;
        let successCount = 0;
        let failCount = 0;

        for (const evt of evidence) {
            if (['DEAL_WON', 'CUSTOMER_REMAINED_ACTIVE', 'INVOICE_PAID', 'PRODUCT_USAGE_INCREASED'].includes(evt.eventType)) {
                score += 50;
                successCount++;
            } else if (['DEAL_LOST', 'CUSTOMER_CHURNED'].includes(evt.eventType)) {
                score -= 100;
                failCount++;
            }
        }

        // Cap score
        if (score > 100) score = 100;
        if (score < -100) score = -100;

        let classification = 'INCONCLUSIVE';
        if (score >= 100) {
            classification = 'SUCCESS';
        } else if (score > 0 && score < 100) {
            classification = 'PARTIAL_SUCCESS';
        } else if (score <= -100) {
            classification = 'FAILURE';
        } else if (score === 0 && evidence.length > 0) {
            classification = 'NEUTRAL';
        }

        return { score, classification };
    }
}

module.exports = new OutcomeTrackerSvc();

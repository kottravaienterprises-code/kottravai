const db = require('../db');
const eventBus = require('./eventBus');
const sagaOrchestrator = require('./sagaOrchestrator');

class GenerativeActionService {
    constructor() {
        // High Impact Action Registry
        this.actionPolicies = {
            'DISCOUNT_NEGOTIATION': { requiresHumanApproval: true, minConfidence: 80.0 },
            'CRM_RECORD_UPDATE': { requiresHumanApproval: false, minConfidence: 60.0 },
            'CONTRACT_EXTENSION': { requiresHumanApproval: true, minConfidence: 90.0 }
        };

        this._initListeners();
    }

    _initListeners() {
        // Listen to anomaly/risk events and formulate actions
        eventBus.subscribe('CHURN_RISK_DETECTED', async (event) => {
            await this.formulateRetentionAction(event);
        });

        // Listen for human approvals from Slack/Copilot
        eventBus.subscribe('APPROVAL_COMPLETED', async (event) => {
            await this.processApproval(event);
        });
    }

    async formulateRetentionAction(event) {
        console.log(`[GenerativeAction] Formulating retention strategy for ${event.tenantId}`);
        
        // Simulating AI reasoning
        const aiReasoning = `Client usage dropped by 25%. Contract renewal in 30 days. High risk. Recommending a proactive 15% discount for 3 months to secure renewal.`;
        const proposedAction = {
            type: 'DISCOUNT_NEGOTIATION',
            discountPercent: 15,
            durationMonths: 3,
            targetCustomer: event.payload.customerId
        };
        const confidenceScore = 88.5; // AI confidence output

        await this.proposeAction(event.eventId, proposedAction, aiReasoning, confidenceScore, event.tenantId);
    }

    async proposeAction(triggerEventId, actionPayload, aiReasoning, confidenceScore, tenantId) {
        const policy = this.actionPolicies[actionPayload.type] || { requiresHumanApproval: true, minConfidence: 85.0 };
        
        // 1. Check Confidence
        if (confidenceScore < policy.minConfidence) {
            console.log(`[GenerativeAction] Action ${actionPayload.type} aborted due to low confidence (${confidenceScore} < ${policy.minConfidence})`);
            return;
        }

        // 2. Determine Approval Status
        const approvalStatus = policy.requiresHumanApproval ? 'PENDING_HUMAN' : 'AUTO_APPROVED';

        // 3. Start a Saga
        const sagaId = await sagaOrchestrator.startSaga('GENERATIVE_ACTION', {
            tenantId,
            actionPayload,
            triggerEventId
        });

        // 4. Create Audit Log
        await db.query(`
            INSERT INTO public.generative_action_audits 
            (saga_id, trigger_event_id, action_type, ai_reasoning_summary, proposed_action, confidence_score, approval_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            sagaId, triggerEventId, actionPayload.type, aiReasoning, JSON.stringify(actionPayload), confidenceScore, approvalStatus
        ]);

        if (approvalStatus === 'PENDING_HUMAN') {
            await sagaOrchestrator.updateSagaStatus(sagaId, 'PENDING_APPROVAL');
            // Request human approval via event
            await eventBus.publish({
                eventType: 'APPROVAL_REQUIRED',
                source: 'generative_action_engine',
                tenantId: tenantId,
                payload: {
                    sagaId,
                    actionPayload,
                    aiReasoning
                }
            });
        } else {
            await this.executeAction(sagaId, actionPayload);
        }
    }

    async processApproval(event) {
        const { sagaId, approved } = event.payload;
        
        const { rows } = await db.query(`SELECT proposed_action FROM public.generative_action_audits WHERE saga_id = $1`, [sagaId]);
        if (rows.length === 0) return;

        const status = approved ? 'HUMAN_APPROVED' : 'HUMAN_REJECTED';
        
        await db.query(`
            UPDATE public.generative_action_audits 
            SET approval_status = $1 
            WHERE saga_id = $2
        `, [status, sagaId]);

        if (approved) {
            await this.executeAction(sagaId, rows[0].proposed_action);
        } else {
            await sagaOrchestrator.updateSagaStatus(sagaId, 'COMPLETED', { result: 'REJECTED_BY_HUMAN' });
        }
    }

    async executeAction(sagaId, actionPayload) {
        await sagaOrchestrator.updateSagaStatus(sagaId, 'EXECUTING');
        console.log(`[GenerativeAction] Executing action: ${actionPayload.type}`);

        try {
            // Emitting to execution layer (e.g. Stripe Billing adapter)
            await eventBus.publish({
                eventType: `EXECUTE_${actionPayload.type}`,
                source: 'generative_action_engine',
                tenantId: 'system',
                payload: { sagaId, ...actionPayload }
            });

            await db.query(`UPDATE public.generative_action_audits SET execution_result = 'SUCCESS' WHERE saga_id = $1`, [sagaId]);
            await sagaOrchestrator.updateSagaStatus(sagaId, 'COMPLETED');
        } catch (e) {
            console.error(`[GenerativeAction] Execution failed for saga ${sagaId}`, e);
            await db.query(`UPDATE public.generative_action_audits SET execution_result = 'FAILED' WHERE saga_id = $1`, [sagaId]);
            await sagaOrchestrator.compensateSaga(sagaId, e.message);
        }
    }
}

module.exports = new GenerativeActionService();

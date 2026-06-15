const db = require('../db');
const eventBus = require('./eventBus');

class SagaOrchestrator {
    /**
     * Start a new Saga
     */
    async startSaga(sagaType, context = {}, isSimulation = false) {
        try {
            const { rows } = await db.query(`
                INSERT INTO public.saga_instances (saga_type, status, context, is_simulation)
                VALUES ($1, 'STARTED', $2, $3) RETURNING id
            `, [sagaType, JSON.stringify(context), isSimulation]);

            const sagaId = rows[0].id;
            console.log(`[SagaOrchestrator] Started ${sagaType} Saga: ${sagaId} (Simulation: ${isSimulation})`);
            return sagaId;
        } catch (e) {
            console.error('[SagaOrchestrator] Failed to start saga', e);
            throw e;
        }
    }

    /**
     * Update Saga state
     */
    async updateSagaStatus(sagaId, status, contextUpdates = null) {
        try {
            let query = `UPDATE public.saga_instances SET status = $1`;
            let params = [status, sagaId];

            if (contextUpdates) {
                query += `, context = context || $3::jsonb`;
                params = [status, sagaId, JSON.stringify(contextUpdates)];
            }
            
            query += ` WHERE id = $2 RETURNING context, is_simulation`;
            const { rows } = await db.query(query, params);
            
            console.log(`[SagaOrchestrator] Saga ${sagaId} transitioned to ${status}`);
            return rows[0];
        } catch (e) {
            console.error('[SagaOrchestrator] Failed to update saga', e);
            throw e;
        }
    }

    /**
     * Handle saga compensations (Rollbacks)
     */
    async compensateSaga(sagaId, reason) {
        console.log(`[SagaOrchestrator] Initiating Compensation for Saga ${sagaId} - Reason: ${reason}`);
        
        const saga = await this.updateSagaStatus(sagaId, 'COMPENSATING');
        
        if (saga.is_simulation) {
            console.log(`[SagaOrchestrator] DRY-RUN: Simulation Saga ${sagaId} compensated successfully.`);
            await this.updateSagaStatus(sagaId, 'FAILED', { rollback_reason: reason });
            return;
        }

        // Emit a generic compensation event. Specific workers listen to this to undo their actions.
        await eventBus.publish({
            eventType: 'SAGA_COMPENSATION_REQUIRED',
            source: 'saga_orchestrator',
            tenantId: saga.context.tenantId || 'system',
            payload: { sagaId, reason, originalContext: saga.context }
        });
        
        await this.updateSagaStatus(sagaId, 'FAILED', { rollback_reason: reason });
    }
}

module.exports = new SagaOrchestrator();

const db = require('../../db');
const llmProvider = require('../infrastructure/LLMProvider');
const toolRegistry = require('./ToolRegistry');
const eventBus = require('../eventBus');

class BaseAgent {
    constructor(tenantId, sagaId, agentId, agentRole) {
        this.tenantId = tenantId;
        this.sagaId = sagaId;
        this.agentId = agentId;
        this.agentRole = agentRole;
        this.messages = []; // Short-term memory
    }

    async initialize() {
        await db.query(`
            INSERT INTO public.swarm_agents (tenant_id, saga_id, agent_id, agent_role, current_state)
            VALUES ($1, $2, $3, $4, 'CREATED')
            ON CONFLICT (agent_id) DO NOTHING
        `, [this.tenantId, this.sagaId, this.agentId, this.agentRole]);

        await this._transitionState('READY');
        await this._logTelemetry('STATE_CHANGE', { state: 'READY' });
    }

    async handleMessage(eventPayload) {
        // Assume eventPayload is the AgentMessage standard protocol
        this.messages.push({ role: 'user', content: JSON.stringify(eventPayload) });
        
        await this._transitionState('THINKING');
        
        try {
            const systemPrompt = `You are a ${this.agentRole} in an enterprise swarm. Your goal is to debate and reach consensus.`;
            // For now we use the mock LLM Provider
            const response = await llmProvider.generateStructuredOutput(systemPrompt, this.messages, null);
            const { action, thought, reason, proposal } = response.content;
            
            await this._logTelemetry('THOUGHT', { action, thought, reason, proposal }, null, response.token_usage);
            
            if (action === 'PROPOSE') {
                await this.broadcastMessage('AGENT_PROPOSAL', { proposal, sagaId: this.sagaId, reason, role: this.agentRole, confidence: 0.9 });
                await this._transitionState('DEBATING');
            } else if (action === 'CHALLENGE' || action === 'REJECT') {
                await this.broadcastMessage('AGENT_CHALLENGE', { reason, role: this.agentRole, confidence: 0.8 });
                await this._transitionState('DEBATING');
            } else if (action === 'CONSENSUS_REACHED' || action === 'AGREE') {
                await this.broadcastMessage('AGENT_CONSENSUS', { reason, role: this.agentRole, confidence: 0.95 });
                await this._transitionState('CONSENSUS_REACHED');
            } else {
                await this.broadcastMessage('AGENT_OBSERVATION', { thought, role: this.agentRole });
                await this._transitionState('WAITING_FOR_CONTEXT');
            }

        } catch (error) {
            await this._logTelemetry('ERROR', { error: error.message });
            await this._transitionState('ESCALATED');
        }
    }

    async invokeTool(toolName, params) {
        return await toolRegistry.invokeTool(toolName, this.agentRole, this.agentId, this.sagaId, this.tenantId, params);
    }

    async broadcastMessage(eventType, payload) {
        const message = {
            sender_id: this.agentId,
            receiver_id: 'broadcast',
            message_type: eventType,
            payload
        };
        this.messages.push({ role: 'assistant', content: JSON.stringify(message) });
        
        // Emits back to the event bus
        eventBus.publish({ eventType, tenantId: this.tenantId, payload: message, source: 'BaseAgent' });
    }

    async _transitionState(newState) {
        await db.query(`
            UPDATE public.swarm_agents SET current_state = $1, updated_at = CURRENT_TIMESTAMP
            WHERE agent_id = $2
        `, [newState, this.agentId]);
        await this._logTelemetry('STATE_CHANGE', { state: newState });
    }

    async _logTelemetry(actionType, context, durationMs = null, tokenConsumption = 0) {
        try {
            await db.query(`
                INSERT INTO public.agent_telemetry (tenant_id, saga_id, agent_id, agent_role, action_type, context, duration_ms, token_consumption)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [this.tenantId, this.sagaId, this.agentId, this.agentRole, actionType, JSON.stringify(context), durationMs, tokenConsumption]);
        } catch (e) {
            console.error("Failed to log agent telemetry", e);
        }
    }
}

module.exports = BaseAgent;

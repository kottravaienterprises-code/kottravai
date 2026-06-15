const agentRBAC = require('./AgentRBAC');
const vectorStore = require('../infrastructure/VectorStore');
const embeddingProvider = require('../infrastructure/EmbeddingProvider');
const db = require('../../db');

class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this._registerDefaultTools();
    }

    _registerDefaultTools() {
        this.registerTool('search_ekg', async ({ agentRole, tenantId, query, limit = 5 }) => {
            const allowedNodes = agentRBAC.getAllowedNodeTypes(agentRole);
            if (allowedNodes.length === 0) throw new Error("RBAC Denial: Agent role has no EKG access");

            const queryVector = await embeddingProvider.generateEmbedding(query);
            
            // In a real implementation we would do a hybrid search across all allowed node types,
            // or let the agent specify the type. For simplicity, we just search the first allowed type.
            const nodeType = allowedNodes[0]; 
            const results = await vectorStore.searchSimilarNodes(tenantId, queryVector, { nodeType }, limit);
            return { result: results, status: 'SUCCESS' };
        });

        this.registerTool('propose_discount', async ({ agentRole, customerId, discountPercent }) => {
            // Mock implementation
            return { status: 'SUCCESS', message: `Discount of ${discountPercent}% proposed for ${customerId}` };
        });

        this.registerTool('approve_discount', async ({ agentRole, customerId, discountPercent }) => {
             return { status: 'SUCCESS', message: `Discount of ${discountPercent}% approved and applied to ${customerId}` };
        });
        
        this.registerTool('reject_discount', async ({ agentRole, customerId, reason }) => {
             return { status: 'SUCCESS', message: `Discount rejected for ${customerId}. Reason: ${reason}` };
        });
    }

    registerTool(toolName, implementation) {
        this.tools.set(toolName.toLowerCase(), implementation);
    }

    async invokeTool(toolName, agentRole, agentId, sagaId, tenantId, params) {
        toolName = toolName.toLowerCase();
        
        // 1. RBAC Check
        if (!agentRBAC.canExecuteTool(agentRole, toolName)) {
            const errorMsg = `RBAC Denial: Role ${agentRole} is not authorized to execute tool ${toolName}`;
            await this._logTelemetry(sagaId, agentId, agentRole, tenantId, 'TOOL_DENIED', { toolName, params, error: errorMsg });
            throw new Error(errorMsg);
        }

        // 2. Existence Check
        if (!this.tools.has(toolName)) {
            throw new Error(`Tool ${toolName} not found in registry`);
        }

        const implementation = this.tools.get(toolName);
        
        // 3. Execution & Telemetry
        const start = Date.now();
        try {
            const result = await implementation({ agentRole, tenantId, ...params });
            const duration = Date.now() - start;
            await this._logTelemetry(sagaId, agentId, agentRole, tenantId, 'TOOL_INVOCATION_SUCCESS', { toolName, params, result }, duration);
            return result;
        } catch (error) {
            const duration = Date.now() - start;
            await this._logTelemetry(sagaId, agentId, agentRole, tenantId, 'TOOL_INVOCATION_ERROR', { toolName, params, error: error.message }, duration);
            throw error;
        }
    }

    async _logTelemetry(sagaId, agentId, agentRole, tenantId, actionType, context, durationMs = null) {
        try {
            await db.query(`
                INSERT INTO public.agent_telemetry (tenant_id, saga_id, agent_id, agent_role, action_type, context, duration_ms)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [tenantId, sagaId, agentId, agentRole, actionType, JSON.stringify(context), durationMs]);
        } catch (e) {
            console.error("Failed to log tool telemetry", e);
        }
    }
}

module.exports = new ToolRegistry();

const BaseAgent = require('./BaseAgent');
const eventBus = require('../eventBus');
const consensusEngine = require('./ConsensusEngine');

class SwarmManager {
    constructor() {
        this.activeSwarms = new Map(); // sagaId -> { agents: Map, turns: number, maxTurns: number, responses: Array, currentProposal: Object }
        this._initListeners();
    }

    _initListeners() {
        eventBus.subscribe('AGENT_PROPOSAL', async (event) => this.handleAgentProposal(event));
        eventBus.subscribe('AGENT_CHALLENGE', async (event) => this.handleAgentMessage(event, 'CHALLENGE'));
        eventBus.subscribe('AGENT_CONSENSUS', async (event) => this.handleAgentMessage(event, 'AGREE'));
        eventBus.subscribe('AGENT_OBSERVATION', async (event) => this.handleAgentMessage(event, 'OBSERVE'));
    }

    async initializeSwarm(tenantId, sagaId, requiredRoles, maxTurns = 10) {
        if (this.activeSwarms.has(sagaId)) {
            throw new Error(`Swarm already active for saga ${sagaId}`);
        }

        const swarm = {
            agents: new Map(),
            turns: 0,
            maxTurns,
            tenantId,
            sagaId,
            responses: [],
            currentProposal: null
        };

        for (const role of requiredRoles) {
            const agentId = `agent_${role.toLowerCase()}_${Math.random().toString(36).substr(2, 5)}`;
            const agent = new BaseAgent(tenantId, sagaId, agentId, role);
            await agent.initialize();
            swarm.agents.set(agentId, agent);
        }

        this.activeSwarms.set(sagaId, swarm);
        await consensusEngine.initializeDecision(tenantId, sagaId);
        
        console.log(`[SwarmManager] Initialized swarm for saga ${sagaId} with roles: ${requiredRoles.join(', ')}`);
        eventBus.publish({ eventType: 'AGENT_TASK_CREATED', tenantId, payload: { sagaId }, source: 'SwarmManager' });
        return swarm;
    }

    async handleAgentProposal(event) {
        const { tenantId, payload } = event;
        const sagaId = payload.sagaId;
        const swarm = this.activeSwarms.get(sagaId);
        if (!swarm) return;

        swarm.currentProposal = payload.proposal;
        swarm.responses = []; // reset responses on new proposal
        swarm.responses.push({ action: 'AGREE', agentId: payload.sender_id, role: payload.role, confidence: 0.9, reason: 'Proposer' });
        
        await consensusEngine.transitionState(sagaId, 'PROPOSED');
        await this._routeMessage(swarm, event);
    }

    async handleAgentMessage(event, actionType) {
        const { tenantId, payload } = event;
        let swarm, sagaId = payload.sagaId;
        if (sagaId) {
            swarm = this.activeSwarms.get(sagaId);
        } else {
            // Fallback for tests if sagaId is missing
            for (const [id, s] of this.activeSwarms.entries()) {
                if (s.tenantId === tenantId) {
                    swarm = s;
                    sagaId = id;
                    break;
                }
            }
        }
        if (!swarm) return;

        swarm.turns++;

        // Record the agent's response for consensus evaluation
        if (actionType === 'CHALLENGE' || actionType === 'AGREE') {
            swarm.responses.push({
                action: actionType,
                agentId: payload.sender_id,
                role: payload.role || 'AGENT',
                confidence: payload.confidence || 0.8,
                reason: payload.reason || payload.thought
            });
            
            if (actionType === 'CHALLENGE') {
                await consensusEngine.transitionState(sagaId, 'CHALLENGED');
            }
        }

        // Check if we hit timeout
        if (swarm.turns >= swarm.maxTurns) {
            console.log(`[SwarmManager] Swarm ${sagaId} reached max turns (${swarm.maxTurns}). Escalating.`);
            
            // Extract dissenting opinions
            const minorityOpinions = swarm.responses.filter(r => r.action === 'CHALLENGE' || r.action === 'REJECT');
            
            await consensusEngine.escalateDecision(sagaId, minorityOpinions, swarm.currentProposal);
            await this._triggerSlackEscalation(sagaId, tenantId, swarm.currentProposal, minorityOpinions);
            
            eventBus.publish({ eventType: 'AGENT_ESCALATION', tenantId, payload: { sagaId, reason: 'Max debate turns reached' }, source: 'SwarmManager' });
            await this.terminateSwarm(sagaId);
            return;
        }

        // Evaluate Consensus
        const agentsArray = Array.from(swarm.agents.values());
        // Only evaluate if we have responses from everyone
        if (swarm.responses.length >= agentsArray.length && swarm.currentProposal) {
            const consensusResult = await consensusEngine.evaluateConsensus(sagaId, tenantId, agentsArray, swarm.responses, swarm.currentProposal);
            
            if (consensusResult.reached) {
                console.log(`[SwarmManager] Consensus reached for saga ${sagaId}.`);
                
                // Explainability Payload
                const explainability = {
                    decision: swarm.currentProposal,
                    confidence: consensusResult.avgConfidence,
                    dissent: consensusResult.minorityOpinions
                };
                
                eventBus.publish({ eventType: 'CONSENSUS_FINALIZED', tenantId, payload: { sagaId, explainability }, source: 'SwarmManager' });
                await this.terminateSwarm(sagaId);
                return;
            } else if (actionType === 'CHALLENGE') {
                 // Force a revision round
                 await consensusEngine.transitionState(sagaId, 'REVISED');
            }
        }

        await this._routeMessage(swarm, event);
    }

    async _routeMessage(swarm, event) {
        const payload = event.payload;
        for (const agent of swarm.agents.values()) {
            if (agent.agentId !== payload.sender_id) {
                await agent.handleMessage(payload);
            }
        }
    }

    async _triggerSlackEscalation(sagaId, tenantId, proposal, minorityOpinions) {
        // Stub for Slack integration
        console.log(`[Slack Integration] Escalating saga ${sagaId} to Executive Reviewer`);
        console.log(`Proposal:`, proposal);
        console.log(`Minority Opinions:`, minorityOpinions);
        
        // Emulate sending to Slack event handler
        eventBus.publish({ 
            eventType: 'SLACK_APPROVAL_REQUIRED', 
            tenantId, 
            payload: { sagaId, proposal, minorityOpinions }, 
            source: 'SwarmManager' 
        });
    }

    async terminateSwarm(sagaId) {
        const swarm = this.activeSwarms.get(sagaId);
        if (!swarm) return;

        for (const agent of swarm.agents.values()) {
            await agent._transitionState('TERMINATED');
            eventBus.publish({ eventType: 'AGENT_TERMINATED', tenantId: agent.tenantId, payload: { agentId: agent.agentId }, source: 'SwarmManager' });
        }

        this.activeSwarms.delete(sagaId);
        console.log(`[SwarmManager] Terminated swarm for saga ${sagaId}`);
    }
}

module.exports = new SwarmManager();

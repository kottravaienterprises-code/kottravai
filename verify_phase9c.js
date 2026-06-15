const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const swarmManager = require('./server/services/swarm/SwarmManager');
const consensusEngine = require('./server/services/swarm/ConsensusEngine');
const { v4: uuidv4 } = require('uuid');

async function runVerification() {
    console.log("================================================");
    console.log("Phase 9C: Multi-Agent Consensus Workflows Verification");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;
    const tenantId = 'tenant_verify_9c';

    const assert = (condition, message) => {
        total++;
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.log(`❌ FAIL: ${message}`);
        }
    };

    try {
        console.log("--- 1. Consensus State Machine & Explainability ---");
        const sagaId1 = uuidv4();
        await swarmManager.initializeSwarm(tenantId, sagaId1, ['SALES_AGENT', 'FINANCE_AGENT']);
        
        // Trigger Proposal
        await eventBus.publish({ 
            eventType: 'AGENT_PROPOSAL', 
            tenantId, 
            payload: { 
                sagaId: sagaId1, 
                proposal: { action: 'discount', value: 20 },
                sender_id: 'agent_sales_test',
                role: 'SALES_AGENT',
                reason: 'Need to win deal'
            }, 
            source: 'TestHarness' 
        });

        await new Promise(r => setTimeout(r, 1000));
        
        // Let's verify the DB state transitioned to PROPOSED
        let decision = await consensusEngine.getDecisionContext(sagaId1);
        assert(decision.state === 'PROPOSED', "Consensus Engine successfully initialized state to PROPOSED");

            await eventBus.publish({ 
                eventType: 'AGENT_CHALLENGE', 
                tenantId, 
                payload: { sagaId: sagaId1, sender_id: 'agent_finance_test', role: 'FINANCE_AGENT', reason: 'Margin is too low' }, 
                source: 'TestHarness' 
            });

        await new Promise(r => setTimeout(r, 1000));
        decision = await consensusEngine.getDecisionContext(sagaId1);
        assert(decision.state === 'CHALLENGED', "Consensus Engine successfully transitioned state to CHALLENGED upon dissent");

        console.log("\n--- 2. Minority Opinion Preservation & Escalation ---");
        const sagaId2 = uuidv4();
        await consensusEngine.initializeDecision(tenantId, sagaId2);
        
        // Directly test the escalation method
        const mockProposal = { action: 'discount', value: 30 };
        const mockMinorityOpinions = [
            { agentId: 'agent_finance_test2', role: 'FINANCE_AGENT', reason: 'Margin is absolutely too low', timestamp: new Date().toISOString() }
        ];
        
        await consensusEngine.escalateDecision(sagaId2, mockMinorityOpinions, mockProposal);
        const escalatedDecision = await consensusEngine.getDecisionContext(sagaId2);
        
        assert(escalatedDecision.state === 'ESCALATED_TO_HUMAN', "Consensus Engine successfully marked state as ESCALATED_TO_HUMAN");
        assert(escalatedDecision.minority_opinions.length > 0, "Consensus Engine successfully preserved minority/dissenting opinions in the audit record");
        
        const dissent = escalatedDecision.minority_opinions[0];
        assert(dissent.reason === 'Margin is absolutely too low', "Dissenting reason was explicitly captured for executive explainability");

        console.log("\n--- 3. Supermajority Consensus Threshold ---");
        // We will mock evaluateConsensus logic to verify the 75% logic
        const mockAgents = [
            { agentRole: 'AGENT' }, { agentRole: 'AGENT' }, { agentRole: 'AGENT' }, { agentRole: 'AGENT' }
        ];
        const mockResponses = [
            { action: 'AGREE' }, { action: 'AGREE' }, { action: 'AGREE' }, { action: 'CHALLENGE', reason: 'I disagree slightly' }
        ];
        const thresholdResult = await consensusEngine.evaluateConsensus(uuidv4(), tenantId, mockAgents, mockResponses, {});
        assert(thresholdResult.reached === true, "ConsensusEngine successfully allowed a 75% Supermajority to reach consensus");
        assert(thresholdResult.minorityOpinions.length === 1, "Supermajority consensus accurately preserved the 25% minority dissent");

    } catch (err) {
        console.error("Verification Error:", err);
    } finally {
        console.log("\n================================================");
        console.log(`Results: ${passed} / ${total} Tests Passed`);
        console.log("================================================");
        process.exit(passed === total ? 0 : 1);
    }
}

runVerification();

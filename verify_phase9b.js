const db = require('./server/db');
const eventBus = require('./server/services/eventBus');
const swarmManager = require('./server/services/swarm/SwarmManager');
const agentRBAC = require('./server/services/swarm/AgentRBAC');
const toolRegistry = require('./server/services/swarm/ToolRegistry');
const BaseAgent = require('./server/services/swarm/BaseAgent');
const { v4: uuidv4 } = require('uuid');

async function runVerification() {
    console.log("================================================");
    console.log("Phase 9B: Swarm Initialization & Tooling Verification");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;
    const tenantId = 'tenant_verify_9b';

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
        console.log("--- 1. RBAC & Tool Governance Isolation ---");
        const salesAgent = new BaseAgent(tenantId, uuidv4(), 'agent_sales_test', 'SALES_AGENT');
        
        let toolAccessDenied = false;
        try {
            await salesAgent.invokeTool('approve_discount', { customerId: 'cust_123', discountPercent: 20 });
        } catch (e) {
            toolAccessDenied = e.message.includes('RBAC Denial');
        }
        assert(toolAccessDenied, "Sales Agent strictly denied access to Finance tool (approve_discount)");
        
        let ekgAccessDenied = !agentRBAC.canAccessEKGNode('SALES_AGENT', 'FINANCIAL_LEDGER');
        assert(ekgAccessDenied, "Sales Agent strictly denied query access to FINANCIAL_LEDGER nodes");

        console.log("\n--- 2. Swarm Lifecycle & Telemetry Persistence ---");
        const testSagaId = uuidv4();
        await swarmManager.initializeSwarm(tenantId, testSagaId, ['FINANCE_AGENT', 'SALES_AGENT']);
        
        // Let's verify DB state
        const { rows: agents } = await db.query(`SELECT current_state FROM public.swarm_agents WHERE saga_id = $1`, [testSagaId]);
        assert(agents.length === 2, "SwarmManager successfully persisted 2 agent lifecycles to DB");
        assert(agents[0].current_state === 'READY', "Agents successfully initialized into READY state");

        console.log("\n--- 3. Inter-Agent Protocol & Timeout Enforcement ---");
        // Simulate a rapid debate hitting the timeout
        for(let i=0; i < 11; i++) {
            await eventBus.publish({ 
                eventType: 'AGENT_CHALLENGE', 
                tenantId, 
                payload: { sender_id: 'agent_sales_test', reason: 'Need more discount' }, 
                source: 'TestHarness' 
            });
        }
        
        // Wait a beat for async processing
        await new Promise(r => setTimeout(r, 2000));

        const { rows: terminatedAgents } = await db.query(`SELECT current_state FROM public.swarm_agents WHERE saga_id = $1`, [testSagaId]);
        assert(terminatedAgents.every(a => a.current_state === 'TERMINATED'), "SwarmManager forcibly TERMINATED agents after max turns");

        console.log("\n--- 4. Observability Completeness ---");
        const { rows: telemetry } = await db.query(`SELECT action_type FROM public.agent_telemetry WHERE saga_id = $1`, [testSagaId]);
        assert(telemetry.length > 0, "Agent telemetry successfully persisted to PostgreSQL");
        
        const stateChanges = telemetry.filter(t => t.action_type === 'STATE_CHANGE');
        assert(stateChanges.length > 0, "Lifecycle state transitions correctly tracked in telemetry");

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

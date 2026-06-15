const db = require('./server/db');
const simulationSvc = require('./server/services/revenueSimulationService');

async function runTests() {
    console.log("================================================");
    console.log("Phase 7C-C Verification Suite: Simulation Engine");
    console.log("================================================\n");

    let passed = 0;
    let total = 0;

    // Helper for assertions
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
        // --- 1. Math Verification ---
        console.log("--- 1. Mathematical Simulation Engine ---");
        const mockReq = {
            adminRole: 'SUPER_ADMIN',
            adminUser: { id: null } // We won't use it, just mocking
        };

        const vars = {
            targetArrGrowth: 50,
            churnRateModifier: -2,
            dealSizeModifier: 10,
            pipelineVelocityModifier: 15,
            expansionRevenueGrowth: 20
        };

        const result = await simulationSvc.runSimulation(vars, mockReq);
        
        assert(result.projected.arr >= result.baseline.arr, "Projected ARR increased based on target");
        assert(result.projected.churn < result.baseline.churn, "Projected Churn decreased based on modifier");
        assert(result.projected.coverage > result.baseline.coverage, "Pipeline Coverage increased");

        // --- 2. Database Persistence & Status Locking ---
        console.log("\n--- 2. Scenario Persistence & Governance ---");
        const saved = await simulationSvc.saveScenario(
            mockReq,
            "Board Deck: Aggressive Growth",
            "Testing 50% ARR growth scenario",
            vars,
            result.projected,
            null,
            "DRAFT"
        );

        assert(saved.id, "Scenario successfully persisted to database");
        assert(saved.status === 'DRAFT', "Initial status is DRAFT");

        const locked = await simulationSvc.updateStatus(saved.id, 'LOCKED');
        assert(locked.status === 'LOCKED', "Scenario successfully transitioned to LOCKED");

        const approved = await simulationSvc.updateStatus(saved.id, 'APPROVED');
        assert(approved.status === 'APPROVED', "Scenario successfully transitioned to APPROVED");

        // --- 3. AI Copilot Integration ---
        console.log("\n--- 3. Strategic Planning Copilot ---");
        const analysis = await simulationSvc.generateStrategicAnalysis(vars, result);
        
        assert(analysis.executiveSummary, "Executive Summary generated");
        assert(Array.isArray(analysis.risks) && analysis.risks.length > 0, "Risks identified");
        assert(Array.isArray(analysis.recommendedActions) && analysis.recommendedActions.length > 0, "Strategic actions recommended");

        // Clean up mock
        await db.query(`DELETE FROM public.revenue_scenarios WHERE id = $1`, [saved.id]);

    } catch (err) {
        console.error("\nTest Suite Error:", err);
    } finally {
        console.log("\n================================================");
        console.log(`Results: ${passed} / ${total} Tests Passed`);
        console.log("================================================");
        process.exit(passed === total ? 0 : 1);
    }
}

runTests();

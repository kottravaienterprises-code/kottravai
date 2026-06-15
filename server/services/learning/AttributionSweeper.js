const db = require('../../db');

class AttributionSweeper {
    /**
     * Finds open decisions whose attribution window has expired
     * and forcibly marks them as NEUTRAL.
     */
    async sweepExpiredWindows() {
        console.log(`[AttributionSweeper] Starting sweep for expired attribution windows...`);
        try {
            const { rows } = await db.query(`
                UPDATE public.decision_outcomes 
                SET status = 'FINALIZED', classification = 'NEUTRAL', outcome_score = 0
                WHERE status != 'FINALIZED' 
                AND attribution_window_end < CURRENT_TIMESTAMP
                RETURNING saga_id, domain
            `);

            if (rows.length > 0) {
                console.log(`[AttributionSweeper] Swept ${rows.length} expired decisions to NEUTRAL.`);
                for (const row of rows) {
                    console.log(`   - Saga: ${row.saga_id} (${row.domain})`);
                }
            } else {
                console.log(`[AttributionSweeper] No expired decisions found.`);
            }
        } catch (e) {
            console.error(`[AttributionSweeper] Error during sweep:`, e);
        }
    }
}

module.exports = new AttributionSweeper();

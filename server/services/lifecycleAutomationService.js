const db = require('../db');

class LifecycleAutomationService {
    
    // 1. Renewal Workflows (90/60/30 day alerts)
    async runRenewalWorkflows() {
        console.log('[Lifecycle Automation] Running Renewal Workflows...');
        let generatedTasks = 0;

        // Fetch accounts with upcoming renewals (<= 90 days)
        const { rows: accounts } = await db.query(`
            SELECT id, company_name, contract_end_date, assigned_csm 
            FROM public.customer_accounts 
            WHERE status = 'Active' 
              AND contract_end_date IS NOT NULL 
              AND contract_end_date <= NOW() + INTERVAL '90 days'
              AND contract_end_date >= NOW()
        `);

        for (const account of accounts) {
            const daysToRenewal = Math.ceil((new Date(account.contract_end_date) - new Date()) / (1000 * 60 * 60 * 24));
            
            let milestoneType = null;
            if (daysToRenewal <= 30) milestoneType = '30-Day Renewal Alert';
            else if (daysToRenewal <= 60) milestoneType = '60-Day Renewal Alert';
            else if (daysToRenewal <= 90) milestoneType = '90-Day Renewal Prep';

            if (milestoneType) {
                // Check if a task already exists for this milestone to avoid duplicates
                const { rows: existing } = await db.query(`
                    SELECT id FROM public.customer_tasks 
                    WHERE account_id = $1 AND title = $2
                `, [account.id, milestoneType]);

                if (existing.length === 0) {
                    await db.query(`
                        INSERT INTO public.customer_tasks (account_id, assigned_to, task_type, title, description, due_date)
                        VALUES ($1, $2, 'Renewal Prep', $3, $4, NOW() + INTERVAL '7 days')
                    `, [account.id, account.assigned_csm, milestoneType, `Prepare renewal package for ${account.company_name}.`]);
                    generatedTasks++;
                }
            }
        }
        
        return { success: true, generatedTasks };
    }

    // 2. Churn Risk Prevention (Health velocity drops)
    async runChurnPrevention() {
        console.log('[Lifecycle Automation] Running Churn Prevention Engine...');
        let escalationsGenerated = 0;

        // Fetch accounts where health velocity is highly negative
        const { rows: atRiskAccounts } = await db.query(`
            SELECT id, company_name, health_score, health_velocity 
            FROM public.customer_accounts 
            WHERE status = 'Active' 
              AND health_velocity <= -10
              AND health_score > 0
        `);

        for (const account of atRiskAccounts) {
            // Check if there is an open escalation
            const { rows: existing } = await db.query(`
                SELECT id FROM public.churn_risk_escalations 
                WHERE account_id = $1 AND status = 'Open'
            `, [account.id]);

            if (existing.length === 0) {
                await db.query(`
                    INSERT INTO public.churn_risk_escalations (account_id, risk_level, trigger_reason, health_score_at_trigger, health_velocity_at_trigger)
                    VALUES ($1, 'At Risk', $2, $3, $4)
                `, [account.id, `Health velocity dropped sharply by ${account.health_velocity} points.`, account.health_score, account.health_velocity]);
                escalationsGenerated++;
            }
        }

        return { success: true, escalationsGenerated };
    }

    // 3. Journey Automation (Milestone progression)
    async runJourneyAutomation() {
        console.log('[Lifecycle Automation] Running Journey Automation...');
        let milestonesUpdated = 0;

        // E.g. mark 'Active Adoption' if usage > 80% and account is older than 30 days
        const { rows: eligibleAccounts } = await db.query(`
            SELECT id FROM public.customer_accounts 
            WHERE status = 'Active' 
              AND usage_rate >= 80 
              AND created_at <= NOW() - INTERVAL '30 days'
        `);

        for (const account of eligibleAccounts) {
            const { rows: existing } = await db.query(`
                SELECT id FROM public.customer_journey_events 
                WHERE account_id = $1 AND milestone_name = 'Active Adoption'
            `, [account.id]);

            if (existing.length === 0) {
                await db.query(`
                    INSERT INTO public.customer_journey_events (account_id, milestone_name)
                    VALUES ($1, 'Active Adoption')
                `, [account.id]);
                milestonesUpdated++;
            }
        }

        return { success: true, milestonesUpdated };
    }
}

module.exports = new LifecycleAutomationService();

const db = require('../db');

const getExecutiveOverview = async () => {
  const overview = {
    summary: {
      title: 'Executive Command Overview',
      generatedAt: new Date().toISOString(),
      status: 'Operational'
    },
    metrics: {
      workflowHealth: 92,
      revenueSignals: 6,
      recommendedActions: 3,
      approvalsPending: 1
    },
    modules: {
      revenue: { label: 'Revenue Intelligence', status: 'Healthy' },
      customerSuccess: { label: 'Customer Success', status: 'Healthy' },
      workflows: { label: 'Workflow Operations', status: 'Healthy' },
      executiveAutomation: { label: 'Executive Automation', status: 'Healthy' }
    }
  };

  try {
    const [{ rows: workflowRows }, { rows: eventRows }, { rows: approvalRows }] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS count FROM public.workflow_executions"),
      db.query("SELECT COUNT(*)::int AS count FROM public.system_events"),
      db.query("SELECT COUNT(*)::int AS count FROM public.workflow_approvals WHERE status = 'Pending'")
    ]);

    overview.metrics.workflowExecutions = workflowRows[0]?.count || 0;
    overview.metrics.eventFirehoseSize = eventRows[0]?.count || 0;
    overview.metrics.approvalsPending = approvalRows[0]?.count || 0;
  } catch (err) {
    console.warn('[SharedContext] Fallback metrics used:', err.message);
  }

  return overview;
};

module.exports = {
  getExecutiveOverview
};

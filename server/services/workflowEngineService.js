/**
 * workflowEngineService.js
 * Phase 7B: Cross-Module Workflow Engine
 */

const db = require('../db');
const aiOperations = require('./aiOperationsService');

const normalizeApproverId = (approverId) => {
  if (!approverId) return null;
  if (typeof approverId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(approverId)) {
    return approverId;
  }
  return null;
};

/**
 * Handles incoming events from the Event Bus to trigger Playbooks
 */
const handleEventTrigger = async (event) => {
  const { rows: playbooks } = await db.query(
    `SELECT * FROM public.workflow_playbooks WHERE is_active = true AND trigger_event = $1`,
    [event.event_type]
  );

  for (const playbook of playbooks) {
    console.log(`[Workflow Engine] Triggering playbook ${playbook.name} from event ${event.event_type}`);
    await executePlaybook(playbook.id, { triggerEvent: event });
  }
};

/**
 * Initiates a workflow playbook
 */
const executePlaybook = async (playbookId, initialContext = {}) => {
  const { rows: playbooks } = await db.query(`SELECT * FROM public.workflow_playbooks WHERE id = $1`, [playbookId]);
  if (!playbooks.length) throw new Error('Playbook not found');
  const playbook = playbooks[0];

  // Create Execution
  const { rows: execs } = await db.query(
    `INSERT INTO public.workflow_executions (playbook_id, status, context_data, started_by)
     VALUES ($1, 'Queued', $2, 'system') RETURNING *`,
    [playbook.id, JSON.stringify(initialContext)]
  );
  const execution = execs[0];

  // Spawn Tasks for the execution (initially all pending)
  const steps = typeof playbook.steps === 'string' ? JSON.parse(playbook.steps) : playbook.steps;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    await db.query(
      `INSERT INTO public.workflow_tasks (execution_id, step_index, step_type, title, status, assigned_to)
       VALUES ($1, $2, $3, $4, 'Pending', $5)`,
      [execution.id, i, step.type, step.title, step.agent || step.assignee || step.required_role || null]
    );
  }

  // Start the state machine
  await db.query(`UPDATE public.workflow_executions SET status = 'Running' WHERE id = $1`, [execution.id]);
  await processNextStep(execution.id);

  return execution;
};

/**
 * Processes the next step in an active workflow execution
 */
const processNextStep = async (executionId) => {
  const { rows: execs } = await db.query(`SELECT * FROM public.workflow_executions WHERE id = $1`, [executionId]);
  const execution = execs[0];
  if (!execution || execution.status !== 'Running') return;

  // Find the next pending task
  const { rows: tasks } = await db.query(
    `SELECT * FROM public.workflow_tasks 
     WHERE execution_id = $1 AND status = 'Pending' 
     ORDER BY step_index ASC LIMIT 1`,
    [execution.id]
  );

  if (!tasks.length) {
    // All tasks completed!
    await db.query(`UPDATE public.workflow_executions SET status = 'Completed', completed_at = NOW() WHERE id = $1`, [execution.id]);
    console.log(`[Workflow Engine] Execution ${execution.id} Completed.`);
    
    // Audit Log for Workflow Completion
    try {
      await db.query(
        `INSERT INTO public.admin_audit_logs (admin_id, action, resource, resource_id, metadata, ip_address)
         VALUES ('system', 'WORKFLOW_COMPLETED', 'WORKFLOW', $1, $2, NULL)`,
        [execution.id, JSON.stringify({ playbook_id: execution.playbook_id })]
      );
    } catch (auditErr) {
      console.warn(`[Workflow Engine] Audit log write skipped: ${auditErr.message}`);
    }
    return;
  }

  const task = tasks[0];
  
  // Mark in progress
  await db.query(`UPDATE public.workflow_tasks SET status = 'In Progress' WHERE id = $1`, [task.id]);

  try {
    let outputData = {};

    switch(task.step_type) {
      case 'AI_ACTION':
        outputData = await aiOperations.executeAITask(execution, task);
        await completeTask(task.id, outputData);
        await processNextStep(execution.id); // auto-advance
        break;

      case 'APPROVAL':
        // Generate an approval request and pause execution
        await db.query(
          `INSERT INTO public.workflow_approvals (task_id, execution_id, approver_role, status)
           VALUES ($1, $2, $3, 'Pending')`,
          [task.id, execution.id, task.assigned_to || 'MANAGER']
        );
        await db.query(`UPDATE public.workflow_executions SET status = 'Waiting Approval' WHERE id = $1`, [execution.id]);
        console.log(`[Workflow Engine] Execution ${execution.id} paused for APPROVAL on task ${task.id}`);
        break;

      case 'TASK':
      case 'EMAIL':
      default:
        // For Phase 7B, simulated instant completion of simple tasks
        outputData = { result: `Simulated execution of ${task.step_type}` };
        await completeTask(task.id, outputData);
        await processNextStep(execution.id); // auto-advance
        break;
    }
  } catch (err) {
    console.error(`[Workflow Engine] Task ${task.id} Failed:`, err);
    await db.query(`UPDATE public.workflow_tasks SET status = 'Failed', error_message = $2 WHERE id = $1`, [task.id, err.message]);
    await db.query(`UPDATE public.workflow_executions SET status = 'Failed' WHERE id = $1`, [execution.id]);
  }
};

const completeTask = async (taskId, outputData = {}) => {
  await db.query(
    `UPDATE public.workflow_tasks SET status = 'Completed', output_data = $2, completed_at = NOW() WHERE id = $1`,
    [taskId, JSON.stringify(outputData)]
  );
};

/**
 * Handles an approval/rejection from an Executive or Manager
 */
const processApproval = async (approvalId, status, approverId, comments = '') => {
  const normalizedApproverId = normalizeApproverId(approverId);
  const { rows: approvals } = await db.query(
    `UPDATE public.workflow_approvals 
     SET status = $2, approver_id = $3, comments = $4, responded_at = NOW() 
     WHERE id = $1 RETURNING *`,
    [approvalId, status, normalizedApproverId, comments]
  );
  if (!approvals.length) throw new Error('Approval not found');
  const approval = approvals[0];

  const { rows: tasks } = await db.query(`SELECT * FROM public.workflow_tasks WHERE id = $1`, [approval.task_id]);
  const task = tasks[0];

  if (status === 'Approved') {
    await completeTask(task.id, { approved_by: approverId, comments });
    // Resume execution
    await db.query(`UPDATE public.workflow_executions SET status = 'Running' WHERE id = $1`, [approval.execution_id]);
    await processNextStep(approval.execution_id);
  } else {
    // Rejected
    await db.query(`UPDATE public.workflow_tasks SET status = 'Failed', error_message = 'Approval Rejected' WHERE id = $1`, [task.id]);
    await db.query(`UPDATE public.workflow_executions SET status = 'Failed' WHERE id = $1`, [approval.execution_id]);
  }
  return approval;
};

/**
 * Evaluates pending tasks and executions for SLA breaches and escalates if necessary
 */
const handleSLAEscalations = async () => {
  console.log(`[Workflow Engine] Running SLA Escalation Engine...`);
  
  // Find pending approvals older than 1 minute (for testing/simulation)
  const { rows: pendingApprovals } = await db.query(
    `SELECT a.id, a.task_id, a.execution_id, t.escalation_level 
     FROM public.workflow_approvals a
     JOIN public.workflow_tasks t ON a.task_id = t.id
     WHERE a.status = 'Pending' AND a.requested_at < NOW() - INTERVAL '1 minute'`
  );

  for (const appr of pendingApprovals) {
    if (appr.escalation_level === 'None') {
      await db.query(`UPDATE public.workflow_tasks SET escalation_level = 'Warning' WHERE id = $1`, [appr.task_id]);
      console.log(`[SLA] Escalated task ${appr.task_id} to Warning`);
      
      const eventBus = require('./eventBusService');
      await eventBus.publishEvent({
        eventType: 'SLA_BREACH',
        category: 'System',
        source: 'WorkflowEngine',
        payload: { taskId: appr.task_id, executionId: appr.execution_id, newLevel: 'Warning' }
      });
    }
  }
  
  return { escalatedCount: pendingApprovals.length };
};

module.exports = {
  handleEventTrigger,
  executePlaybook,
  processNextStep,
  processApproval,
  handleSLAEscalations
};

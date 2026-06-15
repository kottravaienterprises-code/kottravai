/**
 * eventBusService.js
 * Phase 7B: Organization-Wide Event Bus
 */

const db = require('../db');

/**
 * Standardized event schema enforcement per Phase 7B requirements.
 * Supported categories: Sales, Customer Success, Revenue, Security, Executive, System, Workflow
 */
const ALLOWED_CATEGORIES = ['Sales', 'Customer Success', 'Revenue', 'Security', 'Executive', 'System', 'Workflow'];

/**
 * Publishes an event to the system_events table and optionally triggers workflows.
 * @param {Object} event { eventType, category, source, actor, payload }
 * @returns {Object} published event record
 */
const publishEvent = async ({ eventType, category, source, actor = 'system', payload = {} }) => {
  if (!ALLOWED_CATEGORIES.includes(category)) {
    throw new Error(`Invalid event category: ${category}`);
  }

  const { rows } = await db.query(
    `INSERT INTO public.system_events (event_type, category, source, actor, payload)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [eventType, category, source, actor, JSON.stringify(payload)]
  );

  const publishedEvent = rows[0];
  console.log(`[EventBus] Published: ${eventType} (${category}) by ${actor}`);

  // In a full production system this might use RabbitMQ/Kafka.
  // For Phase 7B, we will trigger the workflow engine synchronously or via async deferral.
  const workflowEngine = require('./workflowEngineService');
  
  // Fire and forget workflow trigger so we don't block the event publisher
  workflowEngine.handleEventTrigger(publishedEvent).catch(err => {
    console.error(`[EventBus] Workflow trigger error for event ${publishedEvent.id}:`, err.message);
  });

  return publishedEvent;
};

/**
 * Retrieves a stream of events with optional filtering.
 */
const getEvents = async ({ limit = 50, category, eventType } = {}) => {
  let query = `SELECT * FROM public.system_events WHERE 1=1`;
  const params = [];

  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }
  if (eventType) {
    params.push(eventType);
    query += ` AND event_type = $${params.length}`;
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const { rows } = await db.query(query, params);
  return rows;
};

module.exports = {
  publishEvent,
  getEvents
};

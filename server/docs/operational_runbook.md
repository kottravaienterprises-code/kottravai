# Kottravai Operational Runbook

## 1. API Key Rotation Procedure
If an API key is compromised or needs routine rotation:
1. Generate a new `api_key_hash` and `hmac_secret`.
2. Insert the new key into `public.api_keys` with `status = 'ACTIVE'`.
3. Distribute the new key to the consumer.
4. Once the consumer confirms cutover, execute:
   `UPDATE public.api_keys SET status = 'REVOKED' WHERE id = '<old_key_id>';`

## 2. Event Bus DLQ (Dead Letter Queue) Replay
Events that fail processing multiple times transition to `DEAD_LETTER` in `public.event_audit_logs`.
To replay them:
1. Inspect the DLQ: `SELECT * FROM public.event_audit_logs WHERE status = 'DEAD_LETTER';`
2. Address the underlying system failure (e.g., Stripe API outage).
3. Trigger replay via admin API: `POST /admin/events/replay` (Orchestrates `eventBus.replayDeadLetterEvents()`).
4. Monitor logs for transition from `RETRYING` to `PROCESSED`.

## 3. Disaster Recovery (DR)
* **Database Loss**: Restore PostgreSQL from the latest PITR (Point-in-Time Recovery) snapshot. Re-trigger webhook deliveries for any events logged after the snapshot by re-publishing them via `POST /api/v1/events` using the source systems.
* **Cache/Redis Loss**: Kottravai Event Bus is primarily backed by PostgreSQL LISTEN/NOTIFY. Redis is transient and will self-heal upon restart.

## 4. Saga & Rollback Monitoring (Phase 8C)
Monitor the `public.saga_instances` table for workflows stuck in `COMPENSATING` or `FAILED` states.
* **Query**: `SELECT * FROM public.saga_instances WHERE status = 'FAILED';`
* **Resolution**: Manual intervention is required if compensating transactions (rollbacks) fail. Investigate external system states (e.g., Stripe Billing) and manually reconcile before marking the Saga as `RESOLVED_MANUALLY`.

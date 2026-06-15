-- 20260620_phase8b_api_webhooks_schema.sql

-- API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    hmac_secret VARCHAR(255) NOT NULL,
    rate_limit_per_min INT DEFAULT 60,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, REVOKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API Audit Logs
CREATE TABLE IF NOT EXISTS public.api_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consumer_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INT NOT NULL,
    ip_address VARCHAR(45),
    response_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Subscriptions
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_url TEXT NOT NULL,
    event_types JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["DEAL_WON", "ANOMALY_DETECTED"]
    hmac_secret VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Delivery Logs
CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
    event_id VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- SUCCESS, FAILED, RETRYING
    response_code INT,
    response_body TEXT,
    retry_count INT DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION phase8b_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER trg_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION phase8b_set_timestamp();

DROP TRIGGER IF EXISTS trg_webhook_subs_updated_at ON public.webhook_subscriptions;
CREATE TRIGGER trg_webhook_subs_updated_at
BEFORE UPDATE ON public.webhook_subscriptions
FOR EACH ROW EXECUTE FUNCTION phase8b_set_timestamp();

DROP TRIGGER IF EXISTS trg_webhook_logs_updated_at ON public.webhook_delivery_logs;
CREATE TRIGGER trg_webhook_logs_updated_at
BEFORE UPDATE ON public.webhook_delivery_logs
FOR EACH ROW EXECUTE FUNCTION phase8b_set_timestamp();

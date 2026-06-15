BEGIN;

-- 1. Extend users table for CRM role and regional team mappings
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'REPRESENTATIVE',
ADD COLUMN IF NOT EXISTS team VARCHAR(100);

-- Ensure valid roles constraint
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS chk_user_role,
ADD CONSTRAINT chk_user_role CHECK (role IN ('SUPER_ADMIN', 'MANAGER', 'REPRESENTATIVE', 'AUDITOR', 'USER'));

-- 2. Extend leads table to include team context
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS team VARCHAR(100);

-- Ensure valid lead teams constraint
ALTER TABLE public.leads
DROP CONSTRAINT IF EXISTS chk_lead_team,
ADD CONSTRAINT chk_lead_team CHECK (team IN ('Domestic', 'APAC', 'EMEA', 'AMER') OR team IS NULL);

-- 3. Ensure admin_audit_logs table exists and extend it
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.admin_audit_logs
ADD COLUMN IF NOT EXISTS role VARCHAR(50),
ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 4. Create performance indexing for compliance searches
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON public.admin_audit_logs(resource);

-- 5. Hardening: Implement append-only rules for admin_audit_logs
DROP RULE IF EXISTS no_update_audit_logs ON public.admin_audit_logs;
CREATE RULE no_update_audit_logs AS 
ON UPDATE TO public.admin_audit_logs 
DO INSTEAD NOTHING;

DROP RULE IF EXISTS no_delete_audit_logs ON public.admin_audit_logs;
CREATE RULE no_delete_audit_logs AS 
ON DELETE TO public.admin_audit_logs 
DO INSTEAD NOTHING;

COMMIT;

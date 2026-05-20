-- ── Migration 016 — Audit Logs (SOC 2 / GDPR) ───────────────────────────────
--
-- Creates an immutable audit_logs table to record all create/update/delete
-- operations on sensitive resources (leads, deals, tenants, users).
--
-- Design:
--   • No RLS — audit logs are readable by super-admin only (no per-tenant filter)
--   • Immutable — no UPDATE/DELETE grants (appended-only via trigger or service)
--   • Retained for 2 years (managed by retention job in data_retention_policies)

CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID,                    -- null if system action
  action       VARCHAR(50) NOT NULL,    -- 'create' | 'update' | 'delete' | 'read' | 'login' | 'export'
  resource     VARCHAR(100) NOT NULL,   -- 'lead' | 'deal' | 'user' | 'funnel' | 'api_key' ...
  resource_id  VARCHAR(255),            -- UUID or slug of affected resource
  changes      JSONB        DEFAULT '{}', -- { before: {...}, after: {...} }
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  status       VARCHAR(20)  DEFAULT 'success', -- 'success' | 'failure'
  reason       TEXT,                    -- failure reason
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Index for audit trail queries
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created   ON audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource         ON audit_logs (resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action           ON audit_logs (action);

COMMENT ON TABLE audit_logs IS
  'Immutable audit trail for SOC 2 / GDPR compliance. Retained 2 years.';

-- ── Data retention policies ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,  -- null = global policy
  resource    VARCHAR(100) NOT NULL,   -- 'audit_logs' | 'leads' | 'conversations' | 'lead_events'
  retention_days INT       NOT NULL DEFAULT 730,  -- 2 years
  auto_delete BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, resource)
);

-- Insert global defaults
INSERT INTO data_retention_policies (tenant_id, resource, retention_days, auto_delete)
VALUES
  (NULL, 'audit_logs',    730,  false),  -- 2 years, manual review required
  (NULL, 'lead_events',   365,  true),   -- 1 year, auto-purge
  (NULL, 'conversations', 365,  false),  -- 1 year, manual
  (NULL, 'leads',         1825, false)   -- 5 years
ON CONFLICT (tenant_id, resource) DO NOTHING;

COMMENT ON TABLE data_retention_policies IS
  'Configures data retention periods per resource type, per tenant (or global).';

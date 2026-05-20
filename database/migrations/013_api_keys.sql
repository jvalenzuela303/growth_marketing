-- ─── 013_api_keys.sql ────────────────────────────────────────────────────────
-- API keys for external integrations. Keys are stored as SHA-256 hashes;
-- only the prefix (first 8 chars) is shown after creation.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  key_hash     TEXT        NOT NULL UNIQUE,   -- SHA-256 of the raw key
  key_prefix   VARCHAR(12) NOT NULL,          -- first 8 chars for display
  scopes       TEXT[]      NOT NULL DEFAULT '{}',  -- e.g. {leads:read, leads:write}
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at   TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON api_keys;
CREATE POLICY tenant_isolation ON api_keys
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash   ON api_keys(key_hash) WHERE revoked_at IS NULL AND is_active;

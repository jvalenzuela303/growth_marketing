-- ──────────────────────────────────────────────────────────────────────────────
-- 014_push_subscriptions.sql
-- Web Push suscripciones por usuario/tenant para notificaciones PWA
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant
  ON push_subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions(user_id);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_tenant_isolation ON push_subscriptions;
CREATE POLICY push_subscriptions_tenant_isolation ON push_subscriptions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_push_subscriptions_updated_at();

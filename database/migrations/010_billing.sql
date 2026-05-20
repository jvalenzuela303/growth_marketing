-- ============================================================
-- Migration 010 — Billing (Stripe integration)
-- Tracks subscriptions, invoices, and plan enforcement.
-- ============================================================

-- ── Subscriptions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Stripe identifiers
  stripe_customer_id  VARCHAR(255)  NOT NULL,
  stripe_sub_id       VARCHAR(255)  UNIQUE,            -- null while pending
  stripe_price_id     VARCHAR(255),

  -- Plan mirror (source of truth is Stripe, this is a cache for fast reads)
  plan                VARCHAR(50)   NOT NULL DEFAULT 'starter',
  status              VARCHAR(50)   NOT NULL DEFAULT 'trialing',
    -- trialing | active | past_due | canceled | incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN      NOT NULL DEFAULT false,
  trial_end            TIMESTAMPTZ,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_tenant
  ON subscriptions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON subscriptions(stripe_customer_id);

-- ── Invoices ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id     UUID          REFERENCES subscriptions(id)   ON DELETE SET NULL,

  stripe_invoice_id   VARCHAR(255)  UNIQUE NOT NULL,
  stripe_customer_id  VARCHAR(255)  NOT NULL,

  amount_due          NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid         NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency            VARCHAR(3)    NOT NULL DEFAULT 'usd',
  status              VARCHAR(50)   NOT NULL DEFAULT 'draft',
    -- draft | open | paid | void | uncollectible
  hosted_invoice_url  TEXT,
  invoice_pdf_url     TEXT,
  period_start        TIMESTAMPTZ,
  period_end          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant
  ON invoices(tenant_id, created_at DESC);

-- RLS

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_subscriptions ON subscriptions;
CREATE POLICY tenant_isolation_subscriptions ON subscriptions
  USING (tenant_id::text = current_setting('app.tenant_id', true));

DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- updated_at triggers

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();

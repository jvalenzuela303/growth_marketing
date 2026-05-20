-- ============================================================
-- Migration 009 — Deals / Revenue Attribution
-- Tracks closed sales tied to leads and ad campaigns.
-- Enables real ROAS calculation: SUM(revenue) / SUM(ad_spend).
-- ============================================================

CREATE TABLE IF NOT EXISTS deals (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id         UUID          NOT NULL REFERENCES leads(id)   ON DELETE CASCADE,

  -- Revenue
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency        VARCHAR(3)    NOT NULL DEFAULT 'CLP',

  -- Attribution
  funnel_id       UUID          REFERENCES funnels(id)         ON DELETE SET NULL,
  ads_account_id  UUID          REFERENCES ads_accounts(id)    ON DELETE SET NULL,
  campaign_name   VARCHAR(255),
  source          VARCHAR(100)  DEFAULT 'manual',   -- manual | meta_ads | google_ads | organic

  -- Stage
  stage           VARCHAR(50)   NOT NULL DEFAULT 'won'          -- won | lost | refunded
    CHECK (stage IN ('won','lost','refunded')),

  closed_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  notes           TEXT,

  created_by      UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_tenant         ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_lead           ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_closed_at      ON deals(tenant_id, closed_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_ads_account    ON deals(ads_account_id) WHERE ads_account_id IS NOT NULL;

-- RLS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_deals ON deals;
CREATE POLICY tenant_isolation_deals ON deals
  USING (tenant_id::text = current_setting('app.tenant_id', true));

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deals_updated_at ON deals;
CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_deals_updated_at();

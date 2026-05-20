-- ============================================================
-- MIGRATION 008 — Ads Accounts: multi-account ads management
-- Replaces single tenant.ad_account_id with a proper entity
-- Idempotent: safe to run multiple times
-- ============================================================

-- ============================================================
-- ADS ACCOUNTS table
-- Stores multiple ad platform accounts per tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS ads_accounts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID        NOT NULL,
    name                VARCHAR(255) NOT NULL,
    platform            VARCHAR(20) NOT NULL DEFAULT 'meta',  -- meta | google | tiktok | linkedin
    external_account_id VARCHAR(255) NOT NULL,
    access_token        TEXT,        -- stored as-is; encrypt at application layer
    status              VARCHAR(20) NOT NULL DEFAULT 'active', -- active | paused | disconnected | error
    is_default          BOOLEAN     NOT NULL DEFAULT FALSE,
    last_synced_at      TIMESTAMPTZ,
    sync_error_message  TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ads_accounts_tenant_platform_external
        UNIQUE (tenant_id, platform, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ads_accounts_tenant
    ON ads_accounts(tenant_id, status);

-- Row-Level Security
ALTER TABLE ads_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ads_accounts'
          AND policyname = 'tenant_isolation_ads_accounts'
    ) THEN
        CREATE POLICY tenant_isolation_ads_accounts ON ads_accounts
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

CREATE OR REPLACE TRIGGER ads_accounts_updated_at
    BEFORE UPDATE ON ads_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Link ad_campaigns to ads_accounts (nullable for backwards compat)
-- ============================================================
ALTER TABLE ad_campaigns
    ADD COLUMN IF NOT EXISTS ads_account_id UUID REFERENCES ads_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_ads_account
    ON ad_campaigns(ads_account_id);

-- ============================================================
-- Migrate existing tenants: promote tenant.ad_account_id → ads_accounts row
-- Only creates the row if tenant has a non-null ad_account_id
-- ============================================================
INSERT INTO ads_accounts (tenant_id, name, platform, external_account_id, status, is_default)
SELECT
    id                           AS tenant_id,
    COALESCE(name, slug) || ' — Meta Ads' AS name,
    'meta'                       AS platform,
    ad_account_id                AS external_account_id,
    'active'                     AS status,
    TRUE                         AS is_default
FROM tenants
WHERE ad_account_id IS NOT NULL
ON CONFLICT (tenant_id, platform, external_account_id) DO NOTHING;

-- Back-fill: link existing campaigns to the newly created account row
UPDATE ad_campaigns c
SET ads_account_id = (
    SELECT a.id FROM ads_accounts a
    WHERE a.tenant_id = c.tenant_id
      AND a.platform  = c.platform
    ORDER BY a.is_default DESC, a.created_at ASC
    LIMIT 1
)
WHERE c.ads_account_id IS NULL;

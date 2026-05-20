-- ============================================================
-- MIGRATION 007 — Iteration 3: Appointments, Ad campaign sync,
--                 Audience exports, and A/B funnel variants
-- Idempotent: safe to run multiple times
-- ============================================================

-- ============================================================
-- Tenant integration fields (Iteration 3 additions)
-- ============================================================
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS ad_account_id                VARCHAR(100);

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS meta_instagram_page_id       VARCHAR(100);

-- Stored encrypted at rest; never logged
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS meta_instagram_access_token  TEXT;

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS google_calendar_refresh_token TEXT;

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS calendly_api_key             TEXT;

-- ============================================================
-- FUNNEL VARIANTS (A/B testing)
-- Each funnel can have multiple variants splitting traffic
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_variants (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id        UUID NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL,
    name             VARCHAR(100) NOT NULL,
    -- Integer percentage 0-100; all active variants must sum to 100
    traffic_split    INTEGER NOT NULL,
    -- Per-variant config overrides (null = use funnel-level config)
    quiz_config      JSONB,
    landing_config   JSONB,
    results_config   JSONB,
    -- Exactly one variant per funnel should have is_control = TRUE
    is_control       BOOLEAN NOT NULL DEFAULT FALSE,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    -- Cached metrics (updated by background job)
    total_views       INTEGER NOT NULL DEFAULT 0,
    total_starts      INTEGER NOT NULL DEFAULT 0,
    total_completions INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_funnel
    ON funnel_variants(funnel_id, is_active);

ALTER TABLE funnel_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'funnel_variants'
          AND policyname = 'tenant_isolation_funnel_variants'
    ) THEN
        CREATE POLICY tenant_isolation_funnel_variants ON funnel_variants
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

CREATE TRIGGER funnel_variants_updated_at
    BEFORE UPDATE ON funnel_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Funnel-level A/B flag
ALTER TABLE funnels
    ADD COLUMN IF NOT EXISTS ab_test_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- Lead variant assignment
-- ============================================================
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES funnel_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_variant
    ON leads(variant_id) WHERE variant_id IS NOT NULL;

-- ============================================================
-- APPOINTMENTS
-- Calendar scheduling: video calls, calls, in-person meetings
-- ============================================================
CREATE TABLE IF NOT EXISTS appointments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id           UUID NOT NULL REFERENCES leads(id)   ON DELETE CASCADE,
    scheduled_at      TIMESTAMPTZ NOT NULL,
    duration_mins     INTEGER     NOT NULL DEFAULT 30,
    -- Status: scheduled / confirmed / cancelled / no_show / completed
    status            VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    -- Channel: video_call / phone_call / in_person / webinar
    channel           VARCHAR(30) NOT NULL DEFAULT 'video_call',
    meeting_url       TEXT,
    notes             TEXT,
    -- External calendar event ID (Google Calendar, Calendly, etc.)
    calendar_event_id VARCHAR(255),
    reminder_sent_at  TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant
    ON appointments(tenant_id, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_lead
    ON appointments(lead_id);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'appointments'
          AND policyname = 'tenant_isolation_appointments'
    ) THEN
        CREATE POLICY tenant_isolation_appointments ON appointments
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AD CAMPAIGNS
-- Synced from Meta Ads / Google Ads API
-- One row per external campaign, upserted on each sync
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Platform-assigned campaign ID
    external_id   VARCHAR(255) NOT NULL,
    name          VARCHAR(255) NOT NULL,
    -- Status mirrors platform value: ACTIVE / PAUSED / DELETED / ARCHIVED
    status        VARCHAR(20)  NOT NULL,
    objective     VARCHAR(100),
    budget_daily  NUMERIC(14, 2),
    budget_total  NUMERIC(14, 2),
    -- Platform: meta / google / tiktok / linkedin
    platform      VARCHAR(20)  NOT NULL DEFAULT 'meta',
    last_synced_at TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ad_campaign_tenant_external UNIQUE (tenant_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status
    ON ad_campaigns(tenant_id, status);

ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ad_campaigns'
          AND policyname = 'tenant_isolation_ad_campaigns'
    ) THEN
        CREATE POLICY tenant_isolation_ad_campaigns ON ad_campaigns
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

CREATE TRIGGER ad_campaigns_updated_at
    BEFORE UPDATE ON ad_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AD CAMPAIGN METRICS
-- Daily snapshot of performance metrics per campaign
-- Partitioned logically by (campaign_id, date) unique key
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_campaign_metrics (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID    NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
    tenant_id   UUID    NOT NULL,
    date        DATE    NOT NULL,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks      INTEGER NOT NULL DEFAULT 0,
    spend       NUMERIC(14, 2) NOT NULL,
    leads       INTEGER NOT NULL DEFAULT 0,
    reach       INTEGER NOT NULL DEFAULT 0,
    frequency   NUMERIC(6,  2) NOT NULL DEFAULT 0,  -- avg times a person saw the ad
    cpm         NUMERIC(10, 4) NOT NULL DEFAULT 0,  -- cost per thousand impressions
    cpc         NUMERIC(10, 4) NOT NULL DEFAULT 0,  -- cost per click
    ctr         NUMERIC(6,  4) NOT NULL DEFAULT 0,  -- click-through rate (0.0000–1.0000)
    CONSTRAINT uq_campaign_metric_date UNIQUE (campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_tenant
    ON ad_campaign_metrics(tenant_id);

ALTER TABLE ad_campaign_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ad_campaign_metrics'
          AND policyname = 'tenant_isolation_ad_campaign_metrics'
    ) THEN
        CREATE POLICY tenant_isolation_ad_campaign_metrics ON ad_campaign_metrics
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

-- No updated_at trigger needed — rows are replaced via upsert, never mutated

-- ============================================================
-- AUDIENCE EXPORTS
-- Logs of custom audience pushes to Meta Ads Manager
-- ============================================================
CREATE TABLE IF NOT EXISTS audience_exports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    -- Type: lookalike / custom / retargeting
    type             VARCHAR(30) NOT NULL,
    -- Segment filter used: fuego / caliente / tibio / frio / all
    segment          VARCHAR(20) NOT NULL,
    -- Meta custom audience ID returned after creation
    meta_audience_id VARCHAR(100),
    lead_count       INTEGER     NOT NULL,
    -- Status: pending / processing / completed / failed
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message    TEXT,
    exported_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audience_exports_tenant
    ON audience_exports(tenant_id);

ALTER TABLE audience_exports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audience_exports'
          AND policyname = 'tenant_isolation_audience_exports'
    ) THEN
        CREATE POLICY tenant_isolation_audience_exports ON audience_exports
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

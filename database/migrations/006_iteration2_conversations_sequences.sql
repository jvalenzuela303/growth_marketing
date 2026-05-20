-- ============================================================
-- MIGRATION 006 — Iteration 2: Chat sessions, email sequences,
--                 sequence enrollments, and ad spend tracking
-- Idempotent: safe to run multiple times
-- ============================================================

-- ============================================================
-- CHAT SESSIONS
-- Tracks stateful chat context per lead per channel
-- (whatsapp, webchat, sms, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id         UUID NOT NULL REFERENCES leads(id)   ON DELETE CASCADE,
    -- Channel: whatsapp / webchat / sms / messenger
    channel         VARCHAR(20) NOT NULL,
    -- Status: active / closed / expired
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    -- Arbitrary context blob (AI memory, collected vars, etc.)
    context         JSONB NOT NULL DEFAULT '{}',
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead
    ON chat_sessions(lead_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant_status
    ON chat_sessions(tenant_id, status);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'chat_sessions'
          AND policyname = 'tenant_isolation_chat_sessions'
    ) THEN
        CREATE POLICY tenant_isolation_chat_sessions ON chat_sessions
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

-- ============================================================
-- EMAIL SEQUENCES
-- Automated drip sequences triggered by lead segment / score
-- ============================================================
CREATE TABLE IF NOT EXISTS email_sequences (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    funnel_id        UUID REFERENCES funnels(id) ON DELETE SET NULL,
    name             VARCHAR(255) NOT NULL,
    -- Trigger type: lead_captured / segment_change / manual / score_threshold
    trigger          VARCHAR(50) NOT NULL,
    -- Array of segment names this sequence activates for
    trigger_segments TEXT[]      NOT NULL DEFAULT '{}',
    -- Optional score gate (inclusive range)
    min_score        INTEGER,
    max_score        INTEGER,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    -- Array of step objects: {delay_hours, subject, body_html, from_name, ...}
    steps            JSONB   NOT NULL DEFAULT '[]',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_seq_tenant
    ON email_sequences(tenant_id, is_active);

ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'email_sequences'
          AND policyname = 'tenant_isolation_email_sequences'
    ) THEN
        CREATE POLICY tenant_isolation_email_sequences ON email_sequences
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

CREATE TRIGGER email_sequences_updated_at
    BEFORE UPDATE ON email_sequences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EMAIL SEQUENCE ENROLLMENTS
-- One row per (sequence, lead) pair — tracks send progress
-- ============================================================
CREATE TABLE IF NOT EXISTS email_sequence_enrollments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id   UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
    lead_id       UUID NOT NULL REFERENCES leads(id)           ON DELETE CASCADE,
    tenant_id     UUID NOT NULL,
    current_step  INTEGER     NOT NULL DEFAULT 0,
    -- Status: active / paused / completed / unsubscribed / bounced
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_send_at  TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    -- Prevent duplicate enrollment in the same sequence
    CONSTRAINT uq_enrollment UNIQUE (sequence_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollment_next_send
    ON email_sequence_enrollments(tenant_id, next_send_at)
    WHERE status = 'active' AND next_send_at IS NOT NULL;

ALTER TABLE email_sequence_enrollments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'email_sequence_enrollments'
          AND policyname = 'tenant_isolation_email_sequence_enrollments'
    ) THEN
        CREATE POLICY tenant_isolation_email_sequence_enrollments
            ON email_sequence_enrollments
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

-- ============================================================
-- AD SPEND
-- Manual or API-imported spend records per source / campaign
-- Used for ROI / CPL calculations in the analytics dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS ad_spend (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    funnel_id     UUID    REFERENCES funnels(id)          ON DELETE SET NULL,
    -- Platform: meta / google / tiktok / linkedin / other
    source        VARCHAR(50) NOT NULL,
    campaign_id   VARCHAR(255),
    campaign_name VARCHAR(255),
    spend_amount  NUMERIC(14, 2) NOT NULL,
    currency      VARCHAR(3)     NOT NULL DEFAULT 'CLP',
    impressions   INTEGER NOT NULL DEFAULT 0,
    clicks        INTEGER NOT NULL DEFAULT 0,
    -- Inclusive date range the spend covers
    period_start  DATE NOT NULL,
    period_end    DATE NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_spend_tenant_period
    ON ad_spend(tenant_id, period_start);

ALTER TABLE ad_spend ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'ad_spend'
          AND policyname = 'tenant_isolation_ad_spend'
    ) THEN
        CREATE POLICY tenant_isolation_ad_spend ON ad_spend
            USING (tenant_id = current_setting('app.tenant_id', true)::UUID);
    END IF;
END;
$$;

CREATE TRIGGER ad_spend_updated_at
    BEFORE UPDATE ON ad_spend
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

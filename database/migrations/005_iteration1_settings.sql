-- ============================================================
-- MIGRATION 005 — Iteration 1: Tenant notification settings
-- Idempotent: safe to run multiple times
-- ============================================================

-- Alert email for hot lead notifications
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS alert_email VARCHAR(255);

-- Toggle: send real-time email when a hot lead (fuego/caliente) is captured
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS hot_lead_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- Toggle: send daily digest summary email to the tenant's alert address
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS daily_digest_enabled BOOLEAN NOT NULL DEFAULT FALSE;

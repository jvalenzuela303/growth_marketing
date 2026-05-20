-- ─── 011_automation_flows.sql ────────────────────────────────────────────────
-- Visual drag-and-drop automation flow builder.
-- Each flow is a JSON graph (nodes + edges) executed by the worker when
-- triggered (lead.captured, score.updated, manual).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS automation_flows (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  trigger      TEXT        NOT NULL DEFAULT 'manual',   -- manual | lead.captured | score.updated | schedule
  status       TEXT        NOT NULL DEFAULT 'draft',    -- draft | active | paused
  graph        JSONB       NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  last_run_at  TIMESTAMPTZ,
  run_count    INT         NOT NULL DEFAULT 0,
  created_by   UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- RLS
ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON automation_flows;
CREATE POLICY tenant_isolation ON automation_flows
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_flows_tenant  ON automation_flows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_flows_status  ON automation_flows(tenant_id, status) WHERE deleted_at IS NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_automation_flows_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_automation_flows_updated_at ON automation_flows;
CREATE TRIGGER trg_automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW EXECUTE FUNCTION update_automation_flows_updated_at();

-- Execution log
CREATE TABLE IF NOT EXISTS automation_flow_runs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id     UUID        NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  lead_id     UUID,
  status      TEXT        NOT NULL DEFAULT 'running',  -- running | completed | failed
  log         JSONB       NOT NULL DEFAULT '[]',
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flow_runs_flow   ON automation_flow_runs(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_runs_tenant ON automation_flow_runs(tenant_id);

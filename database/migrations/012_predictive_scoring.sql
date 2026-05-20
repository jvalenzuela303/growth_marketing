-- ─── 012_predictive_scoring.sql ──────────────────────────────────────────────
-- Adds ML predictive scoring fields to the leads table.
-- conversion_probability: 0.0000–1.0000 from the AI Engine /predict endpoint
-- conversion_label:       alto | medio | bajo
-- prediction_updated_at:  when the prediction was last computed
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS conversion_probability NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS conversion_label       VARCHAR(10),
  ADD COLUMN IF NOT EXISTS prediction_updated_at  TIMESTAMPTZ;

-- Index for sorting leads by predicted conversion in the UI
CREATE INDEX IF NOT EXISTS idx_leads_conversion_prob
  ON leads(tenant_id, conversion_probability DESC NULLS LAST)
  WHERE deleted_at IS NULL;

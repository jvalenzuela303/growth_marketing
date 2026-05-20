-- ============================================================
-- LEADS (prospectos capturados)
-- ============================================================
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
    -- Datos personales
    email VARCHAR(255),
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company VARCHAR(255),
    -- Scoring
    quiz_score INTEGER DEFAULT 0 CHECK (quiz_score BETWEEN 0 AND 40),
    behavior_score INTEGER DEFAULT 0 CHECK (behavior_score BETWEEN 0 AND 30),
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 20),
    demographic_score INTEGER DEFAULT 0 CHECK (demographic_score BETWEEN 0 AND 10),
    total_score INTEGER GENERATED ALWAYS AS (quiz_score + behavior_score + engagement_score + demographic_score) STORED,
    score_updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Clasificación IA
    segment VARCHAR(20) DEFAULT 'sin_clasificar', -- fuego/caliente/tibio/frio/motor_detenido
    pathology VARCHAR(100),  -- 'consciente_problema', 'buscando_solucion', etc.
    pathology_confidence NUMERIC(4,3), -- 0.000 a 1.000
    classified_at TIMESTAMPTZ,
    classified_model VARCHAR(50), -- 'claude-sonnet-4-6', 'gpt-4o-mini', etc.
    -- Origen
    source VARCHAR(50) DEFAULT 'direct', -- meta_ads/organic/referral/email/whatsapp
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(255),
    utm_content VARCHAR(255),
    meta_fbclid VARCHAR(255),
    meta_fbp VARCHAR(255),
    meta_fbc VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    -- Estado CRM
    pipeline_stage VARCHAR(50) DEFAULT 'nuevo', -- nuevo/calificado/contactado/propuesta/negociacion/cerrado_ganado/cerrado_perdido
    pipeline_stage_updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Respuestas y comportamiento
    quiz_answers JSONB DEFAULT '{}',
    quiz_completed_at TIMESTAMPTZ,
    quiz_completion_percentage INTEGER DEFAULT 0,
    behavior_data JSONB DEFAULT '{
        "visits": 0,
        "pricing_page_clicks": 0,
        "total_time_seconds": 0,
        "email_opens": 0,
        "email_clicks": 0,
        "whatsapp_replies": 0
    }',
    -- Notas y tags
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    -- Alertas
    hot_lead_alert_sent_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Índices críticos para performance (del documento de arquitectura)
CREATE INDEX idx_leads_tenant_score ON leads(tenant_id, total_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_tenant_segment ON leads(tenant_id, segment) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_tenant_stage ON leads(tenant_id, pipeline_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_tenant_created ON leads(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_funnel ON leads(funnel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON leads(tenant_id, email) WHERE email IS NOT NULL;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_leads ON leads
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE TRIGGER leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: actualizar pipeline_stage_updated_at cuando cambia el stage
CREATE OR REPLACE FUNCTION update_pipeline_stage_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
        NEW.pipeline_stage_updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_pipeline_stage_timestamp
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_pipeline_stage_timestamp();

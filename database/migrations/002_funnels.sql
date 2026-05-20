-- ============================================================
-- FUNNELS (embudos de marketing)
-- ============================================================
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    -- Configuración del quiz
    quiz_config JSONB NOT NULL DEFAULT '{
        "title": "Diagnóstico de Eficiencia",
        "description": "",
        "questions": [],
        "lead_gate_position": 5,
        "completion_redirect": null
    }',
    -- Configuración de landing page
    landing_config JSONB NOT NULL DEFAULT '{
        "headline": "",
        "subheadline": "",
        "cta_text": "Hacer el diagnóstico gratis",
        "theme": "default",
        "logo_url": null,
        "custom_css": null
    }',
    -- Configuración de resultados
    results_config JSONB NOT NULL DEFAULT '{
        "segments": {
            "fuego": {"headline": "", "cta": "", "urgency": ""},
            "caliente": {"headline": "", "cta": "", "urgency": ""},
            "tibio": {"headline": "", "cta": "", "urgency": ""},
            "frio": {"headline": "", "cta": "", "urgency": ""},
            "motor_detenido": {"headline": "", "cta": "", "urgency": ""}
        }
    }',
    -- Reglas de scoring personalizadas (sobreescribe defaults)
    scoring_rules JSONB DEFAULT NULL,
    -- Estado
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft/active/paused/archived
    published_at TIMESTAMPTZ,
    -- Métricas (cache, se actualiza periódicamente)
    total_views INTEGER DEFAULT 0,
    total_starts INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

CREATE INDEX idx_funnels_tenant ON funnels(tenant_id);
CREATE INDEX idx_funnels_status ON funnels(tenant_id, status);

ALTER TABLE funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_funnels ON funnels
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

CREATE TRIGGER funnels_updated_at
    BEFORE UPDATE ON funnels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

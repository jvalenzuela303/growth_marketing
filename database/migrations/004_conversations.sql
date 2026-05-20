-- ============================================================
-- CONVERSATIONS (historial de mensajes WhatsApp/Email/Chat)
-- ============================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    -- Canal y dirección
    channel VARCHAR(20) NOT NULL, -- whatsapp/email/chat/sms
    role VARCHAR(15) NOT NULL,    -- user/assistant/human_agent/system
    -- Contenido
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text', -- text/image/document/audio
    -- Vector para búsqueda semántica (pgvector)
    embedding vector(1536),
    -- Metadatos del mensaje
    metadata JSONB DEFAULT '{}',
    -- Estado de envío
    status VARCHAR(20) DEFAULT 'sent', -- pending/sent/delivered/read/failed
    external_message_id VARCHAR(255), -- ID del mensaje en WhatsApp/SendGrid
    -- IA info
    ai_model VARCHAR(50),       -- qué modelo generó la respuesta (si es assistant)
    ai_tokens_used INTEGER,
    ai_latency_ms INTEGER,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Soft delete para cumplimiento de privacidad
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_conv_lead ON conversations(lead_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conv_tenant ON conversations(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_conv_channel ON conversations(tenant_id, channel, created_at DESC);
-- Índice para búsqueda vectorial (cosine similarity)
CREATE INDEX idx_conv_embedding ON conversations USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_conversations ON conversations
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ============================================================
-- LEAD_EVENTS (eventos de comportamiento para analytics)
-- ============================================================
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL,
    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL,
    -- Tipos: page_view/quiz_start/quiz_step_complete/quiz_complete/
    --        lead_gate_view/lead_gate_submit/results_view/cta_click/
    --        email_open/email_click/whatsapp_sent/whatsapp_delivered/
    --        whatsapp_read/whatsapp_reply/score_calculated/segment_assigned/
    --        pipeline_stage_change/hot_lead_alert
    event_data JSONB DEFAULT '{}',
    -- Atribución
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Particiones mensuales para performance en analytics
CREATE TABLE lead_events_2026_01 PARTITION OF lead_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE lead_events_2026_02 PARTITION OF lead_events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE lead_events_2026_03 PARTITION OF lead_events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE lead_events_2026_04 PARTITION OF lead_events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE lead_events_2026_05 PARTITION OF lead_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE lead_events_2026_06 PARTITION OF lead_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE lead_events_2026_07 PARTITION OF lead_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE lead_events_2026_08 PARTITION OF lead_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE lead_events_2026_09 PARTITION OF lead_events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE lead_events_2026_10 PARTITION OF lead_events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE lead_events_2026_11 PARTITION OF lead_events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE lead_events_2026_12 PARTITION OF lead_events
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE lead_events_default PARTITION OF lead_events DEFAULT;

CREATE INDEX idx_events_tenant_type ON lead_events(tenant_id, event_type, created_at DESC);
CREATE INDEX idx_events_lead ON lead_events(lead_id, created_at DESC);
CREATE INDEX idx_events_funnel ON lead_events(funnel_id, event_type, created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_events ON lead_events
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- ============================================================
-- TENANTS (clientes del SaaS)
-- ============================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter/growth/scale/agency
    -- Límites del plan
    max_funnels INTEGER DEFAULT 1,
    max_leads_per_month INTEGER DEFAULT 500,
    max_whatsapp_messages INTEGER DEFAULT 500,
    -- Integraciones
    meta_pixel_id VARCHAR(50),
    meta_capi_token TEXT,
    meta_whatsapp_phone_id VARCHAR(50),
    meta_whatsapp_token TEXT,
    sendgrid_api_key TEXT,
    -- CRM
    ghl_api_key TEXT,
    ghl_location_id VARCHAR(100),
    hubspot_api_key TEXT,
    -- Configuración
    timezone VARCHAR(50) DEFAULT 'America/Santiago',
    currency VARCHAR(3) DEFAULT 'CLP',
    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (equipo del tenant)
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner/admin/member/viewer
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL, -- SHA-256 del token
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ============================================================
-- Row-Level Security (RLS) - CRÍTICO para multi-tenancy
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

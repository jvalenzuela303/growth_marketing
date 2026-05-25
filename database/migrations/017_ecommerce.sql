-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 017: E-commerce — products, carts, cart_items
-- RLS enforced via app.tenant_id session variable (same pattern as other tables)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Products ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id     VARCHAR(255) NOT NULL,
  platform        VARCHAR(20) NOT NULL DEFAULT 'manual',   -- shopify | woocommerce | manual
  name            VARCHAR(500) NOT NULL,
  sku             VARCHAR(100),
  price           DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(3)  NOT NULL DEFAULT 'CLP',
  image_url       TEXT,
  product_url     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_products_tenant_platform_external UNIQUE (tenant_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_products_tenant   ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products (tenant_id, platform);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_tenant_isolation ON products;
CREATE POLICY products_tenant_isolation ON products
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ── Carts ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carts (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id                 UUID        REFERENCES leads(id) ON DELETE SET NULL,
  external_id             VARCHAR(255),
  platform                VARCHAR(20) NOT NULL DEFAULT 'manual',
  email                   VARCHAR(255),
  phone                   VARCHAR(20),
  total_amount            DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency                VARCHAR(3)  NOT NULL DEFAULT 'CLP',
  status                  VARCHAR(20) NOT NULL DEFAULT 'open',  -- open | recovered | ordered | expired
  checkout_url            TEXT,
  recovery_alert_sent_at  TIMESTAMPTZ,
  ordered_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_carts_tenant_platform_external UNIQUE (tenant_id, platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_tenant_status ON carts (tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_carts_lead          ON carts (lead_id);
CREATE INDEX IF NOT EXISTS idx_carts_email         ON carts (tenant_id, email);

ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS carts_tenant_isolation ON carts;
CREATE POLICY carts_tenant_isolation ON carts
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ── Cart Items ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cart_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id     UUID        NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL,
  product_id  UUID        REFERENCES products(id) ON DELETE SET NULL,
  name        VARCHAR(500) NOT NULL,
  quantity    INT         NOT NULL DEFAULT 1,
  unit_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
  image_url   TEXT,
  product_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart   ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_tenant ON cart_items (tenant_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cart_items_tenant_isolation ON cart_items;
CREATE POLICY cart_items_tenant_isolation ON cart_items
  USING (tenant_id = current_setting('app.tenant_id', TRUE)::UUID);

-- ── Tenant: add e-commerce integration fields ─────────────────────────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS shopify_shop_domain     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS shopify_access_token    TEXT,
  ADD COLUMN IF NOT EXISTS shopify_webhook_secret  TEXT,
  ADD COLUMN IF NOT EXISTS woocommerce_url         VARCHAR(500),
  ADD COLUMN IF NOT EXISTS woocommerce_key         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS woocommerce_secret      TEXT,
  ADD COLUMN IF NOT EXISTS abandoned_cart_minutes  INT NOT NULL DEFAULT 30;

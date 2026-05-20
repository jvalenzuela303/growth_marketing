-- =============================================================
-- SEED DE DESARROLLO — usuario admin por defecto
-- Email:    admin@growthengine.io
-- Password: admin123
-- =============================================================

-- Tenant demo
INSERT INTO tenants (id, slug, name, plan, timezone, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo',
  'Growth Engine Demo',
  'starter',
  'America/Santiago',
  NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Usuario owner
INSERT INTO users (id, tenant_id, email, name, password_hash, role, is_active, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'admin@growthengine.io',
  'Admin',
  '$2b$12$KTkJo3Xb5UMBhaq/RDW8.uP6Q9XK3y5Fcs.g8QYr9K2/r5SNvpk9W',
  'owner',
  true,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

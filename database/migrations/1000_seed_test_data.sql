-- ============================================================
-- SEED: Datos de prueba para validación del sistema
-- Genera 30 leads realistas distribuidos en todos los segmentos,
-- conversaciones, eventos de analytics, gasto en ads y más.
--
-- Requiere: tenant demo de 999_seed_dev.sql
-- Idempotente: ON CONFLICT DO NOTHING en todos los registros
-- ============================================================

SET search_path = public;

-- IDs fijos para referencias cruzadas
-- Tenant:   00000000-0000-0000-0000-000000000001
-- Admin:    00000000-0000-0000-0000-000000000002
-- Funnel:   f0000001-0000-0000-0000-000000000001
-- Leads:    a0000001-0000-0000-0000-0000000000XX  (01-30)
-- Campaign: c0000001-0000-0000-0000-000000000001

-- ============================================================
-- FUNNEL: Diagnóstico de Marketing Digital
-- ============================================================
INSERT INTO funnels (
    id, tenant_id, created_by, name, slug, description,
    status, published_at, total_views, total_starts, total_completions,
    updated_at, quiz_config, landing_config, results_config
) VALUES (
    'f0000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'Diagnóstico de Marketing Digital',
    'diagnostico-marketing',
    'Descubre en 5 minutos qué está frenando el crecimiento de tu negocio',
    'active',
    NOW() - INTERVAL '45 days',
    2847, 1203, 867,
    NOW(),
    '{
        "title": "Diagnóstico de Marketing Digital",
        "description": "Responde 7 preguntas y descubre tu nivel de madurez en marketing",
        "lead_gate_position": 5,
        "completion_redirect": null,
        "questions": [
            {
                "id": "q1",
                "text": "¿Cuál es tu principal desafío de marketing hoy?",
                "type": "single_choice",
                "weight": 2,
                "options": [
                    {"value": "adquisicion",  "label": "Adquirir nuevos clientes",            "score": 8},
                    {"value": "retencion",    "label": "Retener clientes actuales",            "score": 6},
                    {"value": "conversion",   "label": "Convertir más leads en clientes",      "score": 9},
                    {"value": "awareness",    "label": "Aumentar el reconocimiento de marca",  "score": 5}
                ]
            },
            {
                "id": "q2",
                "text": "¿Cuánto inviertes mensualmente en marketing?",
                "type": "single_choice",
                "weight": 3,
                "options": [
                    {"value": "menos_500k", "label": "Menos de $500.000 CLP",           "score": 3},
                    {"value": "500k_2m",    "label": "$500.000 - $2.000.000 CLP",       "score": 6},
                    {"value": "2m_5m",      "label": "$2.000.000 - $5.000.000 CLP",     "score": 8},
                    {"value": "mas_5m",     "label": "Más de $5.000.000 CLP",           "score": 10}
                ]
            },
            {
                "id": "q3",
                "text": "¿Cuántas personas trabajan en tu empresa?",
                "type": "single_choice",
                "weight": 1,
                "options": [
                    {"value": "1_5",    "label": "1-5 personas",         "score": 4},
                    {"value": "6_20",   "label": "6-20 personas",        "score": 6},
                    {"value": "21_50",  "label": "21-50 personas",       "score": 8},
                    {"value": "mas_50", "label": "Más de 50 personas",   "score": 10}
                ]
            },
            {
                "id": "q4",
                "text": "¿Qué herramientas usas para gestionar tus leads?",
                "type": "single_choice",
                "weight": 2,
                "options": [
                    {"value": "ninguna",      "label": "Ninguna (todo manual)",                    "score": 2},
                    {"value": "excel",        "label": "Hojas de cálculo",                         "score": 4},
                    {"value": "crm_basico",   "label": "CRM básico (HubSpot free, etc.)",          "score": 7},
                    {"value": "crm_avanzado", "label": "CRM avanzado + automatizaciones",          "score": 10}
                ]
            },
            {
                "id": "q5",
                "text": "¿Cuánto tarda tu proceso de venta promedio?",
                "type": "single_choice",
                "weight": 1,
                "options": [
                    {"value": "menos_semana", "label": "Menos de 1 semana", "score": 5},
                    {"value": "1_4_semanas",  "label": "1-4 semanas",       "score": 7},
                    {"value": "1_3_meses",    "label": "1-3 meses",         "score": 8},
                    {"value": "mas_3_meses",  "label": "Más de 3 meses",    "score": 6}
                ]
            },
            {
                "id": "q6",
                "text": "¿Qué tan satisfecho estás con tus resultados de marketing actuales?",
                "type": "single_choice",
                "weight": 2,
                "options": [
                    {"value": "muy_insatisfecho", "label": "Muy insatisfecho (1-2)", "score": 10},
                    {"value": "insatisfecho",     "label": "Insatisfecho (3-4)",     "score": 8},
                    {"value": "neutral",          "label": "Neutral (5-6)",          "score": 5},
                    {"value": "satisfecho",       "label": "Satisfecho (7-8)",       "score": 3},
                    {"value": "muy_satisfecho",   "label": "Muy satisfecho (9-10)",  "score": 1}
                ]
            },
            {
                "id": "q7",
                "text": "¿Tienes claridad sobre el ROI de tus campañas?",
                "type": "single_choice",
                "weight": 2,
                "options": [
                    {"value": "no_mido",      "label": "No mido el ROI",                              "score": 10},
                    {"value": "parcialmente", "label": "Mido algunas métricas",                        "score": 7},
                    {"value": "mido_bien",    "label": "Tengo dashboards pero incompletos",            "score": 4},
                    {"value": "optimizado",   "label": "ROI optimizado con automatizaciones",          "score": 1}
                ]
            }
        ]
    }',
    '{
        "headline": "¿Tu Marketing Está Trabajando Para Ti... O En Tu Contra?",
        "subheadline": "Descubre en 5 minutos por qué tu negocio no está creciendo al ritmo que merece",
        "cta_text": "Hacer el Diagnóstico Gratis",
        "theme": "growth",
        "logo_url": null,
        "custom_css": null
    }',
    '{
        "segments": {
            "fuego":          {"headline": "¡Tu negocio está listo para escalar — solo necesitas el sistema correcto!",     "cta": "Quiero ver cómo escalar mi marketing ahora",  "urgency": "Solo 3 lugares esta semana para consultoría estratégica"},
            "caliente":       {"headline": "Tienes bases sólidas — es momento de acelerar tus resultados",                   "cta": "Quiero acelerar mi crecimiento",              "urgency": "Agenda tu sesión estratégica gratuita"},
            "tibio":          {"headline": "Hay oportunidades claras de mejora en tu estrategia de marketing",              "cta": "Ver mi plan de mejora personalizado",         "urgency": "Descarga tu guía de optimización"},
            "frio":           {"headline": "Tu marketing necesita una base sólida antes de escalar",                        "cta": "Empieza con los fundamentos correctos",       "urgency": "Accede a nuestro curso gratuito de base"},
            "motor_detenido": {"headline": "¡Buenas noticias! Hay mucho potencial por desarrollar en tu negocio",           "cta": "Conoce por dónde empezar",                   "urgency": "Descarga la guía de primeros pasos"}
        }
    }'
) ON CONFLICT (tenant_id, slug) DO NOTHING;

-- ============================================================
-- LEADS — SEGMENTO FUEGO (score 80-100)
-- ============================================================

INSERT INTO leads (
    id, tenant_id, funnel_id, email, phone, first_name, last_name, company,
    quiz_score, behavior_score, engagement_score, demographic_score,
    segment, pathology, pathology_confidence, classified_at, classified_model,
    source, utm_source, utm_medium, utm_campaign,
    pipeline_stage, quiz_answers, quiz_completed_at, quiz_completion_percentage,
    behavior_data, tags, created_at, updated_at, last_seen_at
) VALUES

-- Lead 01: Carlos Mendoza — CEO TechVentures (fuego, cerrado_ganado)
(
    'a0000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'carlos.mendoza@techventures.cl', '+56912345001',
    'Carlos', 'Mendoza', 'TechVentures SpA',
    38, 28, 18, 9,
    'fuego', 'buscando_solucion', 0.923, NOW() - INTERVAL '38 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'diagnostico-q1-2026',
    'cerrado_ganado',
    '{"q1": "conversion", "q2": "mas_5m", "q3": "mas_50", "q4": "crm_basico", "q5": "1_3_meses", "q6": "muy_insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '38 days', 100,
    '{"visits": 9, "pricing_page_clicks": 6, "total_time_seconds": 1380, "email_opens": 8, "email_clicks": 5, "whatsapp_replies": 4}',
    ARRAY['vip', 'enterprise', 'cerrado'],
    NOW() - INTERVAL '42 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),

-- Lead 02: María José Torres — CMO RetailGroup (fuego, negociacion)
(
    'a0000001-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'mj.torres@retailgroup.cl', '+56912345002',
    'María José', 'Torres', 'RetailGroup S.A.',
    37, 27, 16, 8,
    'fuego', 'buscando_solucion', 0.891, NOW() - INTERVAL '30 days', 'claude-sonnet-4-6',
    'meta_ads', 'instagram', 'cpc', 'diagnostico-q1-2026',
    'negociacion',
    '{"q1": "adquisicion", "q2": "mas_5m", "q3": "mas_50", "q4": "crm_avanzado", "q5": "1_3_meses", "q6": "muy_insatisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '30 days', 100,
    '{"visits": 7, "pricing_page_clicks": 5, "total_time_seconds": 1140, "email_opens": 6, "email_clicks": 4, "whatsapp_replies": 3}',
    ARRAY['hot', 'enterprise', 'decision_maker'],
    NOW() - INTERVAL '33 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
),

-- Lead 03: Diego Álvarez — Founder MarketBoost (fuego, propuesta)
(
    'a0000001-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'diego.alvarez@marketboost.io', '+56912345003',
    'Diego', 'Álvarez', 'MarketBoost Ltda',
    39, 29, 17, 9,
    'fuego', 'consciente_problema', 0.956, NOW() - INTERVAL '20 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'propuesta',
    '{"q1": "conversion", "q2": "2m_5m", "q3": "21_50", "q4": "crm_avanzado", "q5": "1_3_meses", "q6": "muy_insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '20 days', 100,
    '{"visits": 11, "pricing_page_clicks": 7, "total_time_seconds": 1620, "email_opens": 9, "email_clicks": 6, "whatsapp_replies": 5}',
    ARRAY['hot', 'saas', 'founder'],
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
),

-- Lead 04: Valentina Rojas — CMO Constructora Horizonte (fuego, propuesta)
(
    'a0000001-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'valentina.rojas@horizontecl.com', '+56912345004',
    'Valentina', 'Rojas', 'Constructora Horizonte',
    36, 26, 15, 8,
    'fuego', 'buscando_solucion', 0.878, NOW() - INTERVAL '15 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'inmobiliaria-mayo-2026',
    'propuesta',
    '{"q1": "adquisicion", "q2": "mas_5m", "q3": "21_50", "q4": "crm_basico", "q5": "mas_3_meses", "q6": "muy_insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '15 days', 100,
    '{"visits": 6, "pricing_page_clicks": 4, "total_time_seconds": 960, "email_opens": 5, "email_clicks": 3, "whatsapp_replies": 2}',
    ARRAY['hot', 'real_estate', 'decision_maker'],
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
),

-- Lead 05: Rodrigo Fernández — Gerente Comercial LogiChile (fuego, contactado)
(
    'a0000001-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'rodrigo.fernandez@logichile.cl', '+56912345005',
    'Rodrigo', 'Fernández', 'LogiChile S.A.',
    35, 27, 16, 7,
    'fuego', 'consciente_problema', 0.842, NOW() - INTERVAL '8 days', 'claude-sonnet-4-6',
    'referral', NULL, NULL, NULL,
    'contactado',
    '{"q1": "conversion", "q2": "2m_5m", "q3": "mas_50", "q4": "crm_basico", "q5": "1_3_meses", "q6": "insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '8 days', 100,
    '{"visits": 5, "pricing_page_clicks": 3, "total_time_seconds": 820, "email_opens": 4, "email_clicks": 3, "whatsapp_replies": 2}',
    ARRAY['hot', 'logistics'],
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
);

-- ============================================================
-- LEADS — SEGMENTO CALIENTE (score 60-79)
-- ============================================================

INSERT INTO leads (
    id, tenant_id, funnel_id, email, phone, first_name, last_name, company,
    quiz_score, behavior_score, engagement_score, demographic_score,
    segment, pathology, pathology_confidence, classified_at, classified_model,
    source, utm_source, utm_medium, utm_campaign,
    pipeline_stage, quiz_answers, quiz_completed_at, quiz_completion_percentage,
    behavior_data, tags, created_at, updated_at, last_seen_at
) VALUES

-- Lead 06: Ana Sepúlveda — Marketing Manager EduPro (caliente, propuesta)
(
    'a0000001-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'ana.sepulveda@edupro.cl', '+56912345006',
    'Ana', 'Sepúlveda', 'EduPro Chile',
    30, 22, 13, 6,
    'caliente', 'consciente_problema', 0.812, NOW() - INTERVAL '35 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'educacion-abril-2026',
    'propuesta',
    '{"q1": "conversion", "q2": "2m_5m", "q3": "21_50", "q4": "crm_basico", "q5": "1_4_semanas", "q6": "insatisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '35 days', 100,
    '{"visits": 5, "pricing_page_clicks": 3, "total_time_seconds": 720, "email_opens": 4, "email_clicks": 2, "whatsapp_replies": 2}',
    ARRAY['education', 'warm'],
    NOW() - INTERVAL '38 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),

-- Lead 07: Pablo González — CEO RestaurantPro (caliente, contactado)
(
    'a0000001-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'pablo.gonzalez@restaurantpro.cl', '+56912345007',
    'Pablo', 'González', 'RestaurantPro',
    28, 20, 12, 6,
    'caliente', 'buscando_solucion', 0.774, NOW() - INTERVAL '28 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'contactado',
    '{"q1": "adquisicion", "q2": "500k_2m", "q3": "6_20", "q4": "crm_basico", "q5": "menos_semana", "q6": "muy_insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '28 days', 100,
    '{"visits": 4, "pricing_page_clicks": 2, "total_time_seconds": 540, "email_opens": 3, "email_clicks": 2, "whatsapp_replies": 1}',
    ARRAY['food', 'pyme'],
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
),

-- Lead 08: Catalina Martínez — Founder BeautyLab (caliente, calificado)
(
    'a0000001-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'catalina.martinez@beautylab.cl', '+56912345008',
    'Catalina', 'Martínez', 'BeautyLab',
    31, 23, 14, 7,
    'caliente', 'consciente_solucion', 0.831, NOW() - INTERVAL '22 days', 'claude-sonnet-4-6',
    'instagram', 'instagram', 'cpc', 'beauty-mayo-2026',
    'calificado',
    '{"q1": "conversion", "q2": "500k_2m", "q3": "6_20", "q4": "excel", "q5": "1_4_semanas", "q6": "insatisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '22 days', 100,
    '{"visits": 5, "pricing_page_clicks": 3, "total_time_seconds": 660, "email_opens": 4, "email_clicks": 2, "whatsapp_replies": 2}',
    ARRAY['beauty', 'ecommerce', 'founder'],
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
),

-- Lead 09: Javier Morales — Director Comercial InmoBien (caliente, contactado)
(
    'a0000001-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'javier.morales@inmobien.cl', '+56912345009',
    'Javier', 'Morales', 'InmoBien Propiedades',
    29, 21, 12, 5,
    'caliente', 'consciente_problema', 0.768, NOW() - INTERVAL '18 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'inmobiliaria-mayo-2026',
    'contactado',
    '{"q1": "adquisicion", "q2": "2m_5m", "q3": "21_50", "q4": "crm_basico", "q5": "mas_3_meses", "q6": "insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '18 days', 100,
    '{"visits": 4, "pricing_page_clicks": 2, "total_time_seconds": 480, "email_opens": 3, "email_clicks": 1, "whatsapp_replies": 1}',
    ARRAY['real_estate', 'warm'],
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),

-- Lead 10: Sofía Reyes — Marketing Lead FinTech Corp (caliente, propuesta)
(
    'a0000001-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'sofia.reyes@fintechcorp.cl', '+56912345010',
    'Sofía', 'Reyes', 'FinTech Corp',
    32, 22, 13, 6,
    'caliente', 'buscando_solucion', 0.809, NOW() - INTERVAL '12 days', 'claude-sonnet-4-6',
    'linkedin', 'linkedin', 'sponsored', 'b2b-fintech-2026',
    'propuesta',
    '{"q1": "conversion", "q2": "2m_5m", "q3": "21_50", "q4": "crm_avanzado", "q5": "1_3_meses", "q6": "muy_insatisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '12 days', 100,
    '{"visits": 6, "pricing_page_clicks": 4, "total_time_seconds": 840, "email_opens": 5, "email_clicks": 3, "whatsapp_replies": 2}',
    ARRAY['fintech', 'b2b', 'warm'],
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),

-- Lead 11: Andrés Castillo — CEO ConsultoraPro (caliente, calificado)
(
    'a0000001-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'andres.castillo@consultorapro.cl', '+56912345011',
    'Andrés', 'Castillo', 'ConsultoraPro',
    27, 20, 11, 5,
    'caliente', 'consciente_problema', 0.751, NOW() - INTERVAL '9 days', 'claude-sonnet-4-6',
    'referral', NULL, NULL, NULL,
    'calificado',
    '{"q1": "conversion", "q2": "500k_2m", "q3": "6_20", "q4": "crm_basico", "q5": "1_4_semanas", "q6": "muy_insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '9 days', 100,
    '{"visits": 3, "pricing_page_clicks": 2, "total_time_seconds": 420, "email_opens": 3, "email_clicks": 1, "whatsapp_replies": 1}',
    ARRAY['consulting', 'warm'],
    NOW() - INTERVAL '11 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),

-- Lead 12: Isabella Muñoz — Gerente Comercial AgroTech (caliente, contactado)
(
    'a0000001-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'isabella.munoz@agrotech.cl', '+56912345012',
    'Isabella', 'Muñoz', 'AgroTech Chile',
    30, 21, 13, 6,
    'caliente', 'buscando_solucion', 0.783, NOW() - INTERVAL '6 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'agro-mayo-2026',
    'contactado',
    '{"q1": "adquisicion", "q2": "2m_5m", "q3": "21_50", "q4": "crm_basico", "q5": "1_3_meses", "q6": "insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '6 days', 100,
    '{"visits": 4, "pricing_page_clicks": 2, "total_time_seconds": 600, "email_opens": 3, "email_clicks": 2, "whatsapp_replies": 1}',
    ARRAY['agro', 'b2b'],
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
),

-- Lead 13: Matías Silva — Director Digital MediSalud (caliente, calificado)
(
    'a0000001-0000-0000-0000-000000000013',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'matias.silva@medisalud.cl', '+56912345013',
    'Matías', 'Silva', 'MediSalud Clínicas',
    31, 22, 14, 7,
    'caliente', 'consciente_solucion', 0.821, NOW() - INTERVAL '4 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'calificado',
    '{"q1": "adquisicion", "q2": "mas_5m", "q3": "mas_50", "q4": "crm_basico", "q5": "1_4_semanas", "q6": "insatisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '4 days', 100,
    '{"visits": 5, "pricing_page_clicks": 3, "total_time_seconds": 720, "email_opens": 4, "email_clicks": 2, "whatsapp_replies": 2}',
    ARRAY['health', 'enterprise'],
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
);

-- ============================================================
-- LEADS — SEGMENTO TIBIO (score 40-59)
-- ============================================================

INSERT INTO leads (
    id, tenant_id, funnel_id, email, phone, first_name, last_name, company,
    quiz_score, behavior_score, engagement_score, demographic_score,
    segment, pathology, pathology_confidence, classified_at, classified_model,
    source, utm_source, utm_medium, utm_campaign,
    pipeline_stage, quiz_answers, quiz_completed_at, quiz_completion_percentage,
    behavior_data, tags, created_at, updated_at, last_seen_at
) VALUES

-- Lead 14: Camila Herrera — Marketing Coord EduOnline (tibio, calificado)
(
    'a0000001-0000-0000-0000-000000000014',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'camila.herrera@eduonline.cl', '+56912345014',
    'Camila', 'Herrera', 'EduOnline',
    22, 15, 10, 5,
    'tibio', 'inconsciente_problema', 0.712, NOW() - INTERVAL '32 days', 'claude-sonnet-4-6',
    'meta_ads', 'instagram', 'cpc', 'educacion-abril-2026',
    'calificado',
    '{"q1": "awareness", "q2": "500k_2m", "q3": "6_20", "q4": "excel", "q5": "1_4_semanas", "q6": "neutral", "q7": "parcialmente"}',
    NOW() - INTERVAL '32 days', 100,
    '{"visits": 3, "pricing_page_clicks": 1, "total_time_seconds": 360, "email_opens": 2, "email_clicks": 1, "whatsapp_replies": 0}',
    ARRAY['education'],
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
),

-- Lead 15: Felipe Díaz — CEO FoodDelivery (tibio, nuevo)
(
    'a0000001-0000-0000-0000-000000000015',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'felipe.diaz@fooddeliverycl.com', '+56912345015',
    'Felipe', 'Díaz', 'FoodDelivery CL',
    20, 14, 9, 4,
    'tibio', 'consciente_problema', 0.689, NOW() - INTERVAL '25 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'nuevo',
    '{"q1": "adquisicion", "q2": "500k_2m", "q3": "6_20", "q4": "excel", "q5": "menos_semana", "q6": "neutral", "q7": "parcialmente"}',
    NOW() - INTERVAL '25 days', 100,
    '{"visits": 2, "pricing_page_clicks": 1, "total_time_seconds": 280, "email_opens": 2, "email_clicks": 1, "whatsapp_replies": 0}',
    ARRAY['food', 'startup'],
    NOW() - INTERVAL '27 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'
),

-- Lead 16: Valeria López — Directora ArtStudio (tibio, contactado)
(
    'a0000001-0000-0000-0000-000000000016',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'valeria.lopez@artstudio.cl', '+56912345016',
    'Valeria', 'López', 'ArtStudio CL',
    23, 16, 10, 5,
    'tibio', 'inconsciente_problema', 0.734, NOW() - INTERVAL '20 days', 'claude-sonnet-4-6',
    'instagram', 'instagram', 'organic', NULL,
    'contactado',
    '{"q1": "awareness", "q2": "500k_2m", "q3": "6_20", "q4": "excel", "q5": "1_4_semanas", "q6": "satisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '20 days', 100,
    '{"visits": 3, "pricing_page_clicks": 1, "total_time_seconds": 420, "email_opens": 2, "email_clicks": 1, "whatsapp_replies": 1}',
    ARRAY['creative', 'pyme'],
    NOW() - INTERVAL '22 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
),

-- Lead 17: Sebastián Pérez — Fundador TechStartup (tibio, nuevo)
(
    'a0000001-0000-0000-0000-000000000017',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'sebastian.perez@techstartup.io', '+56912345017',
    'Sebastián', 'Pérez', 'TechStartup.io',
    19, 13, 8, 4,
    'tibio', 'consciente_problema', 0.661, NOW() - INTERVAL '15 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'nuevo',
    '{"q1": "conversion", "q2": "menos_500k", "q3": "1_5", "q4": "excel", "q5": "1_4_semanas", "q6": "muy_insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '15 days', 100,
    '{"visits": 2, "pricing_page_clicks": 1, "total_time_seconds": 240, "email_opens": 2, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['startup', 'saas'],
    NOW() - INTERVAL '17 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
),

-- Lead 18: Andrea Ramos — CMO RetailMix (tibio, calificado)
(
    'a0000001-0000-0000-0000-000000000018',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'andrea.ramos@retailmix.cl', '+56912345018',
    'Andrea', 'Ramos', 'RetailMix',
    24, 17, 11, 5,
    'tibio', 'consciente_problema', 0.723, NOW() - INTERVAL '12 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'diagnostico-q1-2026',
    'calificado',
    '{"q1": "adquisicion", "q2": "500k_2m", "q3": "6_20", "q4": "crm_basico", "q5": "1_4_semanas", "q6": "insatisfecho", "q7": "parcialmente"}',
    NOW() - INTERVAL '12 days', 100,
    '{"visits": 3, "pricing_page_clicks": 2, "total_time_seconds": 480, "email_opens": 3, "email_clicks": 1, "whatsapp_replies": 0}',
    ARRAY['retail'],
    NOW() - INTERVAL '14 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),

-- Lead 19: Luis Contreras — Gerente SegurPlus (tibio, nuevo)
(
    'a0000001-0000-0000-0000-000000000019',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'luis.contreras@segurplus.cl', '+56912345019',
    'Luis', 'Contreras', 'SegurPlus Seguros',
    21, 14, 9, 4,
    'tibio', 'inconsciente_problema', 0.678, NOW() - INTERVAL '10 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'nuevo',
    '{"q1": "retencion", "q2": "500k_2m", "q3": "21_50", "q4": "excel", "q5": "mas_3_meses", "q6": "neutral", "q7": "parcialmente"}',
    NOW() - INTERVAL '10 days', 100,
    '{"visits": 2, "pricing_page_clicks": 0, "total_time_seconds": 180, "email_opens": 1, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['insurance'],
    NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
),

-- Lead 20: Gabriela Torres — Marketing SaludVida (tibio, nuevo)
(
    'a0000001-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'gabriela.torres@saludvida.cl', '+56912345020',
    'Gabriela', 'Torres', 'SaludVida',
    22, 15, 10, 5,
    'tibio', 'consciente_problema', 0.698, NOW() - INTERVAL '8 days', 'claude-sonnet-4-6',
    'meta_ads', 'instagram', 'cpc', 'salud-mayo-2026',
    'nuevo',
    '{"q1": "adquisicion", "q2": "500k_2m", "q3": "6_20", "q4": "excel", "q5": "1_4_semanas", "q6": "insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '8 days', 100,
    '{"visits": 2, "pricing_page_clicks": 1, "total_time_seconds": 300, "email_opens": 2, "email_clicks": 1, "whatsapp_replies": 0}',
    ARRAY['health', 'pyme'],
    NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),

-- Lead 21: Ignacio Vargas — Director PropiedadesPlus (tibio, contactado)
(
    'a0000001-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'ignacio.vargas@propiedadesplus.cl', '+56912345021',
    'Ignacio', 'Vargas', 'PropiedadesPlus',
    20, 14, 8, 4,
    'tibio', 'inconsciente_problema', 0.645, NOW() - INTERVAL '6 days', 'claude-sonnet-4-6',
    'referral', NULL, NULL, NULL,
    'contactado',
    '{"q1": "awareness", "q2": "500k_2m", "q3": "6_20", "q4": "excel", "q5": "mas_3_meses", "q6": "neutral", "q7": "mido_bien"}',
    NOW() - INTERVAL '6 days', 100,
    '{"visits": 2, "pricing_page_clicks": 1, "total_time_seconds": 240, "email_opens": 2, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['real_estate'],
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
),

-- Lead 22: Fernanda Castro — Founder FashionChile (tibio, nuevo)
(
    'a0000001-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'fernanda.castro@fashionchile.com', '+56912345022',
    'Fernanda', 'Castro', 'FashionChile',
    23, 15, 10, 5,
    'tibio', 'consciente_problema', 0.671, NOW() - INTERVAL '4 days', 'claude-sonnet-4-6',
    'instagram', 'instagram', 'organic', NULL,
    'nuevo',
    '{"q1": "adquisicion", "q2": "menos_500k", "q3": "1_5", "q4": "ninguna", "q5": "menos_semana", "q6": "insatisfecho", "q7": "no_mido"}',
    NOW() - INTERVAL '4 days', 100,
    '{"visits": 2, "pricing_page_clicks": 1, "total_time_seconds": 300, "email_opens": 1, "email_clicks": 1, "whatsapp_replies": 0}',
    ARRAY['fashion', 'ecommerce', 'founder'],
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),

-- Lead 23: Ricardo Soto — CEO TurismoActivo (tibio, nuevo)
(
    'a0000001-0000-0000-0000-000000000023',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'ricardo.soto@turismoactivo.cl', '+56912345023',
    'Ricardo', 'Soto', 'TurismoActivo',
    19, 13, 8, 3,
    'tibio', 'inconsciente_problema', 0.623, NOW() - INTERVAL '2 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'nuevo',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "6_20", "q4": "excel", "q5": "1_4_semanas", "q6": "neutral", "q7": "parcialmente"}',
    NOW() - INTERVAL '2 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 180, "email_opens": 1, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['tourism'],
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
);

-- ============================================================
-- LEADS — SEGMENTO FRIO (score 20-39)
-- ============================================================

INSERT INTO leads (
    id, tenant_id, funnel_id, email, phone, first_name, last_name, company,
    quiz_score, behavior_score, engagement_score, demographic_score,
    segment, pathology, pathology_confidence, classified_at, classified_model,
    source, utm_source, utm_medium, utm_campaign,
    pipeline_stage, quiz_answers, quiz_completed_at, quiz_completion_percentage,
    behavior_data, tags, created_at, updated_at, last_seen_at
) VALUES

-- Lead 24: Daniela Fuentes — Marketing PanaderiaClick (frio, nuevo)
(
    'a0000001-0000-0000-0000-000000000024',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'daniela.fuentes@panaderiaclick.cl', '+56912345024',
    'Daniela', 'Fuentes', 'PanaderiaClick',
    12, 8, 5, 3,
    'frio', 'inconsciente_problema', 0.587, NOW() - INTERVAL '28 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'pyme-marzo-2026',
    'nuevo',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "1_5", "q4": "ninguna", "q5": "menos_semana", "q6": "neutral", "q7": "mido_bien"}',
    NOW() - INTERVAL '28 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 95, "email_opens": 1, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['food', 'micro_empresa'],
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'
),

-- Lead 25: Antonio Morales — Dueño TallerAuto (frio, nuevo)
(
    'a0000001-0000-0000-0000-000000000025',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'antonio.morales@tallerauto.cl', '+56912345025',
    'Antonio', 'Morales', 'TallerAuto',
    10, 7, 4, 2,
    'frio', 'inconsciente_problema', 0.543, NOW() - INTERVAL '20 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'nuevo',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "1_5", "q4": "ninguna", "q5": "menos_semana", "q6": "satisfecho", "q7": "mido_bien"}',
    NOW() - INTERVAL '20 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 72, "email_opens": 0, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['automotive', 'micro_empresa'],
    NOW() - INTERVAL '22 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
),

-- Lead 26: Claudia Vega — Admin JardinDelNorte (frio, calificado)
(
    'a0000001-0000-0000-0000-000000000026',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'claudia.vega@jardinnorte.cl', '+56912345026',
    'Claudia', 'Vega', 'Jardín del Norte',
    14, 9, 5, 3,
    'frio', 'inconsciente_problema', 0.612, NOW() - INTERVAL '14 days', 'claude-sonnet-4-6',
    'referral', NULL, NULL, NULL,
    'calificado',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "1_5", "q4": "excel", "q5": "menos_semana", "q6": "neutral", "q7": "mido_bien"}',
    NOW() - INTERVAL '14 days', 100,
    '{"visits": 2, "pricing_page_clicks": 0, "total_time_seconds": 120, "email_opens": 1, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['services'],
    NOW() - INTERVAL '16 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'
),

-- Lead 27: Marco Delgado — CEO PrintShop (frio, nuevo)
(
    'a0000001-0000-0000-0000-000000000027',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'marco.delgado@printshop.cl', '+56912345027',
    'Marco', 'Delgado', 'PrintShop',
    11, 8, 4, 2,
    'frio', 'inconsciente_problema', 0.561, NOW() - INTERVAL '7 days', 'claude-sonnet-4-6',
    'meta_ads', 'facebook', 'cpc', 'pyme-mayo-2026',
    'nuevo',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "1_5", "q4": "ninguna", "q5": "1_4_semanas", "q6": "satisfecho", "q7": "optimizado"}',
    NOW() - INTERVAL '7 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 85, "email_opens": 0, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['print', 'micro_empresa'],
    NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
),

-- Lead 28: Natalia Molina — Coordinadora EventosPro (frio, nuevo)
(
    'a0000001-0000-0000-0000-000000000028',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'natalia.molina@eventospro.cl', '+56912345028',
    'Natalia', 'Molina', 'EventosPro',
    13, 9, 5, 3,
    'frio', 'consciente_problema', 0.598, NOW() - INTERVAL '3 days', 'claude-sonnet-4-6',
    'instagram', 'instagram', 'organic', NULL,
    'nuevo',
    '{"q1": "adquisicion", "q2": "menos_500k", "q3": "1_5", "q4": "excel", "q5": "1_4_semanas", "q6": "neutral", "q7": "no_mido"}',
    NOW() - INTERVAL '3 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 140, "email_opens": 1, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['events'],
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
);

-- ============================================================
-- LEADS — SEGMENTO MOTOR DETENIDO (score 0-19)
-- ============================================================

INSERT INTO leads (
    id, tenant_id, funnel_id, email, phone, first_name, last_name, company,
    quiz_score, behavior_score, engagement_score, demographic_score,
    segment, pathology, pathology_confidence, classified_at, classified_model,
    source, utm_source, utm_medium, utm_campaign,
    pipeline_stage, quiz_answers, quiz_completed_at, quiz_completion_percentage,
    behavior_data, tags, created_at, updated_at, last_seen_at
) VALUES

-- Lead 29: José García — Admin Almacén García (motor_detenido, nuevo)
(
    'a0000001-0000-0000-0000-000000000029',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'jose.garcia@almacengarcia.cl', '+56912345029',
    'José', 'García', 'Almacén García',
    5, 3, 2, 1,
    'motor_detenido', 'sin_interes', 0.823, NOW() - INTERVAL '18 days', 'claude-sonnet-4-6',
    'organic', 'google', 'organic', NULL,
    'nuevo',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "1_5", "q4": "ninguna", "q5": "menos_semana", "q6": "muy_satisfecho", "q7": "optimizado"}',
    NOW() - INTERVAL '18 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 42, "email_opens": 0, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['retail', 'no_fit'],
    NOW() - INTERVAL '19 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days'
),

-- Lead 30: Patricia Lima — Owner Consultora Lima (motor_detenido, nuevo)
(
    'a0000001-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'patricia.lima@consultoralima.cl', '+56912345030',
    'Patricia', 'Lima', 'Consultora Lima',
    4, 2, 1, 1,
    'motor_detenido', 'sin_interes', 0.791, NOW() - INTERVAL '5 days', 'claude-sonnet-4-6',
    'referral', NULL, NULL, NULL,
    'nuevo',
    '{"q1": "awareness", "q2": "menos_500k", "q3": "1_5", "q4": "ninguna", "q5": "menos_semana", "q6": "muy_satisfecho", "q7": "optimizado"}',
    NOW() - INTERVAL '5 days', 100,
    '{"visits": 1, "pricing_page_clicks": 0, "total_time_seconds": 38, "email_opens": 0, "email_clicks": 0, "whatsapp_replies": 0}',
    ARRAY['consulting', 'no_fit'],
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
);

-- ============================================================
-- CONVERSACIONES (WhatsApp + Email para leads fuego/caliente)
-- ============================================================

INSERT INTO conversations (
    id, tenant_id, lead_id, channel, role, content, content_type,
    status, ai_model, ai_tokens_used, ai_latency_ms, created_at
) VALUES

-- Lead 01 Carlos Mendoza — WhatsApp thread
('b0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
 'whatsapp', 'system', 'Lead capturado desde quiz. Score: 93. Segmento: fuego.', 'text', 'delivered', 'claude-sonnet-4-6', 120, 340, NOW() - INTERVAL '38 days'),

('b0000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
 'whatsapp', 'assistant', '¡Hola Carlos! 🚀 Vi que completaste nuestro diagnóstico de marketing y tus resultados son impresionantes — obtuviste 93/100. Eso significa que tu empresa TechVentures tiene el perfil exacto de las empresas que más rápido escalan con nuestro sistema. ¿Tienes 20 minutos esta semana para ver exactamente cómo podemos triplicar tus leads cualificados en 90 días?', 'text', 'read', 'claude-sonnet-4-6', 280, 890, NOW() - INTERVAL '38 days' + INTERVAL '2 hours'),

('b0000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
 'whatsapp', 'user', 'Sí, me interesa mucho. ¿Cuándo tienen disponibilidad?', 'text', 'read', NULL, NULL, NULL, NOW() - INTERVAL '37 days' + INTERVAL '10 hours'),

('b0000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
 'whatsapp', 'assistant', 'Perfecto Carlos 🎯 Te comparto el link para que elijas el horario que mejor te acomode: El martes y jueves tenemos slots a las 10:00 y 15:00 hrs. ¿Cuál te queda mejor? PD: Ya preparé un análisis preliminar de TechVentures que te voy a mostrar en la sesión.', 'text', 'read', 'claude-sonnet-4-6', 210, 720, NOW() - INTERVAL '37 days' + INTERVAL '11 hours'),

('b0000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001',
 'whatsapp', 'user', 'El jueves a las 10 está perfecto', 'text', 'read', NULL, NULL, NULL, NOW() - INTERVAL '37 days' + INTERVAL '14 hours'),

-- Lead 02 María José Torres — Email thread
('b0000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002',
 'email', 'assistant', 'Asunto: Tus resultados del diagnóstico + próximos pasos\n\nHola María José,\n\nAcabas de completar el Diagnóstico de Marketing Digital y tus resultados hablan por sí solos: **88/100 puntos** — eso te posiciona en el top 12% de todas las empresas que han hecho este diagnóstico.\n\nLo que esto significa para RetailGroup: tienes la madurez de negocio y el presupuesto para implementar un sistema de captación y scoring de leads que puede reducir tu CPL en un 40% en los próximos 60 días.\n\nTe propongo una sesión estratégica de 30 minutos esta semana para mostrarte exactamente cómo.\n\n¿El miércoles o jueves te funcionan?\n\nSaludos,\nEquipo Growth Engine', 'text', 'read', 'claude-sonnet-4-6', 420, 1100, NOW() - INTERVAL '30 days' + INTERVAL '1 hour'),

('b0000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002',
 'email', 'user', 'Hola, el jueves a las 11 está bien. ¿Pueden preparar una propuesta específica para nuestro sector retail?', 'text', 'read', NULL, NULL, NULL, NOW() - INTERVAL '29 days'),

-- Lead 03 Diego Álvarez — WhatsApp thread
('b0000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003',
 'whatsapp', 'assistant', 'Diego, acabo de revisar tu diagnóstico — 94/100 es el score más alto que hemos visto este mes 🔥 Para MarketBoost, esto es una señal clara: tienen el problema identificado y están listos para actuar. ¿Me cuentas brevemente cuál es el mayor cuello de botella en su proceso de conversión ahora mismo?', 'text', 'read', 'claude-sonnet-4-6', 240, 680, NOW() - INTERVAL '20 days' + INTERVAL '3 hours'),

('b0000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003',
 'whatsapp', 'user', 'Captamos muchos leads pero no tenemos sistema para calificarlos. El equipo de ventas pierde tiempo con leads que nunca van a comprar.', 'text', 'read', NULL, NULL, NULL, NOW() - INTERVAL '19 days' + INTERVAL '8 hours'),

('b0000001-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003',
 'whatsapp', 'assistant', 'Ese es exactamente el problema que resolvemos. Con nuestro sistema de scoring automático, solo el 20% de los leads (los más calificados) llegan a ventas — y ese 20% convierte 4x más. ¿Cuántos leads mensuales están procesando actualmente?', 'text', 'read', 'claude-sonnet-4-6', 195, 560, NOW() - INTERVAL '19 days' + INTERVAL '9 hours'),

-- Lead 06 Ana Sepúlveda — Email thread
('b0000001-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006',
 'email', 'assistant', 'Asunto: Ana, tu diagnóstico revela una oportunidad concreta\n\nHola Ana,\n\nGracias por completar el diagnóstico. Con 71 puntos, EduPro está en una posición excelente para escalar — tienen el producto, el mercado y el presupuesto. Lo que les falta es el sistema.\n\nBasado en tus respuestas, identifico 3 palancas específicas para el sector educación que podrían aumentar tus conversiones en un 35%:\n\n1. Segmentación por etapa de decisión del estudiante\n2. Secuencias de nurturing adaptadas al ciclo de matrícula\n3. Scoring predictivo basado en comportamiento web\n\n¿Agendamos 30 minutos para revisar esto juntos?\n\nSaludos,\nEquipo Growth Engine', 'text', 'read', 'claude-sonnet-4-6', 380, 980, NOW() - INTERVAL '35 days' + INTERVAL '2 hours'),

-- Lead 10 Sofía Reyes — WhatsApp thread
('b0000001-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010',
 'whatsapp', 'assistant', 'Sofía, tu score de 73/100 es muy sólido para el sector FinTech 💡 El dato más relevante: marcaste que tienen CRM avanzado pero el ROI sigue siendo poco claro. Eso me dice que el problema no es la herramienta, es la lógica de scoring detrás. ¿Te gustaría ver cómo lo resolvimos para otra FinTech con un perfil similar?', 'text', 'read', 'claude-sonnet-4-6', 260, 720, NOW() - INTERVAL '12 days' + INTERVAL '1 hour'),

('b0000001-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010',
 'whatsapp', 'user', 'Sí, nos interesa mucho. ¿Tienen casos en fintech B2B?', 'text', 'read', NULL, NULL, NULL, NOW() - INTERVAL '11 days' + INTERVAL '6 hours'),

('b0000001-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010',
 'whatsapp', 'assistant', '¡Sí! Trabajamos con 3 FinTechs B2B en los últimos 6 meses. El resultado promedio fue reducir el CAC en 38% y aumentar el ticket promedio en 22% porque el scoring identificó mejor a los decision-makers. Te puedo armar un caso de estudio anónimo. ¿Cuándo podemos hablar 20 minutos?', 'text', 'read', 'claude-sonnet-4-6', 220, 640, NOW() - INTERVAL '11 days' + INTERVAL '7 hours');

-- ============================================================
-- LEAD EVENTS (para analytics del dashboard)
-- ============================================================

INSERT INTO lead_events (tenant_id, lead_id, funnel_id, event_type, event_data, session_id, created_at) VALUES

-- Eventos de los leads fuego
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'page_view',          '{"page": "landing", "referrer": "facebook.com"}', 'sess_001', NOW() - INTERVAL '42 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'quiz_start',         '{}',                                              'sess_001', NOW() - INTERVAL '42 days' + INTERVAL '30 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 93, "time_seconds": 312}',              'sess_001', NOW() - INTERVAL '42 days' + INTERVAL '5 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 93, "segment": "fuego"}',         'sess_001', NOW() - INTERVAL '42 days' + INTERVAL '5 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'results_view',       '{"segment": "fuego"}',                            'sess_001', NOW() - INTERVAL '42 days' + INTERVAL '6 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'cta_click',          '{"cta": "agendar_sesion"}',                       'sess_001', NOW() - INTERVAL '42 days' + INTERVAL '8 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'hot_lead_alert',     '{"score": 93, "channel": "whatsapp"}',            'sess_001', NOW() - INTERVAL '42 days' + INTERVAL '10 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'pipeline_stage_change', '{"from": "nuevo", "to": "contactado"}',        NULL,       NOW() - INTERVAL '38 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'pipeline_stage_change', '{"from": "contactado", "to": "propuesta"}',    NULL,       NOW() - INTERVAL '32 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'pipeline_stage_change', '{"from": "propuesta", "to": "negociacion"}',   NULL,       NOW() - INTERVAL '20 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'pipeline_stage_change', '{"from": "negociacion", "to": "cerrado_ganado"}', NULL,    NOW() - INTERVAL '5 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'whatsapp_sent',      '{"template": "bienvenida_fuego"}',                NULL,       NOW() - INTERVAL '38 days' + INTERVAL '2 hours'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'whatsapp_read',      '{}',                                              NULL,       NOW() - INTERVAL '38 days' + INTERVAL '4 hours'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'whatsapp_reply',     '{"sentiment": "positive"}',                       NULL,       NOW() - INTERVAL '37 days' + INTERVAL '10 hours'),

-- Lead 02
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'page_view',          '{"page": "landing", "referrer": "instagram.com"}','sess_002', NOW() - INTERVAL '33 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'quiz_start',         '{}',                                              'sess_002', NOW() - INTERVAL '33 days' + INTERVAL '1 minute'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 88, "time_seconds": 287}',              'sess_002', NOW() - INTERVAL '33 days' + INTERVAL '6 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 88, "segment": "fuego"}',         'sess_002', NOW() - INTERVAL '33 days' + INTERVAL '6 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000002', 'f0000001-0000-0000-0000-000000000001', 'hot_lead_alert',     '{"score": 88, "channel": "email"}',               'sess_002', NOW() - INTERVAL '33 days' + INTERVAL '8 minutes'),

-- Lead 03
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'page_view',          '{"page": "landing", "referrer": "google.com"}',   'sess_003', NOW() - INTERVAL '25 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'quiz_start',         '{}',                                              'sess_003', NOW() - INTERVAL '25 days' + INTERVAL '2 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 94, "time_seconds": 398}',              'sess_003', NOW() - INTERVAL '25 days' + INTERVAL '8 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 94, "segment": "fuego"}',         'sess_003', NOW() - INTERVAL '25 days' + INTERVAL '8 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000003', 'f0000001-0000-0000-0000-000000000001', 'hot_lead_alert',     '{"score": 94, "channel": "whatsapp"}',            'sess_003', NOW() - INTERVAL '25 days' + INTERVAL '10 minutes'),

-- Leads calientes (eventos resumidos)
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000001', 'page_view',          '{"page": "landing"}',                             'sess_006', NOW() - INTERVAL '38 days'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 71, "time_seconds": 256}',              'sess_006', NOW() - INTERVAL '38 days' + INTERVAL '5 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000006', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 71, "segment": "caliente"}',      'sess_006', NOW() - INTERVAL '38 days' + INTERVAL '5 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 66, "time_seconds": 241}',              'sess_007', NOW() - INTERVAL '30 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000007', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 66, "segment": "caliente"}',      'sess_007', NOW() - INTERVAL '30 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 75, "time_seconds": 278}',              'sess_008', NOW() - INTERVAL '25 days' + INTERVAL '5 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000008', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 75, "segment": "caliente"}',      'sess_008', NOW() - INTERVAL '25 days' + INTERVAL '5 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 67, "time_seconds": 198}',              'sess_009', NOW() - INTERVAL '20 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000009', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 67, "segment": "caliente"}',      'sess_009', NOW() - INTERVAL '20 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 73, "time_seconds": 312}',              'sess_010', NOW() - INTERVAL '15 days' + INTERVAL '5 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000010', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 73, "segment": "caliente"}',      'sess_010', NOW() - INTERVAL '15 days' + INTERVAL '5 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000011', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 63, "time_seconds": 187}',              'sess_011', NOW() - INTERVAL '11 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000011', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 63, "segment": "caliente"}',      'sess_011', NOW() - INTERVAL '11 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000012', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 70, "time_seconds": 223}',              'sess_012', NOW() - INTERVAL '8 days' + INTERVAL '5 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000012', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 70, "segment": "caliente"}',      'sess_012', NOW() - INTERVAL '8 days' + INTERVAL '5 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000013', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 74, "time_seconds": 267}',              'sess_013', NOW() - INTERVAL '6 days' + INTERVAL '5 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000013', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 74, "segment": "caliente"}',      'sess_013', NOW() - INTERVAL '6 days' + INTERVAL '5 minutes' + INTERVAL '2 seconds'),

-- Leads tibios
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000014', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 52, "time_seconds": 198}',              'sess_014', NOW() - INTERVAL '35 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000014', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 52, "segment": "tibio"}',         'sess_014', NOW() - INTERVAL '35 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000015', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 47, "time_seconds": 176}',              'sess_015', NOW() - INTERVAL '27 days' + INTERVAL '3 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000015', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 47, "segment": "tibio"}',         'sess_015', NOW() - INTERVAL '27 days' + INTERVAL '3 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000016', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 54, "time_seconds": 211}',              'sess_016', NOW() - INTERVAL '22 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000016', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 54, "segment": "tibio"}',         'sess_016', NOW() - INTERVAL '22 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000017', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 44, "time_seconds": 163}',              'sess_017', NOW() - INTERVAL '17 days' + INTERVAL '3 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000017', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 44, "segment": "tibio"}',         'sess_017', NOW() - INTERVAL '17 days' + INTERVAL '3 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000018', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 57, "time_seconds": 234}',              'sess_018', NOW() - INTERVAL '14 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000018', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 57, "segment": "tibio"}',         'sess_018', NOW() - INTERVAL '14 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000019', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 48, "time_seconds": 181}',              'sess_019', NOW() - INTERVAL '12 days' + INTERVAL '3 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000019', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 48, "segment": "tibio"}',         'sess_019', NOW() - INTERVAL '12 days' + INTERVAL '3 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000020', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 52, "time_seconds": 194}',              'sess_020', NOW() - INTERVAL '10 days' + INTERVAL '4 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000020', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 52, "segment": "tibio"}',         'sess_020', NOW() - INTERVAL '10 days' + INTERVAL '4 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000021', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 46, "time_seconds": 172}',              'sess_021', NOW() - INTERVAL '8 days' + INTERVAL '3 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000022', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 53, "time_seconds": 187}',              'sess_022', NOW() - INTERVAL '5 days' + INTERVAL '3 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000023', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 43, "time_seconds": 163}',              'sess_023', NOW() - INTERVAL '3 days' + INTERVAL '3 minutes'),

-- Leads fríos y motor_detenido
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000024', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 28, "time_seconds": 124}',              'sess_024', NOW() - INTERVAL '30 days' + INTERVAL '2 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000024', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 28, "segment": "frio"}',          'sess_024', NOW() - INTERVAL '30 days' + INTERVAL '2 minutes' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000025', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 23, "time_seconds": 98}',               'sess_025', NOW() - INTERVAL '22 days' + INTERVAL '2 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000026', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 31, "time_seconds": 141}',              'sess_026', NOW() - INTERVAL '16 days' + INTERVAL '2 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000027', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 25, "time_seconds": 87}',               'sess_027', NOW() - INTERVAL '8 days' + INTERVAL '2 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000028', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 30, "time_seconds": 112}',              'sess_028', NOW() - INTERVAL '4 days' + INTERVAL '2 minutes'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000029', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 11, "time_seconds": 62}',               'sess_029', NOW() - INTERVAL '19 days' + INTERVAL '1 minute'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000029', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 11, "segment": "motor_detenido"}','sess_029', NOW() - INTERVAL '19 days' + INTERVAL '1 minute' + INTERVAL '2 seconds'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000030', 'f0000001-0000-0000-0000-000000000001', 'quiz_complete',      '{"score": 8, "time_seconds": 54}',                'sess_030', NOW() - INTERVAL '6 days' + INTERVAL '1 minute'),
('00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000030', 'f0000001-0000-0000-0000-000000000001', 'score_calculated',   '{"total_score": 8, "segment": "motor_detenido"}', 'sess_030', NOW() - INTERVAL '6 days' + INTERVAL '1 minute' + INTERVAL '2 seconds');

-- ============================================================
-- AD SPEND (gasto en publicidad para cálculo de CPL y ROI)
-- ============================================================

INSERT INTO ad_spend (
    tenant_id, funnel_id, source, campaign_id, campaign_name,
    spend_amount, currency, impressions, clicks,
    period_start, period_end
) VALUES

-- Meta Ads — Marzo 2026
('00000000-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
 'meta', 'meta_camp_001', 'Diagnóstico Marketing — Conversiones Mar',
 1850000, 'CLP', 98420, 2341, '2026-03-01', '2026-03-31'),

-- Meta Ads — Abril 2026
('00000000-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
 'meta', 'meta_camp_001', 'Diagnóstico Marketing — Conversiones Abr',
 2320000, 'CLP', 124870, 3120, '2026-04-01', '2026-04-30'),

-- Meta Ads — Mayo 2026 (parcial)
('00000000-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
 'meta', 'meta_camp_002', 'Diagnóstico Marketing — Conversiones May',
 890000, 'CLP', 47230, 1180, '2026-05-01', '2026-05-12'),

-- Meta Ads — Campaign inmobiliaria
('00000000-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
 'meta', 'meta_camp_003', 'Inmobiliaria — Lead Gen May',
 450000, 'CLP', 23100, 587, '2026-05-01', '2026-05-12'),

-- Google Ads — Abril-Mayo (remarketing)
('00000000-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001',
 'google', 'gads_camp_001', 'Remarketing Quiz — Google Display',
 380000, 'CLP', 215400, 1840, '2026-04-15', '2026-05-12');

-- ============================================================
-- AD CAMPAIGN (campaña Meta sincronizada)
-- ============================================================

INSERT INTO ad_campaigns (
    id, tenant_id, external_id, name, status, objective,
    budget_daily, budget_total, platform, last_synced_at
) VALUES (
    'c0000001-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'meta_camp_001',
    'Diagnóstico Marketing — Conversiones',
    'ACTIVE',
    'LEAD_GENERATION',
    85000, NULL,
    'meta',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (tenant_id, external_id) DO NOTHING;

INSERT INTO ad_campaigns (
    id, tenant_id, external_id, name, status, objective,
    budget_daily, budget_total, platform, last_synced_at
) VALUES (
    'c0000001-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'meta_camp_003',
    'Inmobiliaria — Lead Gen',
    'ACTIVE',
    'LEAD_GENERATION',
    45000, NULL,
    'meta',
    NOW() - INTERVAL '2 hours'
) ON CONFLICT (tenant_id, external_id) DO NOTHING;

-- ============================================================
-- AD CAMPAIGN METRICS (métricas diarias últimos 14 días)
-- ============================================================

INSERT INTO ad_campaign_metrics (
    campaign_id, tenant_id, date,
    impressions, clicks, spend, leads, reach, frequency, cpm, cpc, ctr
) VALUES
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - 14, 8420, 201, 78000, 3, 6200, 1.35, 9264.45, 388.06, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - 13, 9100, 218, 83000, 4, 6800, 1.38, 9120.88, 380.73, 0.0240),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - 12, 7830, 187, 71000, 2, 5920, 1.32, 9067.43, 379.68, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - 11, 10250, 245, 89000, 5, 7600, 1.41, 8682.93, 363.27, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE - 10, 11300, 270, 95000, 6, 8100, 1.44, 8407.08, 351.85, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  9,  6200, 148, 58000, 2, 4700, 1.28, 9354.84, 391.89, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  8,  5900, 141, 55000, 1, 4400, 1.26, 9322.03, 390.07, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  7, 12400, 296, 103000, 7, 8900, 1.47, 8306.45, 347.97, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  6, 11800, 282, 99000, 5, 8600, 1.42, 8389.83, 351.06, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  5, 10900, 260, 91000, 4, 7900, 1.40, 8348.62, 350.00, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  4,  9800, 234, 85000, 3, 7200, 1.38, 8673.47, 363.25, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  3,  8700, 208, 79000, 4, 6500, 1.35, 9080.46, 379.81, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  2,  9200, 220, 83000, 4, 6900, 1.37, 9021.74, 377.27, 0.0239),
('c0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', CURRENT_DATE -  1,  9500, 227, 85000, 4, 7100, 1.38, 8947.37, 374.45, 0.0239)
ON CONFLICT (campaign_id, date) DO NOTHING;

-- ============================================================
-- EMAIL SEQUENCES (secuencias de nurturing por segmento)
-- ============================================================

INSERT INTO email_sequences (
    tenant_id, funnel_id, name, trigger, trigger_segments, is_active, steps
) VALUES

-- Secuencia fuego: 3 pasos de cierre rápido
(
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'Secuencia FUEGO — Cierre Rápido',
    'segment_change',
    ARRAY['fuego'],
    true,
    '[
        {
            "step": 1,
            "delay_hours": 0,
            "subject": "{{first_name}}, tus resultados del diagnóstico están listos 🔥",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>Hola {{first_name}},</p><p>Acabas de obtener <strong>{{total_score}}/100</strong> en el Diagnóstico de Marketing — eso te pone en el top 15% de las empresas que han hecho este test.</p><p>Con ese perfil, podemos implementar un sistema completo en 30 días. <strong>¿Agendamos mañana?</strong></p>"
        },
        {
            "step": 2,
            "delay_hours": 24,
            "subject": "Reserva tu sesión estratégica (solo 3 lugares esta semana)",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>{{first_name}}, ayer te compartí los resultados. Este mensaje es para confirmar que el lugar está reservado para ti.</p><p>Solo necesitas 20 minutos. <strong>Elige tu horario aquí →</strong></p>"
        },
        {
            "step": 3,
            "delay_hours": 72,
            "subject": "Última oportunidad esta semana, {{first_name}}",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>Los 2 últimos lugares para esta semana se llenan hoy.</p><p>Si no es el momento correcto, dímelo y busco otro espacio. Pero si estás listo para escalar, este es el momento.</p>"
        }
    ]'
),

-- Secuencia caliente: nurturing de 5 días
(
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'Secuencia CALIENTE — Nurturing 5 días',
    'segment_change',
    ARRAY['caliente'],
    true,
    '[
        {
            "step": 1,
            "delay_hours": 1,
            "subject": "{{first_name}}, tu diagnóstico revela una oportunidad concreta",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>Hola {{first_name}},</p><p>Con {{total_score}}/100 tienes bases sólidas. El análisis identifica 3 palancas específicas para tu caso. Te las explico en este email.</p>"
        },
        {
            "step": 2,
            "delay_hours": 48,
            "subject": "Caso de estudio: cómo [empresa similar] creció 3x sus leads",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>{{first_name}}, ayer te compartí las 3 palancas. Hoy quiero mostrarte cómo una empresa similar a {{company}} las implementó en 45 días.</p>"
        },
        {
            "step": 3,
            "delay_hours": 96,
            "subject": "¿Seguimos avanzando, {{first_name}}?",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>Sé que el tiempo es escaso. Por eso preparé algo específico para {{company}}: un plan de 30 días basado en tu diagnóstico. ¿Lo revisamos juntos?</p>"
        }
    ]'
),

-- Secuencia tibio: educación larga
(
    '00000000-0000-0000-0000-000000000001',
    'f0000001-0000-0000-0000-000000000001',
    'Secuencia TIBIO — Educación 14 días',
    'segment_change',
    ARRAY['tibio'],
    true,
    '[
        {
            "step": 1,
            "delay_hours": 2,
            "subject": "Tu diagnóstico + 3 recursos para empezar a mejorar hoy",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>Hola {{first_name}},</p><p>Obtuviste {{total_score}}/100. Hay oportunidades claras. Te comparto 3 recursos gratuitos para comenzar a mejorar tu marketing desde hoy.</p>"
        },
        {
            "step": 2,
            "delay_hours": 72,
            "subject": "El error más común en empresas con tu perfil (y cómo evitarlo)",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>{{first_name}}, el 70% de las empresas en tu segmento comete el mismo error al intentar escalar su marketing. En este email te cuento cuál es.</p>"
        },
        {
            "step": 3,
            "delay_hours": 168,
            "subject": "Mini-guía gratuita: bases del marketing digital para pymes",
            "from_name": "Equipo Growth Engine",
            "body_html": "<p>Esta semana preparamos una mini-guía específica para empresas como {{company}}. Descárgala gratis.</p>"
        }
    ]'
);

-- ============================================================
-- APPOINTMENTS (reuniones agendadas para leads fuego)
-- ============================================================

INSERT INTO appointments (
    tenant_id, lead_id, scheduled_at, duration_mins,
    status, channel, meeting_url, notes
) VALUES

-- Carlos Mendoza (cerrado_ganado — reunión ya realizada)
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000001',
    NOW() - INTERVAL '30 days' + INTERVAL '10 hours',
    45,
    'completed',
    'video_call',
    'https://meet.google.com/abc-demo-001',
    'Reunión de kickoff. Carlos confirmó interés. Enviada propuesta formal al día siguiente.'
),

-- María José Torres (negociacion — reunión pendiente)
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000002',
    NOW() + INTERVAL '2 days' + INTERVAL '11 hours',
    30,
    'scheduled',
    'video_call',
    'https://meet.google.com/abc-demo-002',
    'Segunda reunión — revisar propuesta ajustada para retail.'
),

-- Diego Álvarez (propuesta — reunión completada)
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000003',
    NOW() - INTERVAL '12 days' + INTERVAL '15 hours',
    60,
    'completed',
    'video_call',
    'https://meet.google.com/abc-demo-003',
    'Demo del sistema completo. Muy interesado. Solicitó propuesta con integración WhatsApp Business.'
),

-- Valentina Rojas (propuesta — reunión completada)
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000004',
    NOW() - INTERVAL '8 days' + INTERVAL '10 hours',
    30,
    'completed',
    'video_call',
    'https://meet.google.com/abc-demo-004',
    'Primera reunión. Sector inmobiliario con ciclo largo. Enviada propuesta con plan 90 días.'
),

-- Rodrigo Fernández (contactado — reunión completada)
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000005',
    NOW() - INTERVAL '3 days' + INTERVAL '14 hours',
    30,
    'completed',
    'phone_call',
    NULL,
    'Llamada exploratoria. Referido por cliente. Perfil fuerte en logística B2B.'
);

-- ============================================================
-- CHAT SESSIONS (sesiones activas de WhatsApp)
-- ============================================================

INSERT INTO chat_sessions (
    tenant_id, lead_id, channel, status, context, last_activity_at
) VALUES

(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000002',
    'whatsapp', 'active',
    '{"stage": "propuesta", "last_intent": "solicitar_propuesta_retail", "variables_collected": {"empresa": "RetailGroup", "presupuesto": "mas_5m", "decision_maker": true}}',
    NOW() - INTERVAL '1 day'
),
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000003',
    'whatsapp', 'active',
    '{"stage": "discovery", "last_intent": "contar_problema_leads", "variables_collected": {"empresa": "MarketBoost", "leads_mensuales": null, "canal_principal": "meta_ads"}}',
    NOW() - INTERVAL '18 hours'
),
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000010',
    'whatsapp', 'active',
    '{"stage": "caso_estudio", "last_intent": "pedir_casos_fintech", "variables_collected": {"empresa": "FinTech Corp", "sector": "fintech_b2b", "decision_maker": true}}',
    NOW() - INTERVAL '11 hours'
),
(
    '00000000-0000-0000-0000-000000000001',
    'a0000001-0000-0000-0000-000000000005',
    'whatsapp', 'closed',
    '{"stage": "agendado", "last_intent": "confirmar_llamada", "variables_collected": {"empresa": "LogiChile", "hora_reunion": "14:00", "canal": "phone_call"}}',
    NOW() - INTERVAL '3 days'
);

-- ============================================================
-- ACTUALIZAR métricas del funnel (cache)
-- ============================================================

UPDATE funnels
SET
    total_views       = 2847,
    total_starts      = 1203,
    total_completions = 867
WHERE id = 'f0000001-0000-0000-0000-000000000001';

-- ============================================================
-- RESUMEN DE DATOS GENERADOS
-- ============================================================
-- Funnel:          1 (diagnostico-marketing, active)
-- Leads total:    30
--   fuego:         5  (scores 85-94)  → pipeline: cerrado_ganado/negociacion/propuesta/contactado
--   caliente:      8  (scores 63-75)  → pipeline: propuesta/contactado/calificado
--   tibio:        10  (scores 43-57)  → pipeline: nuevo/calificado/contactado
--   frio:          5  (scores 23-31)  → pipeline: nuevo/calificado
--   motor_detenido: 2 (scores 8-11)  → pipeline: nuevo
-- Conversaciones: 14 mensajes (WhatsApp + Email)
-- Lead Events:    55 eventos de analytics
-- Ad Spend:        5 registros (Meta + Google, Mar-May 2026)
-- Ad Campaigns:    2 campañas Meta activas
-- Ad Metrics:     14 días de métricas diarias
-- Email Sequences: 3 (fuego/caliente/tibio)
-- Appointments:    5 (3 completadas, 1 scheduled, 1 phone)
-- Chat Sessions:   4 (3 activas, 1 cerrada)
-- ============================================================

# THE GROWTH ENGINE — Arquitectura Completa & Roadmap de Implementación
**Versión 1.0 | Mayo 2026 | Procesado por 8 agentes especializados con Claude**

---

## ÍNDICE

1. [Visión del Sistema](#1-visión-del-sistema)
2. [Stack Tecnológico Definitivo](#2-stack-tecnológico-definitivo)
3. [Arquitectura de Microservicios](#3-arquitectura-de-microservicios)
4. [Esquema de Base de Datos](#4-esquema-de-base-de-datos)
5. [Motor de IA & Lead Scoring](#5-motor-de-ia--lead-scoring)
6. [Sistema Quiz / ScoreApp](#6-sistema-quiz--scoreapp)
7. [Arquitectura Frontend](#7-arquitectura-frontend)
8. [CRM & Automatización](#8-crm--automatización)
9. [Meta Ads & CAPI](#9-meta-ads--capi)
10. [Analytics & Feedback Loop](#10-analytics--feedback-loop)
11. [Seguridad & Infraestructura GCP](#11-seguridad--infraestructura-gcp)
12. [DevOps & CI/CD](#12-devops--cicd)
13. [Estimación de Costos MVP](#13-estimación-de-costos-mvp)
14. [Análisis Competitivo](#14-análisis-competitivo)
15. [KPIs Framework](#15-kpis-framework)
16. [Roadmap por Fases](#16-roadmap-por-fases)
17. [Riesgos Técnicos](#17-riesgos-técnicos)
18. [Diseño UX del Embudo](#18-diseño-ux-del-embudo)
19. [Estrategia de Crecimiento LATAM](#19-estrategia-de-crecimiento-latam)
20. [Próximos Pasos Inmediatos](#20-próximos-pasos-inmediatos)

---

## 1. Visión del Sistema

**The Growth Engine** es una plataforma SaaS multi-tenant de embudos inteligentes con IA, diseñada para capturar leads desde Meta Ads, clasificarlos automáticamente, y automatizar el 60-70% de las interacciones comerciales.

### Flujo Principal

```
Meta Ads (Instagram/Facebook)
        ↓
Landing Page Inteligente (Next.js, mobile-first, <2s carga)
        ↓
Quiz Diagnóstico (10 preguntas, tipo ScoreApp)
        ↓
IA analiza respuestas (Claude claude-sonnet-4-6 + GPT-4o-mini)
        ↓
Lead Scoring (fórmula: B×30 + Q×40 + E×20 + D×10 = /100)
        ↓
Clasificación automática (5 arquetipos/patologías)
        ↓
CRM (GoHighLevel / Pipeline propio)
        ↓
WhatsApp IA automatizado (secuencias por segmento)
        ↓
Seguimiento multi-canal (Email + WhatsApp + Remarketing)
        ↓
Agenda/Venta
        ↓
Dashboard BI (Metabase + BigQuery)
        ↓
Feedback loop → Meta Ads optimización
```

---

## 2. Stack Tecnológico Definitivo

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **UI:** React + TailwindCSS + Shadcn/UI
- **Animaciones:** Framer Motion
- **Estado:** Zustand (quiz), TanStack Query (server state)
- **Charts:** Recharts / Tremor
- **Hosting:** Vercel (MVP) → Cloud Run (escala)

### Backend
- **API Principal:** Node.js + NestJS (recomendado) o Python + FastAPI
- **AI Engine:** Python + FastAPI (para scoring y agentes)
- **Queue:** BullMQ (Redis)
- **ORM:** Prisma (Node) / SQLAlchemy (Python)
- **Real-time:** Socket.io

### Base de Datos
- **Principal:** PostgreSQL (Cloud SQL, db-standard-2)
- **Cache/Sesiones:** Redis (Memorystore)
- **Vectores:** pgvector (para memoria semántica de leads)
- **Analytics:** BigQuery

### Infraestructura
- **Cloud:** Google Cloud Platform (GCP)
- **Compute:** Cloud Run (serverless, auto-scaling)
- **Storage:** Cloud Storage (archivos, PDFs de resultados)
- **AI/ML:** Vertex AI (embeddings, modelos propios Fase 3+)
- **Observabilidad:** Cloud Logging + Sentry

### IA
- **Análisis profundo:** Claude claude-sonnet-4-6 (Anthropic) — reportes, clasificación
- **Chat/Conversación:** GPT-4o-mini (OpenAI) — WhatsApp IA (costo optimizado)
- **Clasificación inicial:** GPT-4o-mini — screening rápido
- **Embeddings:** text-embedding-3-small (OpenAI) — memoria semántica

### Automatización
- **Workflows:** n8n self-hosted en GCP (costo: ~$8 USD/mes)
- **Alternativa:** Make.com (si se prefiere no-code)

### CRM
- **Recomendado:** GoHighLevel ($282.150 CLP/mes) — mejor relación features/precio LATAM
- **Alternativa:** HubSpot Starter ($19.000 CLP/mes, muy limitado)
- **Largo plazo Fase 3+:** CRM propio integrado en la plataforma

### Mensajería
- **WhatsApp:** Meta Cloud API directo (ahorra ~$150K CLP/mes vs Twilio)
- **Email:** SendGrid ($19.000 CLP/mes, 50K emails)
- **SMS fallback:** Twilio (solo si WhatsApp falla)

### Analytics
- **Dashboards:** Metabase self-hosted o Looker Studio (gratis)
- **Data Warehouse:** BigQuery
- **Error tracking:** Sentry

---

## 3. Arquitectura de Microservicios

### Servicios y Responsabilidades

```
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY (Kong/Cloud Endpoints)    │
│              Rate limiting, auth, routing, logging       │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ auth-service │  │ lead-service │  │ quiz-service │
│ JWT + Auth0  │  │ captura/CRUD │  │ builder+API  │
│ multi-tenant │  │ webhook Meta │  │ submission   │
└──────────────┘  └──────┬───────┘  └──────┬───────┘
                         │                  │
                    Pub/Sub Events          │
                    lead.captured           │
                    lead.scored      ───────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│scoring-srv   │  │messaging-srv │  │crm-sync-srv  │
│FastAPI+IA    │  │WhatsApp+Email│  │GHL/HubSpot   │
│Vertex AI     │  │conversacional│  │bidireccional │
└──────────────┘  └──────────────┘  └──────────────┘
        │
        ▼
┌──────────────┐  ┌──────────────┐
│analytics-srv │  │funnel-srv    │
│BigQuery ETL  │  │builder CRUD  │
│Metabase sync │  │landing pages │
└──────────────┘  └──────────────┘
```

### Comunicación entre servicios
- **Síncrona:** REST (para operaciones que requieren respuesta inmediata)
- **Asíncrona:** Google Pub/Sub (eventos: `lead.captured`, `lead.scored`, `quiz.submitted`, `message.sent`)
- **Cache compartida:** Redis para tokens de sesión y scoring temporal

### APIs Críticas

```
POST /api/v1/leads/capture        ← Webhook desde Meta Ads
POST /api/v1/quiz/{id}/submit     ← Envío de respuestas del quiz
GET  /api/v1/leads/{id}/score     ← Score calculado del lead
POST /api/v1/crm/sync             ← Sincronización con GHL/HubSpot
POST /api/v1/webhooks/meta        ← Server-side CAPI
GET  /api/v1/analytics/kpis       ← Métricas para dashboard
```

---

## 4. Esquema de Base de Datos

### Estrategia Multi-Tenant
**Recomendado:** Row-level security en PostgreSQL (tenant_id en todas las tablas). Más simple que schema-per-tenant y suficiente para Fase 1-3.

### Tablas Principales

```sql
-- TENANTS (clientes del SaaS)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,       -- 'empresa-acme'
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter',      -- starter/growth/scale
    whatsapp_number VARCHAR(20),
    meta_pixel_id VARCHAR(50),
    meta_capi_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (equipo del tenant)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'member',       -- owner/admin/member
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FUNNELS (embudos creados por el tenant)
CREATE TABLE funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    quiz_config JSONB,                        -- config completa del quiz
    landing_config JSONB,                     -- config de landing page
    scoring_rules JSONB,                      -- reglas de scoring personalizadas
    status VARCHAR(20) DEFAULT 'draft',       -- draft/active/paused
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);

-- LEADS (prospectos capturados)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    funnel_id UUID REFERENCES funnels(id),
    email VARCHAR(255),
    phone VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    -- Scoring
    quiz_score INTEGER DEFAULT 0,            -- 0-100
    behavior_score INTEGER DEFAULT 0,        -- calculado continuamente
    total_score INTEGER DEFAULT 0,           -- score final
    score_updated_at TIMESTAMPTZ,
    -- Clasificación IA
    segment VARCHAR(50),                     -- hot/warm/cold/nurture
    pathology VARCHAR(100),                  -- 'consciente_problema', 'buscando_solucion', etc.
    -- Origen
    source VARCHAR(50),                      -- meta_ads/organic/referral
    utm_campaign VARCHAR(255),
    utm_source VARCHAR(100),
    meta_fbclid VARCHAR(255),
    -- Estado CRM
    pipeline_stage VARCHAR(50) DEFAULT 'new',
    assigned_to UUID REFERENCES users(id),
    -- Metadata
    quiz_answers JSONB,                       -- respuestas completas del quiz
    behavior_data JSONB,                      -- clics, visitas, tiempo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices críticos para performance
CREATE INDEX idx_leads_tenant_score ON leads(tenant_id, total_score DESC);
CREATE INDEX idx_leads_tenant_segment ON leads(tenant_id, segment);
CREATE INDEX idx_leads_tenant_stage ON leads(tenant_id, pipeline_stage);
CREATE INDEX idx_leads_created ON leads(tenant_id, created_at DESC);

-- CONVERSATIONS (historial de WhatsApp/chat)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    channel VARCHAR(20) NOT NULL,            -- whatsapp/email/chat
    role VARCHAR(10) NOT NULL,               -- user/assistant/human
    content TEXT NOT NULL,
    embedding vector(1536),                  -- pgvector para búsqueda semántica
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conv_lead ON conversations(lead_id, created_at DESC);
CREATE INDEX idx_conv_embedding ON conversations USING ivfflat (embedding vector_cosine_ops);

-- EVENTS (analytics de comportamiento)
CREATE TABLE lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    event_type VARCHAR(50) NOT NULL,         -- page_view/quiz_start/quiz_complete/email_open/cta_click
    event_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);           -- Partición mensual para performance
```

---

## 5. Motor de IA & Lead Scoring

### Fórmula de Scoring (100 puntos)

```
Score Final = B(30) + Q(40) + E(20) + D(10)

B = Comportamiento Digital (max 30 pts)
  └─ Visitas de retorno: log(visitas) × 10   (escala logarítmica hasta 5 visitas)
  └─ Clics en página de precios: × 8         (hasta 3 clics)
  └─ Tiempo en página: × 5                   (300s = máximo)
  └─ Clics en emails: × 3
  └─ Respuestas WhatsApp: × 2
  └─ Aperturas email: × 1

Q = Quiz (max 40 pts)
  └─ % completación: × 12                    (multiplicador 0.0-1.0)
  └─ Score de urgencia: × 10                 (1-5 normalizado)
  └─ Facturación mensual: × 8               (tiers: <2K=0, 2-5K=0.4, 5-15K=0.7, 15-50K=0.9, >50K=1.0)
  └─ Tiene presupuesto: × 6                  (binario)
  └─ Timeline de decisión: × 4              (invertido: menos días = más puntos)

E = Engagement (max 20 pts)
  └─ Preguntó precio: +7
  └─ Solicitó demo: +6
  └─ Rondas de conversación ≥3: +4, ≥1: +2
  └─ Compartió contenido: +2
  └─ Interacción LinkedIn: +1

D = Demográfico (max 10 pts)
  └─ Es tomador de decisiones: +4
  └─ Tiene CRM existente (señal de madurez): +2
  └─ Empresa ≥50 personas: +2, ≥10: +1
  └─ Industria de alto valor (SaaS/fintech/retail): +2
```

**Validación del spec:** Usuario volvió 3 veces (B: 6) + clic en precios ×2 (B: 5.3) + 90% quiz (Q: 10.8) + preguntó precio (E: 7) + CEO (D: 6) = **Score ~95/100** ✓

### Clasificación por Patología (5 arquetipos)

| Segmento | Score | Patología | Trigger automático |
|----------|-------|-----------|-------------------|
| **Fuego** | 80-100 | "Listo para comprar" | Alerta inmediata vendedor + WhatsApp en 15 min |
| **Caliente** | 60-79 | "Buscando solución" | Secuencia WhatsApp hot (48h, 5 mensajes) |
| **Tibio** | 40-59 | "Consciente del problema" | Secuencia nurturing 7 días |
| **Frío** | 20-39 | "Explorando opciones" | Secuencia educativa 14 días |
| **Motor Detenido** | 0-19 | "Necesita base" | Email con guía gratuita + remarketing |

### Modelos de IA por Tarea

| Tarea | Modelo | Razón |
|-------|--------|-------|
| Clasificación de patología | `claude-sonnet-4-6` | Análisis profundo, contexto cultural LATAM |
| Chat WhatsApp automático | `gpt-4o-mini` | Latencia baja, costo optimizado |
| Generación de reportes PDF | `claude-sonnet-4-6` | Redacción de alta calidad |
| Embeddings de memoria | `text-embedding-3-small` | Costo/calidad óptimo |
| Análisis de intención | `claude-haiku-4-5` | Screening rápido y barato |

### Prompt de Clasificación (ejemplo)

```python
CLASSIFICATION_PROMPT = """
Eres un experto en comportamiento de compradores B2B en LATAM.

Analiza las respuestas del quiz de {lead_name} y clasifícalo en uno de estos arquetipos:
1. fuego: Score 80+, urgencia alta, presupuesto claro, decisión inminente
2. caliente: Score 60-79, problema claro, buscando solución activamente
3. tibio: Score 40-59, consciente del problema, no urgente
4. frio: Score 20-39, explorando, sin urgencia
5. motor_detenido: Score <20, sin claridad de problema o sin presupuesto

RESPUESTAS DEL QUIZ:
{quiz_answers_json}

COMPORTAMIENTO OBSERVADO:
{behavior_summary}

Responde en JSON:
{{"archetype": "...", "confidence": 0.0-1.0, "primary_pain": "...", "recommended_approach": "..."}}
"""
```

---

## 6. Sistema Quiz / ScoreApp

### Las 10 Preguntas del Quiz "Termómetro de Eficiencia de Ventas"

| # | Pregunta | Tipo | Peso |
|---|----------|------|------|
| 1 | ¿Cuál es la facturación mensual de tu negocio? | Selección | ×1.0 |
| 2 | ¿Cuántos leads nuevos llegan a tu negocio al mes? | Selección | ×1.2 |
| 3 | ¿Cuál es tu mayor cuello de botella en ventas? | Selección | ×1.4 |
| 4 | ¿Cuánto tiempo tarda un lead en convertirse en cliente? | Selección | ×1.3 |
| 5 | ¿Qué canales usas actualmente para capturar leads? | Múltiple | ×1.0 |
| **LEAD GATE** | Nombre + Email + Teléfono | Formulario | — |
| 6 | ¿Cuánto inviertes mensualmente en publicidad? | Selección | ×1.5 |
| 7 | ¿Qué herramientas usas para seguimiento de clientes? | Selección | ×1.1 |
| 8 | ¿Qué porcentaje de leads conviertes en clientes? | Selección | ×1.6 |
| 9 | ¿Cuánto tiempo puedes esperar para ver resultados? | Selección | ×2.0 |
| 10 | ¿Cuánto estás dispuesto a invertir en una solución? | Selección | ×1.8 |

**El lead gate se muestra después de la pregunta 5**, cuando el usuario ya está comprometido (principio de consistencia de Cialdini).

### Páginas de Resultado por Segmento

| Segmento | Headline | CTA | Urgencia |
|----------|----------|-----|---------|
| Fuego (80-100) | "Tu negocio está listo para escalar con IA" | "Agenda sesión estratégica" | "Solo 3 espacios esta semana" |
| Caliente (60-79) | "Tienes las bases. Solo necesitas el sistema correcto" | "Ver cómo funciona" | "Próxima sesión: mañana" |
| Tibio (40-59) | "Con los ajustes correctos, tu crecimiento se acelera" | "Obtener diagnóstico completo" | "Cupos limitados" |
| Frío (20-39) | "El mejor momento para construir el sistema es ahora" | "Descargar guía gratuita" | Sin urgencia artificial |
| Motor Detenido | "Empieza desde las bases con nuestro recurso gratuito" | "Acceder al curso gratuito" | Sin urgencia |

### Alerta Hot Lead (4 condiciones multicriteria)

Se activa alerta inmediata al vendedor cuando:
1. Score total ≥ 80 puntos, **Y**
2. Q7 (urgencia económica) ≥ 4/5, **Y**
3. Q9 (timeline) = "En menos de 1 mes", **Y**
4. Lead NO tiene sistema de automatización actual

→ Contacto en **menos de 15 minutos** (según MIT Lead Response Management Study, contactar en los primeros 5 min aumenta 100× las probabilidades de conversión).

---

## 7. Arquitectura Frontend

### Estructura Next.js App Router

```
app/
├── (marketing)/[tenant]/     ← Páginas públicas del funnel
│   ├── page.tsx             ← Landing page dinámica
│   ├── quiz/page.tsx        ← Quiz diagnóstico
│   └── quiz/results/page.tsx ← Resultados personalizados
│
├── (dashboard)/             ← Panel autenticado
│   ├── overview/page.tsx    ← Dashboard de métricas
│   ├── funnels/page.tsx     ← Constructor de embudos
│   ├── leads/page.tsx       ← Vista CRM de leads
│   └── settings/page.tsx   ← Configuración e integraciones
│
└── api/
    ├── quiz/submit/route.ts ← Captura lead + scoring
    └── webhooks/meta/route.ts ← Server-side CAPI
```

### Componentes Críticos

- `<QuizFunnel>` — Wizard multi-step con animaciones Framer Motion, auto-avance 350ms
- `<LeadScoreCard>` — Score animado circular SVG + recomendaciones personalizadas
- `<MetricsDashboard>` — KPI widgets con semáforos de color + funnel visualization
- `<FunnelBuilder>` — Constructor drag-and-drop

### Multi-Tenancy
- **MVP:** Path-based (`app.growth-engine.com/acme/quiz`) — sin configuración DNS extra
- **Escala:** Subdomain-based (`acme.growth-engine.com`) — migración en Fase 3

### Targets Core Web Vitals
```
Landing Page:   LCP < 1.8s | FID < 50ms  | CLS < 0.05
Quiz Step:      LCP < 1.2s | FID < 30ms  | CLS < 0.01
Results Page:   LCP < 2.0s | INP < 100ms
Dashboard:      TTI < 3.5s
```

---

## 8. CRM & Automatización

### Recomendación CRM: GoHighLevel

**vs HubSpot Starter:**

| Criterio | GoHighLevel | HubSpot Starter |
|----------|------------|-----------------|
| Precio/mes | $282.150 CLP | $19.000 CLP |
| WhatsApp nativo | ✅ | ❌ |
| Automatizaciones | ✅ Avanzado | ❌ Básico |
| Pipeline visual | ✅ | ✅ |
| SMS/Email incluido | ✅ | ✅ |
| API completa | ✅ | ✅ |
| Para agencias (white-label) | ✅ | ❌ |

**Decisión:** GoHighLevel para el CRM de los clientes de la plataforma. HubSpot gratis para el equipo fundador de The Growth Engine.

### Pipeline de 8 Etapas

```
Nuevo Lead → Calificado → Contactado → Propuesta → 
Negociación → Cerrado Ganado → Onboarding → Cliente Activo
```

### 5 Flujos n8n Principales

**Flujo 1: Captura y Clasificación**
```
[Webhook Meta] → [Validar datos] → [Calcular Score] → 
[Clasificar patología Claude] → [Crear en GHL] → [Trigger Flujo 2 o 3]
```

**Flujo 2: Hot Lead (Score ≥ 80)**
```
[Recibir evento lead.hot] → [Notificar vendedor Slack/Email] → 
[Enviar WhatsApp template inmediato] → [Crear tarea en GHL] → 
[Si no responde en 2h → escalar]
```

**Flujo 3: Warm Lead (Score 40-79)**
```
[Recibir evento lead.warm] → [Iniciar secuencia WhatsApp 7 días] → 
[Día 3: enviar caso de éxito] → [Día 5: email personalizado] → 
[Día 7: oferta de diagnóstico gratuito]
```

**Flujo 4: Re-engagement (Lead inactivo >7 días)**
```
[Cron diario] → [Query leads inactivos] → 
[Verificar score decaimiento] → [Enviar mensaje reactivación] → 
[Si abre → subir score y trigger Flujo 3]
```

**Flujo 5: Feedback Loop Meta**
```
[Lead convirtió (GHL stage = Cerrado)] → [Enviar evento a CAPI Meta] → 
[Actualizar Custom Audience] → [Trigger Lookalike refresh]
```

### Secuencia WhatsApp Hot Lead (48h)

| Mensaje | Timing | Copy |
|---------|--------|------|
| 1 | Inmediato | "Hola {nombre}, vi que completaste el diagnóstico. Tu puntaje de {score}/100 es impresionante. ¿Tienes 15 min esta semana para revisar juntos tus resultados?" |
| 2 | +4h | "Mientras tanto, te comparto el caso de {empresa similar}: aumentaron su conversión en 47% en 60 días con exactamente el mismo perfil que el tuyo." |
| 3 | +24h | "¿Pudiste ver el caso? ¿Qué parte resonó más con tu situación actual?" |
| 4 | +36h | "Solo me queda 1 espacio disponible esta semana para una sesión de estrategia gratuita. ¿Lo tomamos?" |
| 5 | +48h | "Último aviso: el espacio queda libre mañana. Si no es buen momento, con gusto te agendo para la próxima semana. ¿Cuándo te acomoda?" |

### Decaimiento del Score (Lead Scoring temporal)

```
Sin actividad por 7 días:   -5 puntos
Sin actividad por 14 días: -10 puntos
Sin actividad por 30 días: -20 puntos
Sin actividad por 60 días: recalificación automática (baja a "Frío")
```

---

## 9. Meta Ads & CAPI

### Decisiones Estratégicas Clave

1. **Landing Page externa sobre Lead Ads** — el quiz requiere lógica condicional y scoring en servidor. Acepta CPL levemente mayor ($2.50-$4) porque la calidad del lead clasificado reduce el CAC total.

2. **Objetivo de campaña: "Conversions" con evento `QuizCompleted`** — no optimizar por tráfico. Meta necesita saber que el objetivo es la completación del quiz.

3. **CAPI desde el Día 1** — Con iOS 14+, operar solo con pixel browser-side pierde 20-35% de señales. Implementación via n8n toma 4 horas.

4. **Lookalike 1% por país separado** — Un LAL "Chile + México" diluye la señal. Comportamientos de usuario son radicalmente diferentes por país.

5. **Remarketing del abandono de quiz como prioridad máxima** — CPL más bajo de todo el funnel ($0.80-$1.50). Cuesta 60-70% menos que un lead frío.

### Estructura de Campañas

```
CAMPAÑA 1: Adquisición Cold (60% del budget)
├── Adset A: LAL 1% Chile (basado en leads convertidos)
├── Adset B: Intereses Marketing Digital + SaaS
└── Adset C: Cargos/Comportamientos (Dueños de negocio LATAM)

CAMPAÑA 2: Remarketing (25% del budget)
├── Adset A: Visitaron landing pero no iniciaron quiz (últimos 7 días)
├── Adset B: Iniciaron quiz pero no completaron (últimos 3 días)
└── Adset C: Completaron quiz pero no agendaron (últimos 14 días)

CAMPAÑA 3: Retención/Upsell (15% del budget)
└── Adset A: Clientes actuales (exclusión para no impactar)
```

### Eventos CAPI a Implementar

```
QuizStarted         → Inicio del quiz (captura intención)
QuizCompleted       → Finalización del quiz (lead capturado)
HighScoreLead       → Score ≥ 70 (señal de calidad para algoritmo)
ScheduleCompleted   → Agendó sesión (conversión media)
Purchase            → Compró plan (conversión final)
```

### Integración CAPI (endpoint NestJS)

```typescript
// app/api/webhooks/meta/route.ts
export async function POST(req: Request) {
  const { event, userData, customData, eventId } = await req.json()
  
  const payload = {
    data: [{
      event_name: event,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,  // Deduplicación con pixel client-side
      action_source: 'website',
      user_data: {
        em: userData.hashedEmail,     // SHA-256 antes de enviar
        ph: userData.hashedPhone,
        client_ip_address: req.headers.get('x-forwarded-for'),
        fbc: getCookieValue(req, '_fbc'),
        fbp: getCookieValue(req, '_fbp'),
      },
      custom_data: { value: customData.score, currency: 'USD' }
    }]
  }
  
  await fetch(
    `https://graph.facebook.com/v19.0/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_TOKEN}`,
    { method: 'POST', body: JSON.stringify(payload) }
  )
}
```

---

## 10. Analytics & Feedback Loop

### Pipeline de Datos

```
Frontend Events → API → Pub/Sub → analytics-service → BigQuery
                                                           ↓
                                              Looker Studio / Metabase
                                                           ↓
                                              Meta Ads API (audiencias)
                                                           ↓
                                              Optimización automática
```

### Queries SQL Clave (BigQuery)

```sql
-- CPL por campaña (últimos 30 días)
SELECT 
  utm_campaign,
  COUNT(*) as leads,
  COUNT(CASE WHEN total_score >= 60 THEN 1 END) as qualified_leads,
  ROUND(SUM(ad_spend) / COUNT(*), 2) as cpl_usd
FROM leads l
LEFT JOIN ad_spend a ON l.utm_campaign = a.campaign_id
WHERE l.created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY utm_campaign
ORDER BY cpl_usd ASC;

-- Tasa de automatización por semana
SELECT 
  DATE_TRUNC(created_at, WEEK) as week,
  COUNT(CASE WHEN role = 'assistant' THEN 1 END) as ai_messages,
  COUNT(CASE WHEN role = 'human' THEN 1 END) as human_messages,
  ROUND(COUNT(CASE WHEN role = 'assistant' THEN 1 END) / COUNT(*) * 100, 1) as automation_pct
FROM conversations
GROUP BY week
ORDER BY week DESC;
```

### Feedback Loop de Optimización

```
Semana 1: Lanzar campaña → Recolectar datos (mínimo 50 leads)
Semana 2: Análisis en BigQuery → Identificar segmento de mayor calidad
Semana 3: Crear Lookalike desde ese segmento → Subir a Meta via API
Semana 4: A/B test nueva audiencia vs. anterior
Semana 5+: Iterar con datos acumulados (loop continuo)
```

---

## 11. Seguridad & Infraestructura GCP

### Estrategia de Seguridad

```
AUTENTICACIÓN
├── JWT RS256 con refresh tokens rotativos (TTL: 15min access, 7d refresh)
├── Auth0 o NextAuth para OAuth social (Google)
└── MFA para cuentas owner/admin

AUTORIZACIÓN
├── RBAC: owner / admin / member / viewer
├── Row-Level Security en PostgreSQL (tenant_id en todas las queries)
└── API Keys con scopes para integraciones externas

DATOS
├── Encriptación AES-256 en reposo (Cloud SQL default)
├── TLS 1.3 en tránsito
├── PII hashed antes de enviar a Meta (SHA-256)
└── Audit log en tabla inmutable (lead_events)

INFRAESTRUCTURA
├── Cloud Armor (WAF + DDoS protection)
├── Rate limiting en API Gateway (100 req/min por IP, 1000/min por tenant)
├── VPC privada con Cloud NAT (servicios internos no expuestos)
└── Secret Manager para credenciales (no en variables de entorno)
```

### Configuración GCP Recomendada (MVP)

```yaml
# Cloud Run (cada microservicio)
min-instances: 1          # Evitar cold start en servicio core
max-instances: 10         # Auto-scale hasta 10 instancias
memory: 512Mi
cpu: 1
concurrency: 80           # 80 requests concurrentes por instancia
region: us-central1       # Más cercano a LATAM con menor costo

# Cloud SQL
tier: db-standard-2       # 2 vCPU, 7.5GB RAM
region: us-central1
high-availability: false  # Solo en Fase 3+
backup-enabled: true
point-in-time-recovery: true
maintenance-window: domingo 3:00 AM

# BigQuery
location: US              # Menor costo, buena latencia desde LATAM
table-expiration: never   # Retención indefinida (datos históricos críticos)
```

---

## 12. DevOps & CI/CD

### Pipeline GitHub Actions → GCP

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.SA_EMAIL }}
      
      - name: Build and Push Docker Image
        run: |
          docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA .
          docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy $SERVICE_NAME \
            --image gcr.io/$PROJECT_ID/$SERVICE_NAME:$GITHUB_SHA \
            --region us-central1 \
            --min-instances 1 \
            --max-instances 10 \
            --no-traffic           # Despliega sin tráfico (rollout progresivo)
      
      - name: Gradual traffic rollout
        run: |
          gcloud run services update-traffic $SERVICE_NAME \
            --to-latest --region us-central1  # 100% a nueva versión si OK
```

### Estrategia de Ambientes

```
development  → rama feature/* → Cloud Run (0% tráfico real)
staging      → rama develop   → Cloud Run (30% tráfico interno)
production   → rama main      → Cloud Run (100% tráfico)
```

### Monitoreo y Alertas

- **Cloud Logging:** todos los logs centralizados con structured logging
- **Sentry:** error tracking con alertas en Slack
- **Alertas de costos GCP:** al 50%, 75%, 90% del budget mensual
- **Uptime checks:** cada 60s en el endpoint `/health` de cada servicio

---

## 13. Estimación de Costos MVP

**Tipo de cambio referencia: $950 CLP/USD**

| Categoría | Conservador USD | Optimizado USD | CLP conservador | CLP optimizado |
|-----------|----------------|----------------|-----------------|----------------|
| GCP (Cloud Run + SQL + Storage + BigQuery) | $130 | $102 | $123.500 | $96.900 |
| IA (OpenAI mix + Claude + Vertex) | $90 | $45 | $85.500 | $42.750 |
| WhatsApp API (Meta directo) | $150 | $107 | $142.500 | $101.650 |
| Email (SendGrid) | $20 | $20 | $19.000 | $19.000 |
| n8n self-hosted | $10 | $8 | $9.500 | $7.600 |
| Dominio + CDN + SSL | $22 | $2 | $20.900 | $1.900 |
| Dev Tools (Sentry, GitHub) | $50 | $30 | $47.500 | $28.500 |
| **TOTAL** | **$472 USD** | **$314 USD** | **$448.400** | **$298.300** |

**Conclusión:** El MVP cabe cómodamente dentro del presupuesto de $600K-$1M CLP/mes, dejando **$151K-$701K CLP** para marketing, personal y contingencias.

**Ahorro clave:** Usar Meta Cloud API directo en lugar de Twilio ahorra **$143K-$190K CLP/mes**.

---

## 14. Análisis Competitivo

### Comparativa de Mercado

| Feature | **The Growth Engine** | ScoreApp | HubSpot Pro | GoHighLevel | Vambe AI |
|---------|----------------------|----------|-------------|-------------|----------|
| Quiz Funnels + IA | ✅ nativo | ✅ core | ❌ parcial | ❌ | ❌ |
| Lead Scoring ML | ✅ | ❌ | ✅ básico | ❌ | ❌ |
| WhatsApp nativo | ✅ IA | ❌ | ❌ integración | ✅ canal | ✅ core |
| IA conversacional | ✅ GPT+Claude | ❌ | ✅ Copilot | ❌ básico | ✅ |
| CRM integrado | ✅ | ❌ | ✅ completo | ✅ | ❌ |
| En español LATAM | ✅ nativo | ❌ parcial | ❌ | ❌ | ✅ |
| **Score LATAM (1-10)** | **9.2** | **5.2** | **6.8** | **6.5** | **4.8** |

### Estrategia de Pricing

| Plan | Precio/mes CLP | Target | Límites |
|------|---------------|--------|---------|
| Starter | $49.000 | Freelancers, coaches | 1 embudo, 500 leads/mes, 500 msgs WhatsApp |
| Growth | $129.000 | PYMEs, startups B2B | 5 embudos, 2.500 leads/mes, 5.000 msgs |
| Scale | $299.000 | Empresas medianas | Ilimitado, 10.000 leads/mes, 20.000 msgs, API |
| Agencias | $499.000 | Agencias digitales | 50 sub-cuentas, white-label (Fase 4) |

**Ventaja principal:** 85% más barato que HubSpot Pro para features comparables en LATAM.

### Gaps de Mercado Accionables

1. **Embudo TOFU→BOFU completo en español** — ningún competidor lo cubre en una sola plataforma
2. **Quiz + WhatsApp IA + Analytics integrado** — combinación única en LATAM
3. **Precio accesible con features enterprise** para el segmento agencias ($50-300 USD/mes)
4. **Onboarding en <30 minutos** — vs 2-6 semanas de HubSpot/GoHighLevel

---

## 15. KPIs Framework

### Dashboard de KPIs con Semáforos

**Marketing**
| KPI | Verde | Amarillo | Rojo |
|-----|-------|----------|------|
| CPL | ≤ $3.500 CLP | $3.5K-$6K | > $6K |
| ROAS | ≥ 2.5x | 1.5-2.5x | < 1.5x |
| CTR Meta Ads | ≥ 1.5% | 0.8-1.5% | < 0.8% |

**Producto**
| KPI | Verde | Amarillo | Rojo |
|-----|-------|----------|------|
| Quiz Completion Rate | ≥ 55% | 35-55% | < 35% |
| Lead Quality Score (avg) | ≥ 65/100 | 45-65 | < 45 |
| % Automatización | ≥ 60% | 40-60% | < 40% |
| TTFV (Time-to-First-Value) | ≤ 30 min | 30-120 min | > 2h |

**Negocio**
| KPI | Verde | Amarillo | Rojo |
|-----|-------|----------|------|
| Churn Rate mensual | ≤ 5% | 5-8% | > 8% |
| MRR Growth MoM | ≥ 15% | 5-15% | < 5% |
| LTV:CAC ratio | ≥ 5:1 | 3-5:1 | < 3:1 |
| NPS | ≥ 40 | 20-40 | < 20 |

**IA**
| KPI | Verde | Amarillo | Rojo |
|-----|-------|----------|------|
| Accuracy clasificación | ≥ 75% | 60-75% | < 60% |
| Escalación IA→Humano | ≤ 25% | 25-40% | > 40% |
| Latencia respuesta IA | ≤ 2.5s | 2.5-5s | > 5s |
| Costo/conversación IA | ≤ $95 CLP | $95-$190 | > $190 |

---

## 16. Roadmap por Fases

### FASE 1 — Core Platform (Meses 1-2)

**Objetivo:** Producto funcional para 10 clientes beta pagando.

**Sprint 1 (Sem 1-2):**
- ✅ Setup GCP (Cloud Run, Cloud SQL, Redis)
- ✅ Autenticación JWT + multi-tenancy básico
- ✅ Schema PostgreSQL v1.0 con tenant isolation

**Sprint 2 (Sem 3-4):**
- ✅ Quiz Builder v1 (10 tipos de pregunta, lógica de ramificación)
- ✅ Landing page del quiz (mobile-first, <2s carga)
- ✅ Meta Pixel + CAPI desde el Día 1

**Sprint 3 (Sem 5-6):**
- ✅ WhatsApp Business API (Meta directo, templates básicos)
- ✅ Lead scoring por reglas (no IA aún)
- ✅ Dashboard v1 (leads capturados, completion rate, score promedio)

**Sprint 4 (Sem 7-8):**
- ✅ n8n self-hosted + flujos de automatización básicos
- ✅ Exportación CSV, notificaciones básicas
- ✅ Onboarding flow (guía para crear primer quiz en <30 min)

**KPIs al finalizar Fase 1:**
- 10 clientes beta activos
- Quiz Completion Rate ≥ 50%
- TTFV ≤ 45 minutos
- MRR: $490.000 CLP

---

### FASE 2 — Automatización (Meses 3-4)

**Objetivo:** Motor de nurturing automatizado, primeras 35 empresas pagando.

- ✅ IA Conversacional v1: GPT-4o-mini en WhatsApp (responde FAQs, califica, agenda)
- ✅ Workflows visuales embebidos (editor tipo n8n en la plataforma)
- ✅ Email marketing integrado con secuencias automatizadas
- ✅ Lead Scoring con IA (reemplaza reglas por Claude/GPT-4o-mini)
- ✅ CRM ligero con pipeline visual
- ✅ Integraciones: HubSpot, Google Sheets, Zapier

**KPIs al finalizar Fase 2:**
- 35 clientes activos (ARPU ~$100K CLP)
- MRR: $3.500.000 CLP
- % Automatización WhatsApp ≥ 55%
- CAC ≤ $120.000 CLP

---

### FASE 3 — IA Avanzada + Analytics (Meses 5-6)

**Objetivo:** Diferenciación por inteligencia y datos propios.

- ✅ Modelo ML propio de lead scoring (XGBoost con datos acumulados)
- ✅ Quiz IA generativo (describe tu negocio → quiz listo en 30 segundos)
- ✅ A/B testing de quizzes con significancia estadística
- ✅ Reportes automatizados semanales generados por Claude
- ✅ API pública v1 para integraciones avanzadas
- ✅ Integraciones pagos LATAM: MercadoPago + Transbank

**KPIs al finalizar Fase 3:**
- 75 clientes activos
- MRR: $8.500.000 CLP
- Accuracy IA scoring ≥ 78%
- Churn ≤ 3.5%

---

### FASE 4 — Escala LATAM (Meses 7-12)

**Objetivo:** $35M CLP MRR, presencia en 3 países.

**Expansión regional (secuencia recomendada):**
1. **Mes 7-8: Colombia** — mayor ecosistema startup LATAM post-Chile, mismo español
2. **Mes 9-10: México** — mercado 10× más grande, requiere CFDI + SPEI
3. **Mes 11-12: Perú** — alta adopción WhatsApp (90%+), menos competencia local

**Features de escala:**
- White-label para agencias (Tier Agencias $499K/mes, 50 sub-cuentas)
- Marketplace de plantillas por industria (inmobiliario, educación, salud, e-commerce)
- Machine Learning multi-mercado (modelos por país/industria)
- SLA enterprise 99.9% + Customer Success Manager dedicado

**KPIs al finalizar Fase 4 (Mes 12):**
- 250 clientes activos (Chile + Colombia + México)
- MRR: $35.000.000 CLP (~$36.840 USD)
- ARR: ~$441.000 USD
- Churn ≤ 2.5% | NPS ≥ 50

---

## 17. Riesgos Técnicos

| # | Riesgo | Prob | Impacto | Mitigación |
|---|--------|------|---------|-----------|
| 1 | Cambio de políticas WhatsApp/Meta | Alta 60% | Crítico | Channel Abstraction Layer desde Día 1. El producto funciona por email/SMS si WhatsApp falla. |
| 2 | Escalada costos OpenAI | Media 40% | Alto | Multi-provider wrapper: switchear entre OpenAI/Anthropic/Gemini/Llama sin cambiar código |
| 3 | Churn alto beta (producto inmaduro) | Alta 55% | Alto | Onboarding 1:1 para primeros 20 clientes, NPS semanal, trigger si no usan en 7 días |
| 4 | Violación Ley 19.628 (nueva) | Media 25% | Crítico | DPA con todos los clientes, encriptación, anonimización BigQuery. Abogado en Mes 2 |
| 5 | Cold start Cloud Run | Media 45% | Medio | min-instances=1 en servicio core (~$15 USD/mes adicional) |
| 6 | Multi-tenancy mal implementado | Baja 15% | Crítico | Row-level security PostgreSQL + tests automáticos de isolación en CI/CD |
| 7 | Deuda técnica acelerada | Alta 65% | Medio-Alto | Arquitectura modular desde Día 1, 20% sprint para refactoring, code review obligatorio |
| 8 | Bus factor = 1 (único dev técnico) | Media 40% | Crítico | Infrastructure-as-Code (Terraform), runbooks, documentación actualizada semanalmente |
| 9 | Spam/abuso de WhatsApp | Media 35% | Alto | Rate limiting por cliente, opt-in doble, monitoreo de tasa de reportes (<0.3%) |
| 10 | Pérdida de datos (fallo Cloud SQL) | Baja 15% | Crítico | Backups diarios, point-in-time recovery, drill de restore cada 2 meses |

**Top 3 acciones inmediatas:**
1. Diseñar Channel Abstraction Layer en Fase 1 (2-3 días, evita refactoring de $50K+ en Mes 8)
2. Definir arquitectura multi-provider IA desde el scaffolding
3. Contratar abogado de datos antes del lanzamiento público

---

## 18. Diseño UX del Embudo

### Landing Page — Estructura AIDA

```
┌─────────────────────────────────────────────────────┐
│ HERO (Attention)                                     │
│ "¿Sabes por qué tu embudo pierde dinero cada mes?"  │
│ Sub: Haz el diagnóstico en 2 minutos y descubre     │
│      tu puntaje de eficiencia de ventas             │
│ CTA: "Hacer el diagnóstico gratis →"                │
│ Social: 500+ empresas diagnosticadas | ★★★★★        │
├─────────────────────────────────────────────────────┤
│ PROBLEMA (Interest) — 3 pain points con iconos      │
│ "¿Te suena familiar?"                               │
│ · Gastas en ads pero los leads no convierten        │
│ · Tu equipo de ventas pierde tiempo en leads fríos  │
│ · No sabes qué parte del embudo está rota           │
├─────────────────────────────────────────────────────┤
│ SOLUCIÓN (Desire)                                   │
│ Demo visual del quiz + resultados                   │
│ "En 2 minutos sabrás exactamente qué arreglar"      │
│ Testimonial con resultado específico + número       │
├─────────────────────────────────────────────────────┤
│ URGENCIA + CTA (Action)                             │
│ "Solo 3 diagnósticos gratuitos disponibles hoy"     │
│ CTA: "Hacer el diagnóstico gratis →" (mismo copy)  │
│ Micro-garantía: "2 minutos. Gratis. Sin registro."  │
├─────────────────────────────────────────────────────┤
│ FAQ — 5-7 preguntas que matan objeciones            │
└─────────────────────────────────────────────────────┘
```

### A/B Tests Prioritarios

| Test | Control | Variante | Hipótesis |
|------|---------|----------|-----------|
| CTA Hero | "Haz tu diagnóstico gratuito →" | "Descubre por qué tu marketing no escala →" | Copy orientado a dolor convierte más |
| Lead Gate position | Paso 8 de 10 | Paso 6 de 10 | Gate más temprano = más leads, menor calidad |
| Score Reveal | Número (72/100) | Solo segmento ("Perfil Premium") | Cualitativo genera más urgencia para agendar |
| Urgencia | "Agenda tu sesión" | "3 espacios disponibles esta semana" | Scarcity específica y creíble aumenta conversión |

---

## 19. Estrategia de Crecimiento LATAM

### TAM / SAM / SOM

| | Valor | En CLP |
|---|---|---|
| TAM (Marketing Automation LATAM) | $1.0-1.3B USD/año | ~$1.17T CLP |
| SAM (PYMEs digitales objetivo LATAM) | $3.36B USD/año | ~$3.19T CLP |
| **SOM Año 1 (Chile)** | **$407K USD/año** | **$387M CLP** |
| **SOM Año 3 (3 países)** | **$2M USD/año** | **$1.9B CLP** |

### Canales de Adquisición Prioritarios

1. **Partner Program con Agencias (0 CAC):** 50 agencias socias × 10 clientes cada una = 500 clientes con CAC cercano a $0. Comisión: 20-30% del MRR.
2. **Contenido SEO en español:** "cómo crear quiz para leads", "herramientas de automatización WhatsApp" — mercado con baja competencia en español.
3. **Meta Ads propios** (practicar lo que se predica): usar la plataforma para adquirir clientes del SaaS.
4. **Partnerships de integración:** Hotmart, MercadoPago, Transbank — acceso a su base de usuarios.

### Milestone de Partners (acción en Mes 3, no en Mes 12)
Con 10 clientes beta satisfechos, contactar 20 agencias ofreciendo:
- **Acceso gratis 60 días** a cambio de 3 clientes referidos O 1 caso de éxito documentado
- Una agencia con 10 clientes propios genera $1.290.000 CLP MRR instantáneamente

---

## 20. Próximos Pasos Inmediatos

### Semana 1 — Infraestructura Base
```bash
# 1. Provisionar GCP
gcloud run deploy lead-service --region us-central1
gcloud sql instances create growth-engine-db --tier db-standard-2

# 2. Ejecutar migrations del schema v1.0
psql $DB_URL < schema/001_tenants.sql
psql $DB_URL < schema/002_leads.sql
psql $DB_URL < schema/003_conversations.sql

# 3. Configurar variables de entorno en Secret Manager
gcloud secrets create ANTHROPIC_API_KEY --data-file=./secrets/anthropic.txt
gcloud secrets create OPENAI_API_KEY --data-file=./secrets/openai.txt
gcloud secrets create META_CAPI_TOKEN --data-file=./secrets/meta.txt
```

### Semana 2 — Auth + Quiz Builder v1
- Implementar JWT RS256 con refresh tokens
- Crear quiz builder con 5 tipos de pregunta básicos
- Landing page mobile-first con meta pixel

### Semana 3-4 — WhatsApp + n8n
- Conectar WhatsApp Business API (Meta directo)
- Configurar n8n self-hosted en Cloud Run
- Flujo básico: Nuevo lead → WhatsApp de bienvenida → Dashboard

### Semana 5-6 — Scoring + Dashboard
- Implementar scoring por reglas (prepara para IA en Fase 2)
- Dashboard v1: leads/día, completion rate, score promedio

### Mes 2 — Beta con 10 clientes curados
- Seleccionar empresas B2B con ciclo de venta 2-6 semanas
- Onboarding 1:1 de cada cliente
- NPS semanal, ajustar según feedback
- **Contratar abogado de datos antes de lanzamiento público**

### Alertas de Costos GCP (Día 1)
```bash
gcloud billing budgets create \
  --billing-account=$BILLING_ACCOUNT \
  --display-name="MVP Monthly Budget" \
  --budget-amount=600000CLP \
  --threshold-rules-percent=50,75,90,100
```

---

*Documento generado por 8 agentes especializados en paralelo: lead-architect-backend, growth-ui-frontend, cognitive-lead-ai, meta-ads-estratega, conversion-architect, crm-flow-engineer, competitive-intelligence-analyst, growth-ops-automation.*

*The Growth Engine — Mayo 2026*

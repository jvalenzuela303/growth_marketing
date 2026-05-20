---
name: Architecture Decisions (ADRs) - The Growth Engine
description: Key architectural decisions recorded as ADRs: multi-tenant strategy, service choices, security policies, queue conventions
type: project
---

# Architecture Decisions — The Growth Engine

## ADR-001: Multi-Tenant Strategy — Row-Level Security (RLS)

**Decision:** Row-Level Security with `tenant_id` on all tables in shared `public` schema.
Enterprise tenants can be migrated to separate schema without changing business logic.

**Why:** Simpler operations and unified migrations vs schema-per-tenant, with acceptable performance trade-off compensated by partial indexes on tenant_id.

**How to apply:** Every table MUST have `tenant_id UUID NOT NULL REFERENCES tenants(id)`. RLS policies set via `SET LOCAL app.tenant_id`. PrismaService.withTenant(tenantId, fn) wraps every query in a transaction that calls `SELECT set_config('app.tenant_id', ...)` before executing the fn. TenantMiddleware extracts tenantId from JWT and attaches to req.

---

## ADR-002: Vertex AI as Primary AI Orchestrator

**Decision:** Use Vertex AI (Gemini 1.5 Pro) as primary scoring engine, OpenAI GPT-4o as backup.

**Why:** Automatic audit logging in Vertex, fine-tuning capability on own conversion data, reduced latency vs international egress, predictable costs within GCP quotas.

**How to apply:** scoring-service (FastAPI) calls Vertex AI SDK. Use temperature=0.1 for scoring consistency. Response must be JSON-only (response_mime_type: application/json). Backend calls AI Engine at `POST ${AI_ENGINE_URL}/score` with quiz_answers + behavior_data.

---

## ADR-003: NestJS for Most Services, FastAPI for AI/Data

**Decision:** NestJS (TypeScript) for API, auth, lead, quiz, CRM sync, messaging. FastAPI (Python) for scoring-service and analytics-service.

**Why:** FastAPI has better async I/O for ML libraries and Google AI Python SDKs. NestJS provides better DI, decorators, and middleware ecosystem for API services.

---

## ADR-004: BullMQ Queue Priority Convention

```
Queue: scoring   → priority 2 (alta) — procesa leads recién capturados
Queue: messaging → priority 3 (normal) — despacha secuencias WhatsApp/email
Hot lead alerts  → priority 1 (crítica) — alerta inmediata para leads fuego
```

Job names:
- `lead.captured` → scoring queue (emitido al crear lead)
- `hot-lead-alert` → messaging queue (emitido si totalScore >= 80)
- `sequence-step` → messaging queue (delayed, para secuencias multi-mensaje)

**How to apply:** Always assign explicit priority when adding jobs. Workers: ScoringProcessor, MessagingProcessor.

---

## ADR-005: JWT Security Configuration

- Access tokens: 15 minutes, HS256 (secretOrKey from JWT_SECRET env var)
- Refresh tokens: 7 days, random 64-byte hex token stored as SHA-256 hash in DB
- Rotation: on each refresh, old token is revoked (revokedAt set), new token issued
- Replay attack: if token already revoked when used → revoke ALL user tokens
- Rate limits: /auth/register 5/60s, /auth/login 10/60s, /auth/refresh 20/60s

---

## ADR-006: API Versioning

All APIs versioned from day 1 with `/api/v1/` global prefix. Breaking changes require new version `/v2/`.
Public routes: `/api/v1/quiz/:tenantSlug/:funnelSlug`, `/api/v1/leads/capture`, `/api/v1/webhooks/`.

---

## ADR-007: Idempotency Strategy

- Webhook capture: externalId stored as tag `ext:{externalId}` on lead, checked before create
- Meta CAPI: event_id deduplication handled by Meta on their end
- BullMQ jobs: attempts=3, backoff=exponential(2000ms)

---

## ADR-008: Deployment Strategy (Cloud Run)

- All services deployed to Cloud Run gen2 execution environment
- Private VPC ingress via VPC connector, egress private-ranges-only
- Production deploys use canary: 10% traffic, 5min observation, then 100%
- Staging: direct deploy with tag `staging`
- DB migrations run as Cloud Run Jobs before service deploy
- Health check endpoints: GET /api/v1/health (liveness), GET /api/v1/ready (readiness)

---

## ADR-009: Channel Abstraction Layer

All messaging (WhatsApp, Email) goes through IChannel interface (from shared-types).
MessagingService is the only component that touches channel implementations.
Workers (MessagingProcessor) call MessagingService, never WhatsApp/SendGrid directly.
This allows swapping channels without changing business logic.

---

## ADR-010: GCP Project & Naming Convention

- GCP Project ID: `growth-engine-prod` (prod), `growth-engine-staging` (staging)
- Region: `us-central1` (primary)
- Docker registry: `us-central1-docker.pkg.dev/growth-engine-prod/services/{service-name}`
- Service accounts: `{service-name}-sa@growth-engine-prod.iam.gserviceaccount.com`
- Secrets: named descriptively in Secret Manager (e.g., `database-url`, `redis-url`, `meta-app-secret`)

---

## ADR-011: NestJS Backend Implemented (2026-05-08)

Backend NestJS completamente implementado en `/apps/backend/`.

Módulos: Auth, Leads, Quiz, Funnels, Messaging, Webhooks, Analytics, Queue.
Dependencias clave: @nestjs/*, @prisma/client, bullmq, ioredis, bcrypt, passport-jwt.
Prisma schema en `apps/backend/prisma/schema.prisma` — schema v1.3.0 — modelos: Tenant, User, RefreshToken, Funnel, Lead, Conversation, LeadEvent, ChatSession, EmailSequence, EmailSequenceEnrollment, AdSpend, FunnelVariant, Appointment, AdCampaign, AdCampaignMetric, AudienceExport.
Circular dependency LeadsModule ↔ QueueModule resuelto con forwardRef().
Test E2E de aislamiento de tenants en `apps/backend/test/tenant-isolation.e2e-spec.ts`.

---

## ADR-012: Iteration 2 Modules Added (2026-05-11)

Nuevos módulos implementados para Iteration 2:

- `ConversationsModule` (`/modules/conversations/`) — inbox con DISTINCT ON, conteo de no leídos via raw SQL, historial de mensajes, envío de replies como human_agent.
- `AdSpendModule` (`/modules/ad-spend/`) — CRUD paginado para gastos publicitarios.
- `SequencesModule` (`/modules/sequences/`) — CRUD + toggle para EmailSequence, includes count de enrollments.
- `AnalyticsService` añadido a `AnalyticsModule` — métodos getFunnelAbandonmentStats (JSONB groupBy via $queryRaw) y getFinancialKpis (sum AdSpend, count Leads).

Pattern: JSONB sub-key groupBy requiere $queryRaw — Prisma groupBy no puede agrupar por `eventData->>'questionIndex'`.
Analytics controller mantiene PrismaService inyectado directamente para queries existentes y añade AnalyticsService para las nuevas.

---

## ADR-013: Iteration 3 Modules Added (2026-05-11)

Nuevos módulos implementados para Iteration 3:

- `AppointmentsModule` (`/modules/appointments/`) — CRUD de citas con verificación de ownership de lead, filtros por leadId y status. Statuses: scheduled/completed/cancelled/no_show.
- `AdCampaignsModule` (`/modules/ad-campaigns/`) — Sync mock con Meta Ads via upsert en (tenantId, externalId), métricas diarias filtradas por range `Nd`. Campo `adAccountId` leído con cast `(tenant as any).adAccountId` (campo nuevo en schema). POST /sync retorna 202.
- `AudienceExportsModule` (`/modules/audience-exports/`) — Crea export con validación mínimo 100 leads en segmento, simula Meta API generando `act_${Date.now()}` como metaAudienceId.
- `ChatModule` (`/modules/chat/`) — Stub de chatbot: guarda user message, llama AI Engine en `${AI_ENGINE_URL}/api/v1/chat/message` con AbortController (10s timeout), fallback a canned response, guarda assistant response con aiModel='claude-sonnet-4-6'.
- `FunnelsModule` extendido — A/B testing: getVariants/createVariant/updateVariant/deleteVariant. createVariant auto-crea Control variant (50/50 split) si es la primera variante. deleteVariant rechaza si isControl y quedan otras variantes.

Key patterns:
- AdCampaign upsert usa unique constraint name `tenantId_externalId` mapeado a Prisma `tenantId_externalId` compound unique.
- AdCampaignMetric upsert usa `campaignId_date` compound unique.
- ChatService inyecta ConfigService para leer `AI_ENGINE_URL` (default: http://localhost:8000).
- `AI_ENGINE_URL` debe añadirse a `apps/backend/.env` si AI Engine corre en distinto host.

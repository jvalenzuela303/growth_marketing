# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Overview

pnpm workspaces + Turbo. Node ≥20, pnpm ≥9.

```
apps/
  backend/     NestJS API (port 4001)
  frontend/    Next.js 14 (port 4000)
  ai-engine/   FastAPI Python (port 8000)
packages/
  shared-types/   TypeScript types shared across apps
  scoring-logic/  Scoring utilities
infra/
  docker/      docker-compose.yml
  terraform/
database/
  migrations/  SQL migration files (run on postgres container init)
```

## Common Commands

**Run everything:**
```bash
pnpm dev                    # all apps via Turbo
```

**Individual apps:**
```bash
cd apps/backend  && pnpm dev     # NestJS watch mode
cd apps/frontend && pnpm dev     # Next.js on port 4000
cd apps/ai-engine && uvicorn src.main:app --reload --port 8000
```

**Build:**
```bash
pnpm build                  # all apps
cd apps/backend && pnpm build   # NestJS only
```

**Tests:**
```bash
pnpm test                   # all
cd apps/backend && pnpm test                    # Jest
cd apps/backend && pnpm test:e2e               # E2E
cd apps/ai-engine && pytest tests/test_scoring.py  # single file
```

**Database:**
```bash
pnpm db:migrate             # run SQL migrations
pnpm db:studio              # open Prisma Studio
pnpm infra:up               # docker compose up
pnpm infra:down             # docker compose down
```

**Prisma (from apps/backend):**
```bash
pnpm prisma generate
pnpm prisma migrate dev
```

## Infrastructure

Docker services and their **host** ports (remapped due to system services on default ports):

| Service  | Host port | Container port | Notes |
|----------|-----------|----------------|-------|
| Postgres | 5433      | 5432           | pgvector:pg16 |
| Redis    | 6380      | 6379           | redis:7-alpine |
| n8n      | 5678      | 5678           | workflow automation |
| Adminer  | 8080      | 8080           | DB web UI |

Default dev credentials: `admin@growthengine.io` / `admin123` (seed: `database/migrations/999_seed_dev.sql`)

## Multi-Tenancy — Critical Pattern

All queries to tenant-scoped tables **must** go through `PrismaService.withTenant()`:

```typescript
return this.prisma.withTenant(tenantId, async () => {
  return this.prisma.lead.findMany({ where: { ... } });
});
```

This sets the PostgreSQL session variable `app.tenant_id` inside a transaction, which enables Row-Level Security on all multi-tenant tables (tenants, users, funnels, leads, conversations, lead_events). Omitting `withTenant()` returns empty results silently.

**tenantId source in controllers:** The `TenantMiddleware` parses the Bearer JWT and attaches `req.tenantId`. Use the `@TenantId()` decorator to access it in controllers. Public routes (login, register, webhooks/*, quiz/*) are excluded from the middleware.

## Authentication Flow

**Backend:** NestJS JWT + Passport. `JwtAuthGuard` on protected routes. Login response includes `accessToken`, `refreshToken`, and full user/tenant info (email, name, role, plan, tenantSlug, tenantName).

**Frontend:** NextAuth v4 with JWT strategy (no DB sessions). `CredentialsProvider` POSTs to `API_URL/api/v1/auth/login`. The token and tenant metadata are stored in the JWT and exposed via `useSession()` / `getServerSession()`.

**Session shape:**
```typescript
session.accessToken          // Bearer token for API calls
session.user.tenantId        // for scoped fetches
session.user.role            // owner | admin | member | viewer
session.user.plan            // starter | growth | scale | agency
```

## Queue Architecture (BullMQ)

Two queues with Redis backend:

- **scoring** (priority 2): `lead.captured` → calls AI Engine → persists scores → triggers messaging
- **messaging** (priority 3): sends WhatsApp/email sequences

Workers are `ScoringProcessor` and `MessagingProcessor` (both `OnModuleInit`). They instantiate BullMQ `Worker` directly (not via `@nestjs/bullmq`) — concurrency is read via `Number(this.config.get('SCORING_WORKER_CONCURRENCY', 5))` (always wrap with `Number()`, `ConfigService.get<number>()` returns strings at runtime).

Inject queue instances with `@InjectQueue('scoring')` / `@InjectQueue('messaging')` from `queue/inject-queue.decorator.ts` — not from `@nestjs/bullmq`.

## AI Engine (FastAPI)

Two endpoints:
- `POST /score` — deterministic formula: `quiz(40) + behavior(30) + engagement(20) + demographic(10)`
- `POST /classify` — Claude claude-sonnet-4-6 at temperature=0.2 with prompt caching for pathology classification

If AI Engine is unreachable, `ScoringProcessor` falls back to local scoring calculation.

**Scoring thresholds** (configurable via env):
- fuego: 80–100, caliente: 60–79, tibio: 40–59, frio: 20–39, motor_detenido: 0–19

## Shared Types

`@growth-engine/shared-types` is imported in backend and frontend. Key exports:
- `LeadSegment`, `LeadPathology`, `ScoreComponents`, `getSegmentFromScore()` — scoring domain
- `PipelineStage`, `LeadSource`, `Lead`, `LeadWithScore` — lead domain
- `TenantPlan`, `UserRole`, `AuthTokens`, `JwtPayload` — auth domain
- `Funnel`, `QuizConfig`, `QuizAnswer` — funnel/quiz domain
- `WHATSAPP_TEMPLATES` — messaging constants

## Frontend API Client

`apps/frontend/src/lib/api.ts` — all backend calls go through `apiFetch()`. Key notes:
- Backend routes do **not** include tenantId in the URL path — it comes from the JWT
- Analytics endpoint: `GET /api/v1/analytics/kpis` returns `{ leads, completionRate, avgScore, segmentDistribution, ... }` — not the `{ cpl, roas, ... }` KPI shape yet
- Leads pagination response: `{ data: LeadRow[], meta: { total, page, limit, pages } }`

## Environment Files

Each app has its own `.env` (not committed). Key variables per service:

**Backend** (`apps/backend/.env`): `DATABASE_URL` (port 5433), `REDIS_HOST/PORT` (6380), `JWT_SECRET`, `PORT=4001`, `FRONTEND_URL`

**Frontend** (`apps/frontend/.env`): `NEXTAUTH_URL`, `NEXTAUTH_SECRET` (required — empty breaks auth silently), `API_URL=http://localhost:4001`, `NEXT_PUBLIC_API_URL=http://localhost:4001`

**AI Engine** (`apps/ai-engine/.env`): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `REDIS_URL`, `DATABASE_URL`, `HOT_LEAD_THRESHOLD=80`

## Known Architectural Constraints

- **Recharts + SSR**: Import `MetricsDashboard` (and any Recharts-heavy component) with `dynamic(..., { ssr: false })` to avoid hydration ID mismatches.
- **Lucide icons**: `Funnel` does not exist in the installed version — use `Filter` instead.
- **`ConfigService.get<number>()`** does not cast to number at runtime — always wrap with `Number()`.
- **`quizConfig` Prisma field** is `JsonValue` — cast as `unknown as QuizConfig` when typing.

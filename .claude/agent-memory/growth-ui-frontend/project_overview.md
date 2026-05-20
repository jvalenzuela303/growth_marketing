---
name: Growth Engine Frontend Project Overview
description: Monorepo layout, frontend tech stack, key architectural decisions, and file structure established during initial scaffold
type: project
---

# Growth Engine Frontend — Project Overview

**Why:** This is a LATAM SaaS platform for marketing funnel optimization. The primary traffic source is Instagram/Facebook Ads (mobile-first). Every architectural decision is optimized for conversion rate on mobile.

**How to apply:** Always consider mobile-first (390px primary breakpoint), and defer non-critical JS. The funnel must work end-to-end even when the NestJS backend is unavailable (demo config fallback).

## Monorepo layout

- `/apps/frontend/` — Next.js 14 (App Router) — port 3000
- `/apps/backend/` — NestJS — port 3001
- `/apps/ai-engine/` — Python AI service — port 8000
- `/packages/shared-types/src/` — TypeScript types shared across all apps

## Shared types available

All from `@growth-engine/shared-types`:
- `QuizConfig`, `QuizQuestion`, `QuizAnswer`, `QuizOption`, `LeadGateData`, `QuizSubmission`
- `Lead`, `LeadWithScore`, `LeadCapturedEvent`, `HotLeadEvent`
- `Funnel`, `FunnelStatus`, `LandingConfig`, `FunnelResultsConfig`, `SegmentResultConfig`
- `LeadSegment` ('fuego'|'caliente'|'tibio'|'frio'|'motor_detenido'|'sin_clasificar')
- `ScoreComponents`, `ScoreResult`, `SEGMENT_THRESHOLDS`, `getSegmentFromScore`
- `Tenant`, `User`, `AuthTokens`, `JwtPayload`, `TenantPlan`, `UserRole`
- `MessageChannel`, `IChannel`, `WHATSAPP_TEMPLATES`

## Key files created

- `src/lib/utils.ts` — `cn()`, `SEGMENT_COLORS`, `SEGMENT_NAMES`, `STAGE_NAMES`, formatters
- `src/lib/api.ts` — typed API client with `getFunnelConfig`, `getDashboardKPIs`, `getLeads`, `getFunnels`
- `src/lib/auth.ts` — NextAuth config with credentials provider + JWT callbacks
- `src/stores/quiz-store.ts` — Zustand store for quiz wizard state
- `src/app/api/quiz/submit/route.ts` — CRITICAL route: validate → NestJS → Meta CAPI → return result
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler

## Route structure

### Marketing (unauthenticated)
- `/(marketing)/[tenant]/page.tsx` — AIDA landing page (Server Component)
- `/(marketing)/[tenant]/quiz/page.tsx` — Quiz (Server Component wrapping QuizFunnel Client Component)
- `/(marketing)/[tenant]/quiz/results/page.tsx` — Results (Server Component + LeadScoreCard client)

### Dashboard (requires auth)
- `/(dashboard)/layout.tsx` — Auth guard + sidebar + header
- `/(dashboard)/overview/page.tsx` — KPI dashboard (Server Component + MetricsDashboard client)
- `/(dashboard)/leads/page.tsx` — CRM table (Client Component with React Query)
- `/(dashboard)/funnels/page.tsx` — Funnel list (Server Component)
- `/(dashboard)/settings/page.tsx` — Credentials/integrations form (Client Component)

### Auth
- `/login/page.tsx` — Credentials login form

## Backend API contract (frontend expects)

- `GET /api/v1/funnels/{tenantSlug}/{funnelSlug}` → `Funnel`
- `POST /api/v1/quiz/{tenantSlug}/{funnelSlug}/submit` → `{ leadId, totalScore, segment, pathology }`
- `GET /api/v1/analytics/{tenantId}/kpis?range=30d` → `DashboardKPIs`
- `GET /api/v1/leads/{tenantId}?page&pageSize&segment&stage&search` → `LeadsPage`
- `GET /api/v1/funnels/{tenantId}` → `Funnel[]`
- `POST /api/v1/auth/login` → `{ user, tokens }`
- `PUT /api/v1/settings/{tenantId}` → (planned — settings page currently mocks the save)

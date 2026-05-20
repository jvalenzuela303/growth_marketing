---
name: Database Schema Registry v1.0.0
description: Summary of all PostgreSQL tables, partitioning strategy, key indexes, and BigQuery dataset design for The Growth Engine
type: reference
---

# Database Schema Registry — v1.0.0 (2026-05-08)

## Strategy
- Engine: PostgreSQL 15 on Cloud SQL
- Multi-tenant: Row-Level Security (RLS) with `tenant_id` on all tables
- Soft deletes: `deleted_at TIMESTAMPTZ` on all mutable tables
- Audit fields: `created_at`, `updated_at`, `deleted_at`, `tenant_id` on every table
- UUID primary keys via `uuid_generate_v4()`
- Required extensions: uuid-ossp, pgcrypto, pg_trgm

## Tables

| Table | Notes |
|---|---|
| `tenants` | SaaS tenant registry, plan/status/config JSONB |
| `users` | Platform users (SaaS clients), RBAC roles, Auth0 integration |
| `leads` | Core entity. source, funnel_stage, ai_score, CRM refs, JSONB custom_fields |
| `lead_events` | Append-only event log, partitioned by quarter. Idempotency key unique index |
| `quizzes` | Quiz builder config, scoring_model, result_segments JSONB |
| `quiz_questions` | Questions with branching logic, options JSONB, scoring weights |
| `quiz_submissions` | Answers JSONB, normalized_score, ai_analysis JSONB |
| `conversations` | WhatsApp/IG threads per lead, ai_context JSONB |
| `messages` | Individual messages, partitioned by quarter, delivery status |
| `audit_logs` | Security audit, partitioned by quarter, append-only |
| `api_keys` | Tenant API keys, stored as SHA-256 hash + prefix |

## Critical Indexes

- `leads`: Unique on (tenant_id, meta_lead_id) for Meta idempotency
- `leads`: GIN on custom_fields, tags, source_details for JSONB search
- `leads`: GIN trigram on full_name for fuzzy search
- `leads`: B-tree on (tenant_id, funnel_stage), (tenant_id, ai_score DESC), (tenant_id, created_at DESC)
- `lead_events`: Unique on (tenant_id, idempotency_key)
- `messages`: Unique on (tenant_id, external_msg_id)

## Partitioned Tables (quarterly)

- `lead_events` — PARTITION BY RANGE (created_at)
- `messages` — PARTITION BY RANGE (created_at)
- `audit_logs` — PARTITION BY RANGE (created_at)

## BigQuery Dataset: `growth_engine_analytics`

Tables:
- `leads_fact` — partitioned by created_date, clustered by (tenant_id, ai_score_tier, funnel_stage)
- `quiz_completions_fact` — partitioned by submission_date, clustered by (tenant_id, quiz_id, result_tier)
- `funnel_events_fact` — partitioned by event_date, clustered by (tenant_id, event_type)

Materialized Views:
- `mv_funnel_conversion` — weekly conversion rates by tenant/stage

## Migration Tool
TypeORM Migrations (NestJS services), Alembic (FastAPI services). Migrations run as Cloud Run Job before each deploy.

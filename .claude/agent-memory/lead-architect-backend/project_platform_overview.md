---
name: Platform Overview - The Growth Engine
description: Core product definition, funnel flow, tech stack, and external integrations for The Growth Engine SaaS platform
type: project
---

# The Growth Engine — Platform Overview

**What:** SaaS multi-tenant platform for intelligent lead funnels with AI, inspired by ScoreApp + HubSpot + GoHighLevel.

**Core Funnel Flow:**
Meta Ads → Landing Page → Quiz Diagnóstico → IA Scoring → CRM → WhatsApp IA → Seguimiento → Dashboard BI → Remarketing

**Why:** Automate lead capture-to-conversion pipeline for SMB clients, each as an isolated tenant.

**How to apply:** All backend design decisions must support this end-to-end flow as the primary business value chain.

## Tech Stack

**Backend Services:**
- NestJS (TypeScript) — primary for most microservices
- FastAPI (Python) — scoring-service and analytics-service (AI/data-heavy)

**Data:**
- PostgreSQL 15 (Cloud SQL) — primary operational DB, RLS multi-tenant
- Redis 7.x (Memorystore) — caching, BullMQ queues, JWT blacklist
- BigQuery — analytics, BI dashboards, lead funnel reporting

**GCP Services:**
- Cloud Run — all microservices (containerized, serverless)
- Cloud SQL — PostgreSQL with read replica
- Memorystore — Redis
- BigQuery — analytics dataset
- Cloud Storage — media/assets
- Vertex AI — Gemini 1.5 Pro for lead scoring
- Pub/Sub — async event bus between services
- Secret Manager — all credentials/secrets
- Cloud Armor — WAF
- Cloud Load Balancing — HTTPS entry point

**AI/ML:**
- Vertex AI + Gemini 1.5 Pro (primary scoring)
- OpenAI GPT-4o (backup/secondary scoring)
- Anthropic Claude (additional AI tasks)

**Messaging:**
- WhatsApp Business API (Meta) — primary conversational channel
- Twilio — SMS fallback
- Instagram API — secondary social channel

**CRM Integrations:**
- HubSpot
- GoHighLevel (GHL)

**Email:**
- SendGrid (primary)
- AWS SES (backup)

**Auth:**
- JWT (RS256, access 15min + refresh 7d rotating)
- Auth0 (OAuth provider integration)

## Microservices (8 core + 4 support)

Core: api-gateway, auth-service, lead-service, quiz-service, scoring-service, crm-sync-service, messaging-service, analytics-service

Support: workflow-service (Temporal/n8n), notification-service, tenant-service, media-service

## Communication Patterns

- Synchronous: REST between gateway and services; gRPC for high-frequency internal calls
- Asynchronous: Pub/Sub topics (lead.captured, lead.scored, quiz.completed, crm.synced, message.received)
- Queues: BullMQ over Redis with 5 priority levels (CRITICAL p10, HIGH p8, NORMAL p5, LOW p2, SCHEDULED cron)

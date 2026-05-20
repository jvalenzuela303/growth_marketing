---
name: Tech Stack — The Growth Engine
description: Herramientas, frameworks y servicios cloud definidos para el stack de TGE
type: project
---

Stack tecnológico confirmado para The Growth Engine (definido en sesión 2026-05-08):

**Backend API:** NestJS (TypeScript) — primario | FastAPI (Python) — alternativa documentada
**Frontend Quiz:** No especificado aún (candidatos: Typeform, Jotform, quiz personalizado)
**Automatización de Flujos:** n8n (preferencia sobre Make.com — confirmar si self-hosted)
**Email Marketing:** SendGrid (transaccional + secuencias nurturing)
**WhatsApp Business:** Twilio API
**Publicidad:** Meta Ads Manager + Meta Conversions API (CAPI) v21.0
**Analytics & BI:** BigQuery (data warehouse), Looker Studio (dashboards), Metabase (alternativa)
**Infraestructura:** Google Cloud Platform — Cloud Run (serverless), Artifact Registry, Cloud Logging, Cloud Build
**CI/CD:** GitHub Actions → Cloud Run con estrategia canary (10% → 100%)
**Pub/Sub Alertas:** Cloud Pub/Sub + Cloud Functions → Slack webhook + PagerDuty

**Región GCP:** us-central1 (definida por menor latencia con Cloud Run)
**API Version Meta:** v21.0 (usar esta versión en llamadas a Graph API)
**Node.js version:** 20 (LTS)

**Why:** Stack definido en primera sesión de arquitectura. Prioriza GCP para reducir complejidad operacional con Cloud Run managed.

**How to apply:** Al proponer integraciones nuevas, verificar compatibilidad con este stack antes de sugerir herramientas alternativas.

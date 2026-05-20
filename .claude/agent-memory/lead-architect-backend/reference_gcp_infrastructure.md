---
name: GCP Infrastructure Reference
description: GCP project naming, regions, service tiers, cost baseline, and resource conventions for The Growth Engine
type: reference
---

# GCP Infrastructure Reference

## Project & Region

- Production project ID: `growth-engine-prod`
- Staging project ID: `growth-engine-staging`
- Primary region: `us-central1`
- Docker registry: `us-central1-docker.pkg.dev/growth-engine-prod/services/`

## Cloud Run Services

| Service | Stack | min | max | CPU | RAM |
|---|---|---|---|---|---|
| api-gateway | NestJS | 1 | 20 | 1 | 512Mi |
| auth-service | NestJS | 1 | 10 | 1 | 512Mi |
| lead-service | NestJS | 2 | 50 | 2 | 1Gi |
| quiz-service | NestJS | 1 | 20 | 1 | 512Mi |
| scoring-service | FastAPI | 1 | 20 | 2 | 1Gi |
| crm-sync-service | NestJS | 1 | 10 | 1 | 512Mi |
| messaging-service | NestJS | 1 | 15 | 1 | 512Mi |
| analytics-service | FastAPI | 0 | 10 | 1 | 512Mi |

All services: gen2 execution environment, VPC-native, private ingress.

## Cloud SQL

- Engine: PostgreSQL 15
- Tier (prod): db-custom-4-16 (4 vCPU, 16 GB RAM)
- Tier (pre-prod/cost optimization): db-g1-small
- Read replica: 1 (for analytics queries)
- Storage: 100 GB SSD
- Backups: automated daily

## Memorystore (Redis)

- Version: Redis 7.x
- Tier: Basic
- Size: 6 GB (prod), 1 GB (pre-prod)

## Cost Baseline (MVP, 5 tenants, 10K leads/month)

Estimated as of 2026-05-08, 1 USD ≈ 980 CLP:

| Component | USD/month | CLP/month |
|---|---|---|
| Cloud Run | ~$77 | ~$75,460 |
| Cloud SQL | ~$474 | ~$464,520 |
| Memorystore | ~$215 | ~$210,700 |
| BigQuery | ~$18 | ~$17,640 |
| Cloud Storage | ~$42 | ~$41,160 |
| Pub/Sub | ~$0.40 | ~$392 |
| Vertex AI | ~$175 | ~$171,500 |
| Networking/Security | ~$44 | ~$43,120 |
| **GCP Total** | **~$1,045** | **~$1,024,100** |
| External services | ~$195 | ~$191,100 |
| **Grand Total** | **~$1,240** | **~$1,215,200** |

Pre-production optimized cost (db-g1-small + min=0 for non-critical): ~$400 USD/month (~$392,000 CLP).

## Naming Conventions

- Service accounts: `{service-name}-sa@growth-engine-prod.iam.gserviceaccount.com`
- Secrets: lowercase-hyphenated (e.g., `database-url`, `meta-app-secret`, `openai-api-key`)
- Cloud Run jobs: `db-migrate-{env}` for migrations
- VPC connector: `projects/growth-engine-prod/locations/us-central1/connectors/vpc-connector`

## CI/CD

- Platform: GitHub Actions
- Flow: test → security scan (Snyk + Semgrep) → build+push to GAR → deploy staging → deploy prod (manual approval)
- Prod deploy uses canary: 10% traffic → 5min wait → 100%
- Docker images tagged with git SHA and `latest`

---
name: Schema iteration history — migrations 005-007
description: Records what models and columns were added in each schema iteration for Growth Engine, including design decisions made
type: project
---

Schema is at `apps/backend/prisma/schema.prisma` (v1.3.0). SQL migrations are in `database/migrations/`.

**Iteration 1 (migration 005)** — Tenant notification settings
- Added to `tenants`: `alert_email`, `hot_lead_alert_enabled` (default TRUE), `daily_digest_enabled` (default FALSE)

**Iteration 2 (migration 006)** — Conversations, sequences, ad spend
- New model `ChatSession` (`chat_sessions`): stateful AI/chat context per lead per channel. No `updated_at` — use `last_activity_at` instead.
- New model `EmailSequence` (`email_sequences`): drip sequences with trigger/segment/score-gate logic. Steps stored as JSONB array.
- New model `EmailSequenceEnrollment` (`email_sequence_enrollments`): per-(sequence, lead) progress tracking. Unique constraint prevents duplicate enrollment.
- New model `AdSpend` (`ad_spend`): manual or API-imported spend records for CPL/ROI calculations. Linked to optional funnel.

**Iteration 3 (migration 007)** — Ads sync, scheduling, A/B testing
- Added to `tenants`: `ad_account_id`, `meta_instagram_page_id`, `meta_instagram_access_token`, `google_calendar_refresh_token`, `calendly_api_key`
- Added to `funnels`: `ab_test_enabled` (default FALSE)
- Added to `leads`: `variant_id` FK to `funnel_variants`
- New model `FunnelVariant` (`funnel_variants`): A/B variant with per-variant config overrides (nullable JSON). `is_control` marks the baseline. `traffic_split` is an integer percentage — service layer must validate active variants sum to 100.
- New model `Appointment` (`appointments`): calendar scheduling across video/phone/in-person channels. Supports Google Calendar and Calendly via `calendar_event_id`.
- New model `AdCampaign` (`ad_campaigns`): synced from Meta/Google API. Unique on `(tenant_id, external_id)`. Upsert on sync.
- New model `AdCampaignMetric` (`ad_campaign_metrics`): daily snapshot. Unique on `(campaign_id, date)` — rows are replaced by upsert, no `updated_at` trigger needed.
- New model `AudienceExport` (`audience_exports`): log of custom audience pushes to Meta. Append-only; no `updated_at`.

**Key design decisions:**
- All new tables have RLS enabled with `tenant_isolation_*` policies matching existing pattern.
- `EmailSequenceEnrollment.tenantId` is denormalized (no FK to tenants) — same pattern used to make the RLS index efficient without a join.
- `AdCampaignMetric` intentionally has no `updated_at` trigger — rows are replaced wholesale via upsert.
- `ChatSession` has no `updated_at` — `last_activity_at` serves that purpose semantically.
- SQL migrations use `DO $$ BEGIN ... END; $$` blocks for idempotent policy creation.

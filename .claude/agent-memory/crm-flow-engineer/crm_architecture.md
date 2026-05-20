---
name: CRM Architecture — The Growth Engine
description: Pipeline stages, custom fields schema, scoring thresholds, and CRM platform decision for The Growth Engine
type: project
---

CRM platform selected: GoHighLevel (Agency Plan $297 USD/month ~$280,665 CLP).

**Why GHL over HubSpot:** Multi-tenant SaaS natively, WhatsApp natively, 3.7x cheaper, funnel builder included, better n8n integration for LATAM agencies.

**Pipeline name:** "The Growth Engine — Funnel Principal"
Stages: Lead Capturado → Lead Clasificado → Lead Contactado → Lead Engagado → Demo Agendada → Propuesta Enviada → Cerrado Ganado → Cerrado Perdido

**Scoring thresholds:**
- HOT: lead_score_total >= 120 → immediate seller assignment + WA alert in <30min
- WARM: lead_score_total 60-119 → nurturing sequence WA + Email
- COLD: lead_score_total < 60 → Meta Ads remarketing
- DISQUALIFIED: revenue <$1k AND urgency = explorando, OR spam/opt-out all channels

**Score composition:**
- lead_score_quiz (max 100, does NOT decay — historical)
- lead_score_behavior (max 100, DECAYS: -10% at 7 days inactive, -20% more at 14 days, =0 at 30 days)
- lead_score_total = quiz + behavior

**Key custom field groups:** Quiz Data, Lead Score, Source & Tracking, Behavior, Commercial
Total custom fields defined: ~40 fields across all groups

**Seller routing:**
- Hot + revenue >$10k → Seller Senior, 30min SLA
- Hot + revenue <$10k → Seller Junior, 2h SLA
- Warm with 2+ WA responses → round-robin assignment

**How to apply:** Always use GHL's API v1 endpoints (rest.gohighlevel.com/v1/). Score recalculation happens in n8n, not GHL workflows, to maintain complex logic. GHL workflows only handle simple tag-based triggers.

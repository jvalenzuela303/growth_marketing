---
name: The Growth Engine — Project Context
description: Core project facts for The Growth Engine SaaS funnel platform — stack, objectives, constraints
type: project
---

The Growth Engine is a SaaS platform for intelligent marketing funnels targeting LATAM/Chile. The system must automate 60-70% of commercial interactions.

**Core Flow:** Meta Ads → Landing → Quiz (ScoreApp-style) → AI Classification → Lead Score → CRM → WhatsApp + Email automation → Sale/Agenda → Remarketing feedback loop

**Stack confirmed:**
- CRM: HubSpot or GoHighLevel (decision made: GoHighLevel recommended for this use case)
- Automation: n8n or Make.com
- Messaging: WhatsApp Business API + Twilio
- Email: SendGrid or AWS SES
- AI: OpenAI GPT + Gemini + Claude
- Infrastructure: GCP (Cloud Run, Cloud SQL, BigQuery, Vertex AI)
- Frontend: Next.js + React + TailwindCSS + Shadcn/UI
- Backend: Node.js + NestJS or Python + FastAPI
- Analytics: Metabase + Power BI + Looker Studio

**Budget constraint:** MVP between $600,000 and $1,000,000 CLP/month

**Lead segmentation (quiz score):**
- Hot Lead: >80 points → immediate human seller alert
- Warm Lead: 40-79 points → nurturing sequence
- Cold Lead: <40 points → remarketing Meta Ads

**Key success metrics:** CPL < $2 USD, Quiz completion >65%, Automation rate 70%, ROAS >4x

**Why:** Chilean market launch, needs to scale to LATAM. Designed as multi-tenant SaaS so other businesses can use the platform.

**How to apply:** All architecture decisions should favor GoHighLevel over HubSpot for this budget range in LATAM. n8n self-hosted preferred over Make.com for cost control at scale.

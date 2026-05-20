---
name: The Growth Engine — Project Context
description: SaaS platform for intelligent funnels — architecture, stack, and AI models used in the system
type: project
---

The Growth Engine is a SaaS platform for intelligent marketing funnels targeting LATAM SMBs.
Core objective: automate 60-70% of commercial interactions using AI.

**Why:** The system captures leads from Meta Ads, runs them through a diagnostic quiz (ScoreApp-style),
classifies them by AI-detected pathology, and routes them to automated conversational agents
or escalates to human sellers. Revenue target: MVP between $600,000-$1,000,000 CLP/month.

**How to apply:** All AI system design should serve this automation goal without losing the
human-feeling tone in automated messages. Every technical decision should consider LATAM cost constraints.

## Stack confirmed
- Frontend: Next.js + React + TailwindCSS + Shadcn/UI
- Backend: Python + FastAPI (preferred over NestJS for AI workloads)
- DB: PostgreSQL + pgvector (semantic search) + Redis (active sessions, TTL 24h)
- Cloud: Google Cloud Platform — Cloud Run, Cloud SQL, BigQuery, Vertex AI
- Automation: n8n (webhooks for sequence triggers) or Temporal.io
- CRM: HubSpot or GoHighLevel
- Messaging: WhatsApp Business API + Twilio + Instagram Messaging API
- Email: SendGrid or AWS SES
- Analytics: Metabase + Power BI + Looker Studio

## AI Models assigned by task
- claude-opus-4-6   : deep pathology classification (quiz analysis), long-form proposals
- claude-sonnet-4-6 : conversational agents (WhatsApp/Instagram), fast intent detection
- text-embedding-3-small (OpenAI): vector embeddings for pgvector semantic search
- gemini-1.5-pro    : multimodal analysis of Meta Ads creatives
- whisper-large-v3  : WhatsApp audio transcription (Spanish LATAM)

## Lead scoring weights (total 100 points)
- Behavior digital   : 30 pts (return visits x10, pricing clicks x8, time on page x5)
- Quiz responses     : 40 pts (completion x12, urgency x10, revenue x8, budget x6, timeline x4)
- Engagement metrics : 20 pts (price question x7, demo request x6, conversation rounds x4)
- Demographics       : 10 pts (decision maker x4, CRM existing x2, company size x2, industry x2)

## Lead temperature thresholds
- 80-100: HOT  — immediate action, escalate if >85
- 60-79:  WARM — active nurturing
- 40-59:  COLD — educational sequence
- 0-39:   DISQUALIFIED — re-entry 90 days

## 6 lead pathologies
1. PROBLEM_AWARE     — frustrated, confused, doesn't know solution exists
2. SOLUTION_SEEKING  — actively looking, hopeful, impatient
3. COMPARING         — analytical, evaluating options
4. READY_TO_BUY      — urgent, asking about price/start date
5. SKEPTICAL         — distrustful, bad prior experiences
6. UNAWARE           — vague, not qualified or not conscious of problem

## Escalation triggers (IA → human)
- Score >= 85
- demo/call request
- price question + score >= 70
- 4+ conversation rounds without CTA progress
- explicit "hablar con una persona"
- complaint or crisis mention

## Performance targets
- Sync response (chat): p50 ~450ms, p95 ~800ms
- Async classification (opus): ~1600ms background
- Prompt caching strategy: cache_control ephemeral on all static system prompts >1024 tokens

## AI Engine — Built 2026-05-08
Location: /home/jvalenzuela/Desarollo/growth_marketing/apps/ai-engine/

Key implementation decisions:
- Scoring formula uses math.log for visit normalization (anti-gaming)
- Quiz normalization: (raw/max_possible)*40 * completion_factor (0.5 to 1.0)
- hot_lead_alert requires score >= 80 AND q9 urgency AND q10 budget
- ai_provider.py is a singleton with automatic fallback between Anthropic/OpenAI
- Claude claude-sonnet-4-6 used for pathology classification (not GPT-4o-mini) — accuracy > cost tradeoff
- Prompt caching enabled on CLASSIFICATION_SYSTEM_PROMPT (use_cache=True in classify call)
- Real score range for "~95/100" spec target: needs max behavior (10 visits, 300s, all flags) + full quiz
- Actual score with spec's moderate behavior (3 visits, 180s): ~79 pts (CALIENTE, not FUEGO)

Files created:
- src/main.py, src/models/lead.py
- src/services/scoring_engine.py (pure Python, no AI calls, testable offline)
- src/services/ai_provider.py (Anthropic + OpenAI wrapper with fallback)
- src/services/ai_classifier.py (Claude classifier with JSON parsing + fallback)
- src/prompts/classification.py (system prompt + prompt builder)
- src/routers/health.py, scoring.py, classify.py
- tests/test_scoring.py (35 tests, all pure Python, no API keys needed)
- Dockerfile, requirements.txt, .env.example

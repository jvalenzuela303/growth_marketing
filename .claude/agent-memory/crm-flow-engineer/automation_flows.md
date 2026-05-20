---
name: Automation Flows — n8n Configuration for The Growth Engine
description: 5 core automation flows with node-level details for n8n/Make.com integration
type: project
---

Automation platform: n8n self-hosted on GCP Cloud Run (~$30 USD/month).

**5 active flows:**

FLOW 1: N8N_WebhookQuiz_LeadCreate_Classify
- Trigger: POST webhook /webhook/quiz-completed (from Quiz platform)
- Key nodes: Webhook → Set Variables → Function (score calc JS) → HTTP GET (dedup check) → IF (new/existing) → HTTP POST/PUT (GHL) → Switch (segment router) → Execute Workflow
- Score calculation is done in JavaScript in n8n Function node
- Deduplication: search by email in GHL before create

FLOW 2: N8N_HotLead_SellerAlert_Immediate
- Trigger: Called from Flow 1 when segment=hot, OR GHL webhook on tag "hot_lead"
- Key nodes: Webhook → HTTP GET (full contact) → Function (message prep) → IF (business hours L-V 9-19 Chile) → HTTP POST Twilio WA → HTTP POST GHL (create task 30min SLA) → HTTP POST first WA to lead
- Business hours check: hour>=9 && hour<19 && day>=1 && day<=5

FLOW 3: N8N_WarmLead_NurturingSequence
- Trigger: Called from Flow 1 when segment=warm
- Sequence: WA msg1 + Email1 (immediate) → Wait 24h → check activity → WA msg2 → Wait 48h → Email2 + WA msg3 → Wait 24h → Email3 + WA msg4 → Wait 48h → WA msg5 → Email4 + WA msg6
- Key: each Wait node checks if lead upgraded to hot before continuing

FLOW 4: N8N_ColdLead_MetaRemarketing
- Trigger: Called from Flow 1 when segment=cold, OR after Warm sequence completes without engagement
- Key: Adds lead to Meta Custom Audience via Graph API (emails/phones MUST be SHA256 hashed)
- Adds to both generic cold audience AND pathology-specific audience
- Minimal messaging: 1 email + 1 WA over 14 days

FLOW 5: N8N_Reengagement_Inactive7Days
- Trigger: Cron "0 9 * * 1-5" (weekdays 9am Santiago)
- Batch processes up to 50 leads at a time
- Applies score decay (JavaScript): 7 days = -10% behavior, 14 days = -20% more, 30 days = behavior=0
- Checks for segment downgrade and triggers appropriate re-engagement message

**Critical integration details:**
- GHL API: rest.gohighlevel.com/v1/ with Bearer token in Authorization header
- Twilio WA: api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json with form-urlencoded body
- Meta Graph API: graph.facebook.com/v19.0/{audience_id}/users — requires SHA256 hashed data
- SendGrid: api.sendgrid.com/v3/mail/send with API key Bearer token

**Idempotency note:** Flow 1 must check field quiz_processed=true before recalculating score to prevent double-scoring on webhook retries.

**Rate limits to respect:**
- GHL: 100 req/10s per sub-account
- Meta Graph: 200 calls/hr per user token
- Twilio WA: 15 messages/second per number
Use n8n throttle nodes for batch operations.

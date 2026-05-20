---
name: Messaging Sequences — WhatsApp and Email Templates by Segment
description: Timing, copy structure, and CTAs for all WhatsApp and email sequences across Hot/Warm/Cold segments
type: project
---

**WhatsApp sequences (Meta BSP template names defined):**

HOT LEAD (5 messages, 48h window):
- Msg 1 (T+0): growth_hot_result_delivery — deliver quiz score, ask "VER RESULTADO"
- Msg 2 (T+5min or on reply): growth_hot_diagnosis_detail — 3 critical points + Calendly
- Msg 3 (T+4h, no demo): growth_hot_social_proof — case study + ask for time slot
- Msg 4 (T+24h, no demo): growth_hot_urgency_soft — 5 clients/month scarcity + 21-day program
- Msg 5 (T+48h, close): growth_hot_final_touch — passive "respond LISTA to reactivate"

WARM LEAD (6 messages, 7 days):
- Msg 1 (T+0): deliver score, confirm WA active, ask "SI"
- Msg 2 (T+36h): error #1 in their category, case study link
- Msg 3 (T+4 days): full 3-page PDF diagnostic, offer 15min review
- Msg 4 (T+5 days): free guide link (5 automation errors in their business type)
- Msg 5 (T+7 days): direct message about inaction pattern, open question about objection
- Msg 6 (T+7 days +6h): soft close, Calendly link without artificial urgency

COLD LEAD (4 messages, 14 days):
- Msg 1 (T+48h): free resource related to pathology (NOT sales pitch)
- Msg 2 (T+5 days): check if they read the guide, resend link
- Msg 3 (T+10 days): passive "when ready write LISTO"
- Msg 4 (T+14 days): final message, no CTA — brand presence only

**Email sequences (SendGrid via n8n):**

Email 1 (immediate): Quiz result delivery
- Subject: "Tu diagnostico esta listo, {{first_name}} — Score: {{quiz_score}}/100"
- Content: Score gauge, 3 diagnosis points based on pathology, benchmarks, CTA varies by segment

Email 2 (day 2): Follow-up
- Subject varies: Hot = "queda 1 espacio...", Warm = "el error #1...", Cold = "un recurso para ti"
- Content: Error framing, mini case study with before/after metrics, open question

Email 3 (day 5): Case study
- Subject: "Como [empresa] paso de 40 leads/mes a 340 leads/mes"
- Content: Full case study with numbers (BEFORE/AFTER format), same problem as lead's pathology

Email 4 (day 10): Urgency/Offer
- Subject: Hot/Warm = "Ultimo aviso: cerramos inscripciones...", Cold = "algo cambio en tu diagnostico"
- Content: Scarcity (5 clients/month, 2 spots left), 30min extended diagnostic offer, no hard sell

**Important compliance notes:**
- WhatsApp opt-in checkbox REQUIRED in quiz form (save timestamp to consent_given_at field)
- Meta BSP template approval: 72-96h — submit 1 week before launch
- Unsubscribe link REQUIRED in all emails
- Opt-out from WA stops ALL WA sequences immediately (opted_out_whatsapp=true)

---
name: Quiz public result polling endpoint
description: GET /api/v1/quiz/result/:leadId — public endpoint added to quiz module for async scoring polling
type: project
---

`GET /api/v1/quiz/result/:leadId` is a public (no-auth) endpoint on `QuizController`. It polls the lead's scoring status after `submitQuiz` returns `status: 'processing'`.

Response contract:
- `status: 'processing'` — lead.segment is null, scoring worker not yet done
- `status: 'ready'` — lead.segment is set; returns segment, totalScore, and the matching key from funnel.resultsConfig

`resultsConfig` on Funnel is a JSON map: `{ [segmentLabel]: { title, cta, ... } }`. The endpoint extracts only the matching segment's config — no other segment data is exposed.

Route ordering matters: `GET result/:leadId` is declared BEFORE `GET :tenantSlug/:funnelSlug` in the controller to prevent Express from routing "result" as a tenantSlug.

**Why:** The quiz results page needs to render personalised content once async BullMQ scoring finishes. Polling this endpoint avoids WebSocket complexity for the MVP.

**How to apply:** If WebSocket is added later, this endpoint can be deprecated. Until then, frontend should poll with exponential backoff (suggested: 1s, 2s, 4s, max 30s).

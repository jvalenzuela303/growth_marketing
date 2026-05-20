---
name: Quiz Funnel Architecture
description: Zustand store design, auto-advance timing, lead gate position strategy, CAPI event flow, and branching logic decisions
type: project
---

# Quiz Funnel Architecture

**Why:** The quiz funnel is the primary lead capture mechanism. Every design decision here has direct revenue impact.

**How to apply:** When modifying quiz behavior, preserve the core patterns below. They are intentional CRO choices, not arbitrary.

## Zustand store (`src/stores/quiz-store.ts`)

- `currentStep` — zero-indexed question index
- `direction` — +1 forward / -1 backward (drives Framer Motion slide direction)
- `totalSteps` — set on `init()`, comes from `config.questions.length`
- `isLeadGate` — true when the lead capture form is displayed (not a quiz step)
- `answers` — `Record<stepIndex, QuizAnswer>` — persisted across steps
- `sessionId` — UUID generated once per quiz session via `generateSessionId()`
- `getProgress()` — intentionally capped at **85%** before lead gate (psychological trick)

## Auto-advance timing

- Single choice: **350ms** delay after selection before advancing. This lets the selection animation (color + scale) play fully before the slide transition starts. Do NOT reduce below 300ms.
- Multiple choice: No auto-advance. An explicit "Continuar" button appears after first selection.

## Lead gate position

- Default: `config.leadGatePosition = 5` (after 5th answer)
- The progress bar shows max 85% during the quiz, then 90% when lead gate is shown.
- This creates an "almost done" effect that significantly increases form completion.
- After lead gate submit, frontend redirects to `/{tenant}/quiz/results?score=X&segment=Y&leadId=Z`

## CAPI event flow (`src/app/api/quiz/submit/route.ts`)

1. Receive `QuizSubmission` from frontend
2. Validate required fields (tenantSlug, funnelSlug, answers, leadData.email)
3. POST to `{API_URL}/api/v1/quiz/{tenantSlug}/{funnelSlug}/submit` with 10s timeout
4. Hash email + phone with SHA-256 (Web Crypto — edge compatible)
5. Fire `QuizCompleted` CAPI event to Meta (fire-and-forget — never blocks response)
6. Return `{ leadId, totalScore, segment, pathology, eventId }` to frontend
7. `eventId` format: `quiz_{leadId}_{timestamp}` — used for browser pixel deduplication

## Score branching logic

- `QuizOption.skipToStep` — if set, overrides the sequential next-step navigation
- Branching is handled in `QuizFunnel.tsx` `handleAnswer` callback
- Score calculation happens entirely in the NestJS backend (not frontend)
- Frontend only shows a "Score indicator" widget after the first answer (shows answered count %, not real score)

## Animation setup

- `SLIDE_VARIANTS` in `QuizFunnel.tsx`: enter from right (+dir) or left (-dir), exit to opposite
- `AnimatePresence mode="wait"` — waits for exit before rendering next step (prevents overlap)
- Transition: tween, easeInOut, 280ms
- Question options animate in with staggered delay (0.06s per option) via `motion.button`

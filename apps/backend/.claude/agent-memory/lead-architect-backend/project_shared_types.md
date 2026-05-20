---
name: Shared types evolution — quiz.types.ts and funnel.types.ts
description: Tracks additions to shared-types package for quiz branching, landing sections, and result config richness
type: project
---

Package path: `packages/shared-types/src/`

**quiz.types.ts additions (Iteration 2/3)**
- New interface `BranchingRule { id, triggerQuestionId, triggerOptionId, targetQuestionId: string | null }` — `null` targetQuestionId means end-quiz immediately.
- `QuizQuestion` extended: `mediaUrl?`, `layout?: 'list' | 'grid' | 'image_grid'`, `branchingRules?: BranchingRule[]` (outgoing edges from this question).
- `QuizConfig` extended: `branchingRules?: BranchingRule[]` — global denormalized list for full-graph lookups. Must stay in sync with per-question arrays; service layer owns that invariant.
- Legacy `skipToStep` on `QuizOption` is retained for backward compatibility — new code should prefer `BranchingRule`.

**funnel.types.ts additions (Iteration 3)**
- New interface `LandingSection { id, type: hero|benefits|social_proof|faq|cta_bottom, enabled, content: Record<string,unknown> }` for visual page builder.
- `LandingConfig` extended: `sections?`, `primaryColor?`, `fontFamily?`.
- `SegmentResultConfig` extended: `videoUrl?`, `calendlyUrl?`, `socialProofText?`, `imageUrl?`.
- `Funnel` interface extended: `abTestEnabled: boolean` (required, mirrors DB column).

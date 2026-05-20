---
name: Design System Tokens and Conventions
description: Segment color system, KPI semaphore colors, touch target standards, breakpoints, and CSS component classes
type: project
---

# Design System Tokens

**Why:** Consistency across components is critical for a trustworthy, professional product. These tokens are the single source of truth.

**How to apply:** Always import from `src/lib/utils.ts` (`SEGMENT_COLORS`, `SEGMENT_NAMES`, etc.). Never hardcode colors inline.

## Segment color system

| Segment        | Background      | Text            | Border          | Hex     |
|----------------|-----------------|-----------------|-----------------|---------|
| fuego          | bg-emerald-50   | text-emerald-700| border-emerald  | #10b981 |
| caliente       | bg-blue-50      | text-blue-700   | border-blue     | #3b82f6 |
| tibio          | bg-amber-50     | text-amber-700  | border-amber    | #f59e0b |
| frio           | bg-slate-50     | text-slate-700  | border-slate    | #64748b |
| motor_detenido | bg-gray-50      | text-gray-600   | border-gray     | #6b7280 |

## KPI semaphore

- Above target: `bg-emerald-500` / `text-emerald-600`
- At risk (70-89%): `bg-amber-500` / `text-amber-600`
- Below target: `bg-red-500` / `text-red-600`

## Touch targets

- Standard interactive elements: **56px** minimum height (`min-h-[56px]` / `.btn-cta`)
- Secondary actions (pagination, icon buttons): **44px** minimum (`min-h-[44px]` / `min-h-touch-sm`)
- NEVER go below 44px for anything tappable

## Primary breakpoint

- **390px** (iPhone 14 Pro) is the primary design target
- Use `xs:` prefix for 390px styles
- Scale up to sm (640), md (768), lg (1024)

## Brand colors

- Primary brand: `brand-500` (#c44df0) — purple gradient
- Accent/CTA: `accent-500` (#f97316) — orange
- Hero background: `bg-gradient-hero` — dark purple gradient
- CTA button: `bg-gradient-cta` — orange gradient with `shadow-cta`

## CSS component classes (defined in globals.css)

- `.quiz-option` — base option button (56px min height, rounded-2xl, border)
- `.quiz-option--selected` — selected state (brand-500 border + shadow-quiz)
- `.kpi-card` — dashboard metric card (white, rounded-2xl, shadow-card)
- `.btn-cta` — primary CTA button (orange gradient, 56px, font-bold)
- `.segment-badge` — inline segment label pill
- `.skeleton` — shimmer loading placeholder

## Font rules

- Minimum body font size: **16px** (prevents iOS zoom on input focus)
- Headings: Inter, font-extrabold
- Numbers/metrics: `tabular-nums` class for alignment
- All text in Spanish (es-MX locale)

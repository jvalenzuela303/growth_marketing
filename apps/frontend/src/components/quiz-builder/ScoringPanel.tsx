'use client'

import { cn } from '@/lib/utils'
import { getSegmentFromScore } from '@growth-engine/shared-types'
import { useQuizBuilderStore } from '@/stores/quiz-builder-store'
import type { QuizQuestion } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Segment band config
// ---------------------------------------------------------------------------

const SEGMENT_BANDS = [
  {
    key:   'fuego',
    label: 'Fuego',
    range: '80-100',
    min: 80,
    max: 100,
    bg:   'bg-emerald-100',
    text: 'text-emerald-700',
    bar:  'bg-emerald-400',
  },
  {
    key:   'caliente',
    label: 'Caliente',
    range: '60-79',
    min: 60,
    max: 79,
    bg:   'bg-blue-100',
    text: 'text-blue-700',
    bar:  'bg-blue-400',
  },
  {
    key:   'tibio',
    label: 'Tibio',
    range: '40-59',
    min: 40,
    max: 59,
    bg:   'bg-amber-100',
    text: 'text-amber-700',
    bar:  'bg-amber-400',
  },
  {
    key:   'frio',
    label: 'Frio',
    range: '20-39',
    min: 20,
    max: 39,
    bg:   'bg-slate-100',
    text: 'text-slate-600',
    bar:  'bg-slate-400',
  },
  {
    key:   'motor_detenido',
    label: 'Motor Detenido',
    range: '0-19',
    min: 0,
    max: 19,
    bg:   'bg-gray-100',
    text: 'text-gray-600',
    bar:  'bg-gray-300',
  },
]

const SCORING_CATEGORIES: { value: QuizQuestion['scoringCategory']; label: string }[] = [
  { value: 'quiz',         label: 'Quiz' },
  { value: 'behavior',     label: 'Comportamiento' },
  { value: 'engagement',   label: 'Engagement' },
  { value: 'demographic',  label: 'Demografico' },
]

// ---------------------------------------------------------------------------
// Live segment preview
// ---------------------------------------------------------------------------

function LiveSegmentPreview({ question }: { question: QuizQuestion }) {
  const maxOptionPoints = Math.max(
    ...(question.options ?? []).map((o) => o.points),
    0,
  )
  // Normalize to 0-100 to preview best-case segment
  const normalizedMax = Math.round((Math.min(maxOptionPoints, 20) / 20) * 100)
  const bestSegment   = getSegmentFromScore(normalizedMax)

  const band = SEGMENT_BANDS.find((b) => b.key === bestSegment) ?? SEGMENT_BANDS[4]

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2.5 rounded-xl',
        band.bg,
      )}
      aria-label={`Segmento maximo posible: ${band.label}`}
    >
      <div>
        <p className="text-xs font-semibold text-slate-500">Segmento max. posible</p>
        <p className={cn('text-sm font-bold mt-0.5', band.text)}>{band.label}</p>
      </div>
      <span className="text-xs tabular-nums font-medium text-slate-500">
        {normalizedMax}%
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ScoringPanel
// ---------------------------------------------------------------------------

export function ScoringPanel() {
  const questions      = useQuizBuilderStore((s) => s.questions)
  const selectedId     = useQuizBuilderStore((s) => s.selectedQuestionId)
  const updateQuestion = useQuizBuilderStore((s) => s.updateQuestion)

  const question = questions.find((q: QuizQuestion) => q.id === selectedId)

  if (!question) {
    return (
      <div className="p-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Scoring
        </p>
        <p className="text-xs text-slate-400">Selecciona una pregunta.</p>
      </div>
    )
  }

  const weight = question.weight ?? 1.0

  return (
    <div className="p-4 border-b border-slate-100 space-y-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Scoring
      </p>

      {/* Weight slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor={`weight-${question.id}`}
            className="text-xs font-medium text-slate-600"
          >
            Peso de la pregunta
          </label>
          <span className="text-xs font-bold text-brand-600 tabular-nums">
            {weight.toFixed(1)}x
          </span>
        </div>
        <input
          id={`weight-${question.id}`}
          type="range"
          min={0.5}
          max={3.0}
          step={0.5}
          value={weight}
          onChange={(e) => updateQuestion(question.id, { weight: parseFloat(e.target.value) })}
          className={cn(
            'w-full h-2 rounded-full appearance-none cursor-pointer',
            'bg-slate-200 accent-brand-500',
          )}
          aria-label="Peso de la pregunta en el scoring"
        />
        <div className="flex justify-between text-[10px] text-slate-300">
          <span>0.5x</span>
          <span>1.0x</span>
          <span>1.5x</span>
          <span>2.0x</span>
          <span>2.5x</span>
          <span>3.0x</span>
        </div>
      </div>

      {/* Scoring category */}
      <div className="space-y-2">
        <label
          htmlFor={`category-${question.id}`}
          className="block text-xs font-medium text-slate-600"
        >
          Categoria de scoring
        </label>
        <select
          id={`category-${question.id}`}
          value={question.scoringCategory}
          onChange={(e) =>
            updateQuestion(question.id, {
              scoringCategory: e.target.value as QuizQuestion['scoringCategory'],
            })
          }
          className={cn(
            'w-full px-3 py-2 text-sm bg-white',
            'border border-slate-200 rounded-xl',
            'focus:border-brand-400 focus:outline-none',
            'transition-colors',
          )}
          aria-label="Categoria de scoring"
        >
          {SCORING_CATEGORIES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Live segment preview */}
      {(question.options ?? []).length > 0 && (
        <LiveSegmentPreview question={question} />
      )}

      {/* Segment bands reference */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          Bandas de segmento
        </p>
        {SEGMENT_BANDS.map((band) => (
          <div key={band.key} className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', band.bar)} />
            <span className="text-xs text-slate-600 flex-1">{band.label}</span>
            <span className="text-[10px] tabular-nums text-slate-400">{band.range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

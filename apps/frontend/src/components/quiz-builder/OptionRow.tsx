'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSegmentFromScore } from '@growth-engine/shared-types'
import type { QuizOption } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Segment dot indicator — gives immediate visual feedback on score value
// ---------------------------------------------------------------------------

const SEGMENT_DOT_COLORS: Record<string, string> = {
  fuego:          'bg-emerald-400',
  caliente:       'bg-blue-400',
  tibio:          'bg-amber-400',
  frio:           'bg-slate-400',
  motor_detenido: 'bg-gray-300',
  sin_clasificar: 'bg-gray-200',
}

function ScoreDot({ points }: { points: number }) {
  // Normalize option points (0-20 scale) to 0-100 for segment calculation
  const normalizedScore = Math.round((Math.min(Math.max(points, 0), 20) / 20) * 100)
  const segment = getSegmentFromScore(normalizedScore)
  const dotColor = SEGMENT_DOT_COLORS[segment] ?? 'bg-gray-200'

  return (
    <span
      className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)}
      title={`${points} pts — segmento: ${segment}`}
      aria-label={`Puntaje ${points}, segmento ${segment}`}
    />
  )
}

// ---------------------------------------------------------------------------
// OptionRow
// ---------------------------------------------------------------------------

interface OptionRowProps {
  option: QuizOption
  questionId: string
  onUpdate: (patch: Partial<QuizOption>) => void
  onRemove: () => void
}

export function OptionRow({ option, questionId, onUpdate, onRemove }: OptionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 group',
        isDragging && 'opacity-50 shadow-card-hover z-50',
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'flex-shrink-0 p-1 text-slate-300 rounded',
          'hover:text-slate-500 cursor-grab active:cursor-grabbing',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
        aria-label="Arrastrar opcion"
      >
        <GripVertical className="w-3.5 h-3.5" aria-hidden />
      </button>

      {/* Score dot */}
      <ScoreDot points={option.points} />

      {/* Option text */}
      <input
        type="text"
        value={option.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Texto de la opcion…"
        className={cn(
          'flex-1 min-w-0 px-3 py-2 text-sm bg-white',
          'border border-slate-200 rounded-xl',
          'focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400',
          'placeholder:text-slate-300 transition-colors',
        )}
        aria-label="Texto de la opcion"
      />

      {/* Score input */}
      <div className="flex-shrink-0 flex items-center gap-1">
        <input
          type="number"
          min={0}
          max={20}
          value={option.points}
          onChange={(e) => onUpdate({ points: Number(e.target.value) })}
          className={cn(
            'w-14 px-2 py-2 text-sm text-center bg-white',
            'border border-slate-200 rounded-xl',
            'focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400',
            'transition-colors tabular-nums',
          )}
          aria-label="Puntaje de la opcion"
        />
        <span className="text-xs text-slate-400 flex-shrink-0">pts</span>
      </div>

      {/* Delete */}
      <button
        onClick={onRemove}
        className={cn(
          'flex-shrink-0 p-1.5 rounded-lg text-slate-300',
          'opacity-0 group-hover:opacity-100',
          'hover:text-red-500 hover:bg-red-50',
          'transition-all duration-100',
          'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        )}
        aria-label="Eliminar opcion"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  )
}

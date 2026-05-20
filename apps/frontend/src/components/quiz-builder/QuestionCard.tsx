'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { cn, truncate } from '@/lib/utils'
import type { QuizQuestion } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Question type label map
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  single_choice:   'Seleccion',
  multiple_choice: 'Multiple',
  scale:           'Escala',
  text:            'Texto',
}

const TYPE_COLORS: Record<string, string> = {
  single_choice:   'bg-brand-100 text-brand-700',
  multiple_choice: 'bg-blue-100 text-blue-700',
  scale:           'bg-amber-100 text-amber-700',
  text:            'bg-slate-100 text-slate-600',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface QuestionCardProps {
  question: QuizQuestion
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}

export function QuestionCard({
  question,
  isSelected,
  onSelect,
  onRemove,
}: QuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const displayText = question.text.trim()
    ? truncate(question.text, 52)
    : 'Pregunta sin titulo'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-start gap-2 px-3 py-3 cursor-pointer',
        'border-l-[3px] transition-colors duration-100',
        isSelected
          ? 'bg-brand-50 border-l-brand-500'
          : 'bg-white border-l-transparent hover:bg-slate-50 hover:border-l-slate-300',
        isDragging && 'opacity-50 shadow-card-hover z-50',
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Pregunta ${question.index + 1}: ${displayText}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className={cn(
          'flex-shrink-0 mt-0.5 p-0.5 rounded text-slate-300',
          'hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        )}
        aria-label="Arrastrar para reordenar"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" aria-hidden />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 flex-shrink-0 tabular-nums">
            {String(question.index + 1).padStart(2, '0')}
          </span>
          <span
            className={cn(
              'segment-badge text-[10px] px-2 py-0',
              TYPE_COLORS[question.type] ?? 'bg-slate-100 text-slate-600',
            )}
          >
            {TYPE_LABELS[question.type] ?? question.type}
          </span>
          {question.required && (
            <span className="text-[10px] font-semibold text-red-400 flex-shrink-0">*</span>
          )}
        </div>
        <p
          className={cn(
            'text-xs leading-snug',
            question.text.trim() ? 'text-slate-700' : 'text-slate-400 italic',
          )}
        >
          {displayText}
        </p>
      </div>

      {/* Delete button — visible on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className={cn(
          'flex-shrink-0 p-1 rounded-lg text-slate-300',
          'opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50',
          'transition-all duration-100',
          'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
        )}
        aria-label={`Eliminar pregunta ${question.index + 1}`}
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
      </button>
    </div>
  )
}

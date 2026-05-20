'use client'

import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, Type, List, ToggleLeft, AlignLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuizBuilderStore } from '@/stores/quiz-builder-store'
import { QuestionCard } from './QuestionCard'
import type { QuizQuestion } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Question type picker
// ---------------------------------------------------------------------------

type QuestionType = 'single_choice' | 'multiple_choice' | 'scale' | 'text'

const ADD_TYPES: { type: QuestionType; label: string; description: string; Icon: React.ElementType }[] = [
  {
    type: 'single_choice',
    label: 'Seleccion unica',
    description: 'Una sola respuesta posible',
    Icon: ToggleLeft,
  },
  {
    type: 'multiple_choice',
    label: 'Seleccion multiple',
    description: 'Varias respuestas posibles',
    Icon: List,
  },
  {
    type: 'scale',
    label: 'Escala',
    description: 'Valor numerico del 1 al 10',
    Icon: AlignLeft,
  },
  {
    type: 'text',
    label: 'Texto abierto',
    description: 'Respuesta libre del usuario',
    Icon: Type,
  },
]

interface TypePickerProps {
  onSelect: (type: QuestionType) => void
  onClose: () => void
}

function TypePicker({ onSelect, onClose }: TypePickerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-10"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute bottom-full left-0 mb-2 w-full z-20 bg-white border border-slate-200 rounded-2xl shadow-card-hover overflow-hidden"
        role="menu"
        aria-label="Tipo de pregunta"
      >
        {ADD_TYPES.map(({ type, label, description, Icon }) => (
          <button
            key={type}
            onClick={() => { onSelect(type); onClose() }}
            className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-brand-50 transition-colors"
            role="menuitem"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-100 flex items-center justify-center">
              <Icon className="w-4 h-4 text-brand-600" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="text-xs text-slate-400">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export function QuizBuilderCanvas() {
  const questions          = useQuizBuilderStore((s) => s.questions)
  const selectedId         = useQuizBuilderStore((s) => s.selectedQuestionId)
  const selectQuestion     = useQuizBuilderStore((s) => s.selectQuestion)
  const addQuestion        = useQuizBuilderStore((s) => s.addQuestion)
  const removeQuestion     = useQuizBuilderStore((s) => s.removeQuestion)
  const reorderQuestions   = useQuizBuilderStore((s) => s.reorderQuestions)

  const [showPicker, setShowPicker] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      reorderQuestions(String(active.id), String(over.id))
    }
  }

  const questionIds = questions.map((q: QuizQuestion) => q.id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Preguntas
          <span className="ml-2 text-slate-300 font-normal normal-case tracking-normal">
            ({questions.length})
          </span>
        </p>
      </div>

      {/* Sortable list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 px-4 text-center">
            <p className="text-xs text-slate-400">
              Agrega tu primera pregunta para comenzar.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
              {questions.map((question: QuizQuestion) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  isSelected={question.id === selectedId}
                  onSelect={() => selectQuestion(question.id)}
                  onRemove={() => removeQuestion(question.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add question button */}
      <div className="relative px-3 py-3 border-t border-slate-100">
        {showPicker && (
          <TypePicker
            onSelect={(type) => addQuestion(type)}
            onClose={() => setShowPicker(false)}
          />
        )}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            'flex items-center justify-center gap-2 w-full min-h-[40px]',
            'rounded-xl border-2 border-dashed border-slate-200',
            'text-sm font-medium text-slate-400',
            'hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50',
            'transition-all duration-150',
          )}
          aria-label="Agregar pregunta"
          aria-expanded={showPicker}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Agregar pregunta
        </button>
      </div>
    </div>
  )
}

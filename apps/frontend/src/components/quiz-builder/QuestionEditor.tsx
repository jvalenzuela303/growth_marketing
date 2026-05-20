'use client'

import { useRef, useEffect } from 'react'
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
import { Plus, MousePointerClick } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuizBuilderStore } from '@/stores/quiz-builder-store'
import { OptionRow } from './OptionRow'
import type { QuizQuestion, QuizOption } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3 text-center max-w-xs">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <MousePointerClick className="w-6 h-6 text-slate-400" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-slate-700">Selecciona una pregunta</p>
          <p className="text-sm text-slate-400 mt-1">
            Haz clic en una pregunta del panel izquierdo para editarla aqui.
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Type selector tab
// ---------------------------------------------------------------------------

const TYPE_OPTIONS: { value: QuizQuestion['type']; label: string }[] = [
  { value: 'single_choice',   label: 'Seleccion unica' },
  { value: 'multiple_choice', label: 'Multiple' },
  { value: 'scale',           label: 'Escala' },
  { value: 'text',            label: 'Texto' },
]

// ---------------------------------------------------------------------------
// Auto-resize textarea hook
// ---------------------------------------------------------------------------

function useAutoResize(ref: React.RefObject<HTMLTextAreaElement>, value: string) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, ref])
}

// ---------------------------------------------------------------------------
// QuestionEditor
// ---------------------------------------------------------------------------

export function QuestionEditor() {
  const questions       = useQuizBuilderStore((s) => s.questions)
  const selectedId      = useQuizBuilderStore((s) => s.selectedQuestionId)
  const updateQuestion  = useQuizBuilderStore((s) => s.updateQuestion)
  const addOption       = useQuizBuilderStore((s) => s.addOption)
  const updateOption    = useQuizBuilderStore((s) => s.updateOption)
  const removeOption    = useQuizBuilderStore((s) => s.removeOption)

  const question = questions.find((q: QuizQuestion) => q.id === selectedId)

  const textRef     = useRef<HTMLTextAreaElement>(null)
  const subtitleRef = useRef<HTMLTextAreaElement>(null)

  useAutoResize(textRef, question?.text ?? '')
  useAutoResize(subtitleRef, question?.subtitle ?? '')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleOptionDragEnd(event: DragEndEvent) {
    if (!question) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const options = question.options ?? []
    const oldIdx  = options.findIndex((o: QuizOption) => o.id === String(active.id))
    const newIdx  = options.findIndex((o: QuizOption) => o.id === String(over.id))
    if (oldIdx === -1 || newIdx === -1) return

    const reordered = [...options]
    const [moved]   = reordered.splice(oldIdx, 1)
    reordered.splice(newIdx, 0, moved)
    updateQuestion(question.id, { options: reordered })
  }

  if (!question) return <EmptyState />

  const isChoiceType = question.type === 'single_choice' || question.type === 'multiple_choice'
  const isScale      = question.type === 'scale'
  const isText       = question.type === 'text'
  const optionIds    = (question.options ?? []).map((o: QuizOption) => o.id)

  return (
    <div className="flex-1 p-6 space-y-6 max-w-2xl mx-auto w-full">
      {/* Question number + type */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-slate-400 tabular-nums bg-slate-100 px-2 py-1 rounded-lg">
          P{question.index + 1}
        </span>

        {/* Type tabs */}
        <div
          className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1"
          role="tablist"
          aria-label="Tipo de pregunta"
        >
          {TYPE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={question.type === value}
              onClick={() => updateQuestion(question.id, { type: value, options: question.type !== value ? [] : question.options })}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                question.type === value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Required toggle */}
        <label className="flex items-center gap-2 ml-auto text-sm text-slate-500 cursor-pointer select-none">
          <span>Obligatoria</span>
          <button
            role="switch"
            aria-checked={question.required}
            onClick={() => updateQuestion(question.id, { required: !question.required })}
            className={cn(
              'relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0',
              question.required ? 'bg-brand-500' : 'bg-slate-200',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                question.required && 'translate-x-4',
              )}
            />
          </button>
        </label>
      </div>

      {/* Question text */}
      <div className="space-y-2">
        <label htmlFor={`q-text-${question.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Texto de la pregunta
        </label>
        <textarea
          id={`q-text-${question.id}`}
          ref={textRef}
          value={question.text}
          onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
          placeholder="Escribe aqui tu pregunta…"
          rows={2}
          className={cn(
            'w-full px-4 py-3 text-lg font-medium text-slate-900 bg-white',
            'border-2 border-slate-200 rounded-2xl resize-none overflow-hidden',
            'focus:border-brand-400 focus:outline-none focus:ring-0',
            'placeholder:text-slate-300 placeholder:font-normal transition-colors',
          )}
          aria-label="Texto de la pregunta"
        />
      </div>

      {/* Subtitle */}
      <div className="space-y-2">
        <label htmlFor={`q-sub-${question.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Descripcion <span className="text-slate-300 font-normal normal-case">(opcional)</span>
        </label>
        <textarea
          id={`q-sub-${question.id}`}
          ref={subtitleRef}
          value={question.subtitle ?? ''}
          onChange={(e) => updateQuestion(question.id, { subtitle: e.target.value })}
          placeholder="Agrega contexto adicional para esta pregunta…"
          rows={1}
          className={cn(
            'w-full px-4 py-2.5 text-sm text-slate-600 bg-white',
            'border border-slate-200 rounded-xl resize-none overflow-hidden',
            'focus:border-brand-400 focus:outline-none focus:ring-0',
            'placeholder:text-slate-300 transition-colors',
          )}
          aria-label="Descripcion de la pregunta"
        />
      </div>

      {/* Options — single_choice / multiple_choice */}
      {isChoiceType && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Opciones de respuesta
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleOptionDragEnd}
          >
            <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {(question.options ?? []).map((option: QuizOption) => (
                  <OptionRow
                    key={option.id}
                    option={option}
                    questionId={question.id}
                    onUpdate={(patch) => updateOption(question.id, option.id, patch)}
                    onRemove={() => removeOption(question.id, option.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            onClick={() => addOption(question.id)}
            className={cn(
              'flex items-center gap-2 w-full min-h-[40px] px-4',
              'border-2 border-dashed border-slate-200 rounded-xl',
              'text-sm font-medium text-slate-400',
              'hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50',
              'transition-all duration-150',
            )}
            aria-label="Agregar opcion"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Agregar opcion
          </button>
        </div>
      )}

      {/* Scale configuration */}
      {isScale && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Configuracion de escala
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-500">Valor minimo</label>
              <input
                type="number"
                min={1}
                max={9}
                value={(question.options?.[0]?.points) ?? 1}
                onChange={(e) => {
                  const updated = [...(question.options ?? [])]
                  updated[0] = { ...(updated[0] ?? { id: crypto.randomUUID(), text: '' }), points: Number(e.target.value) }
                  updateQuestion(question.id, { options: updated })
                }}
                className={cn(
                  'w-full px-3 py-2 text-sm bg-white',
                  'border border-slate-200 rounded-xl',
                  'focus:border-brand-400 focus:outline-none',
                )}
                aria-label="Valor minimo de escala"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-500">Valor maximo</label>
              <input
                type="number"
                min={2}
                max={10}
                value={(question.options?.[1]?.points) ?? 10}
                onChange={(e) => {
                  const updated = [...(question.options ?? [])]
                  updated[1] = { ...(updated[1] ?? { id: crypto.randomUUID(), text: '' }), points: Number(e.target.value) }
                  updateQuestion(question.id, { options: updated })
                }}
                className={cn(
                  'w-full px-3 py-2 text-sm bg-white',
                  'border border-slate-200 rounded-xl',
                  'focus:border-brand-400 focus:outline-none',
                )}
                aria-label="Valor maximo de escala"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-500">Etiqueta minimo</label>
              <input
                type="text"
                value={question.options?.[0]?.text ?? ''}
                onChange={(e) => {
                  const updated = [...(question.options ?? [])]
                  updated[0] = { ...(updated[0] ?? { id: crypto.randomUUID(), points: 1 }), text: e.target.value }
                  updateQuestion(question.id, { options: updated })
                }}
                placeholder="Ej: Nada"
                className={cn(
                  'w-full px-3 py-2 text-sm bg-white',
                  'border border-slate-200 rounded-xl',
                  'focus:border-brand-400 focus:outline-none',
                  'placeholder:text-slate-300',
                )}
                aria-label="Etiqueta del valor minimo"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-500">Etiqueta maximo</label>
              <input
                type="text"
                value={question.options?.[1]?.text ?? ''}
                onChange={(e) => {
                  const updated = [...(question.options ?? [])]
                  updated[1] = { ...(updated[1] ?? { id: crypto.randomUUID(), points: 10 }), text: e.target.value }
                  updateQuestion(question.id, { options: updated })
                }}
                placeholder="Ej: Completamente"
                className={cn(
                  'w-full px-3 py-2 text-sm bg-white',
                  'border border-slate-200 rounded-xl',
                  'focus:border-brand-400 focus:outline-none',
                  'placeholder:text-slate-300',
                )}
                aria-label="Etiqueta del valor maximo"
              />
            </div>
          </div>
        </div>
      )}

      {/* Text question — placeholder config */}
      {isText && (
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Texto de ayuda (placeholder)
          </label>
          <input
            type="text"
            value={question.subtitle ?? ''}
            onChange={(e) => updateQuestion(question.id, { subtitle: e.target.value })}
            placeholder="Ej: Escribe tu respuesta aqui…"
            className={cn(
              'w-full px-4 py-2.5 text-sm bg-white',
              'border border-slate-200 rounded-xl',
              'focus:border-brand-400 focus:outline-none',
              'placeholder:text-slate-300 transition-colors',
            )}
            aria-label="Placeholder del campo de texto"
          />
          <p className="text-xs text-slate-400">
            Este texto aparecera como guia dentro del campo de respuesta.
          </p>
        </div>
      )}
    </div>
  )
}

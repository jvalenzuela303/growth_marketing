'use client'

import { useState } from 'react'
import { Plus, Trash2, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuizBuilderStore, type BranchingRule } from '@/stores/quiz-builder-store'
import type { QuizQuestion, QuizOption } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// AddRuleForm
// ---------------------------------------------------------------------------

interface AddRuleFormProps {
  question: QuizQuestion
  allQuestions: QuizQuestion[]
  onAdd: (rule: Omit<BranchingRule, 'id'>) => void
  onCancel: () => void
}

function AddRuleForm({ question, allQuestions, onAdd, onCancel }: AddRuleFormProps) {
  const [ifOptionId,   setIfOptionId]   = useState('')
  const [thenJumpToId, setThenJumpToId] = useState('')

  const otherQuestions = allQuestions.filter((q) => q.id !== question.id)

  function handleAdd() {
    if (!ifOptionId || !thenJumpToId) return
    onAdd({
      questionId:  question.id,
      ifOptionId,
      thenJumpToId,
    })
    setIfOptionId('')
    setThenJumpToId('')
  }

  return (
    <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
      {/* If answer is */}
      <div className="space-y-1">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          Si la respuesta es
        </label>
        <select
          value={ifOptionId}
          onChange={(e) => setIfOptionId(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white',
            'border border-slate-200 rounded-xl',
            'focus:border-brand-400 focus:outline-none',
          )}
          aria-label="Condicion: opcion seleccionada"
        >
          <option value="">Selecciona una opcion…</option>
          {(question.options ?? []).map((opt: QuizOption) => (
            <option key={opt.id} value={opt.id}>
              {opt.text.trim() ? opt.text : `Opcion ${(question.options ?? []).indexOf(opt) + 1}`}
            </option>
          ))}
        </select>
      </div>

      {/* Then jump to */}
      <div className="space-y-1">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
          Saltar a la pregunta
        </label>
        <select
          value={thenJumpToId}
          onChange={(e) => setThenJumpToId(e.target.value)}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white',
            'border border-slate-200 rounded-xl',
            'focus:border-brand-400 focus:outline-none',
          )}
          aria-label="Destino: pregunta a la que saltar"
        >
          <option value="">Selecciona una pregunta…</option>
          {otherQuestions.map((q) => (
            <option key={q.id} value={q.id}>
              P{q.index + 1} — {q.text.trim() ? q.text.slice(0, 40) : 'Sin titulo'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className={cn(
            'flex-1 py-2 text-xs font-medium text-slate-500',
            'border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors',
          )}
        >
          Cancelar
        </button>
        <button
          onClick={handleAdd}
          disabled={!ifOptionId || !thenJumpToId}
          className={cn(
            'flex-1 py-2 text-xs font-semibold text-white rounded-xl transition-all',
            ifOptionId && thenJumpToId
              ? 'bg-brand-600 hover:bg-brand-700'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed',
          )}
          aria-label="Confirmar regla de ramificacion"
        >
          Agregar regla
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BranchingPanel
// ---------------------------------------------------------------------------

export function BranchingPanel() {
  const questions          = useQuizBuilderStore((s) => s.questions)
  const selectedId         = useQuizBuilderStore((s) => s.selectedQuestionId)
  const branchingRules     = useQuizBuilderStore((s) => s.branchingRules)
  const addBranchingRule   = useQuizBuilderStore((s) => s.addBranchingRule)
  const removeBranchingRule = useQuizBuilderStore((s) => s.removeBranchingRule)

  const [showForm, setShowForm] = useState(false)

  const question = questions.find((q: QuizQuestion) => q.id === selectedId) as QuizQuestion | undefined

  // Branching is only meaningful for single_choice questions
  const isBranchable = question != null && question.type === 'single_choice'

  if (!question) {
    return (
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Ramificacion
        </p>
        <p className="text-xs text-slate-400">Selecciona una pregunta.</p>
      </div>
    )
  }

  if (!isBranchable) {
    return (
      <div className="p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Ramificacion
        </p>
        <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
          <GitBranch className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" aria-hidden />
          <p className="text-xs text-slate-400 leading-relaxed">
            La ramificacion solo esta disponible para preguntas de seleccion unica.
          </p>
        </div>
      </div>
    )
  }

  // Rules for this question — question is guaranteed non-null here (guarded above)
  const q = question!
  const questionRules = branchingRules.filter((r) => r.questionId === q.id)

  function getOptionLabel(optionId: string) {
    const opt = (q.options ?? []).find((o: QuizOption) => o.id === optionId)
    if (!opt) return 'Opcion desconocida'
    return opt.text.trim() ? opt.text.slice(0, 30) : 'Opcion sin texto'
  }

  function getQuestionLabel(qId: string) {
    const q = questions.find((tq: QuizQuestion) => tq.id === qId)
    if (!q) return 'Pregunta desconocida'
    const preview = q.text.trim() ? q.text.slice(0, 28) : 'Sin titulo'
    return `P${q.index + 1} — ${preview}`
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Ramificacion
        </p>
        <span className="text-[10px] text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
          {questionRules.length} regla{questionRules.length !== 1 ? 's' : ''}
        </span>
      </div>

      {questionRules.length === 0 && !showForm && (
        <p className="text-xs text-slate-400">
          Sin reglas. El quiz avanzara a la siguiente pregunta por defecto.
        </p>
      )}

      {/* Existing rules */}
      <div className="space-y-2">
        {questionRules.map((rule) => (
          <div
            key={rule.id}
            className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 group"
          >
            <GitBranch className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" aria-hidden />
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Si:</span>{' '}
                <span className="text-brand-700 font-medium">{getOptionLabel(rule.ifOptionId)}</span>
              </p>
              <p className="text-xs text-slate-600">
                <span className="font-medium">Ir a:</span>{' '}
                <span className="text-slate-800 font-medium">{getQuestionLabel(rule.thenJumpToId)}</span>
              </p>
            </div>
            <button
              onClick={() => removeBranchingRule(rule.id)}
              className={cn(
                'flex-shrink-0 p-1 rounded-lg text-slate-300',
                'opacity-0 group-hover:opacity-100',
                'hover:text-red-500 hover:bg-red-50',
                'transition-all duration-100',
                'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
              )}
              aria-label="Eliminar regla de ramificacion"
            >
              <Trash2 className="w-3 h-3" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      {/* Add rule form */}
      {showForm ? (
        <AddRuleForm
          question={q}
          allQuestions={questions}
          onAdd={(rule) => {
            addBranchingRule(rule)
            setShowForm(false)
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          disabled={(question.options ?? []).length === 0}
          className={cn(
            'flex items-center gap-2 w-full min-h-[36px] px-3',
            'border-2 border-dashed border-slate-200 rounded-xl',
            'text-xs font-medium text-slate-400',
            'hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:bg-transparent disabled:hover:text-slate-400',
            'transition-all duration-150',
          )}
          aria-label="Agregar regla de ramificacion"
          title={
            (question.options ?? []).length === 0
              ? 'Agrega opciones a la pregunta primero'
              : 'Agregar regla de ramificacion'
          }
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Agregar regla
        </button>
      )}
    </div>
  )
}

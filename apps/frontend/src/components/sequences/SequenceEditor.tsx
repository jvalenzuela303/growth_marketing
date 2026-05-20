'use client'

/**
 * SequenceEditor — ordered list of email steps with add/remove.
 */

import { Plus } from 'lucide-react'
import { cn, generateSessionId } from '@/lib/utils'
import { StepEditor } from './StepEditor'
import type { SequenceStep } from '@/lib/api'

interface SequenceEditorProps {
  steps:    SequenceStep[]
  onChange: (steps: SequenceStep[]) => void
}

export function SequenceEditor({ steps, onChange }: SequenceEditorProps) {
  function addStep() {
    const newStep: SequenceStep = {
      id:          generateSessionId(),
      delayDays:   1,
      delayHours:  0,
      subject:     '',
      body:        '',
    }
    onChange([...steps, newStep])
  }

  function updateStep(id: string, updated: SequenceStep) {
    onChange(steps.map((s) => (s.id === id ? updated : s)))
  }

  function deleteStep(id: string) {
    onChange(steps.filter((s) => s.id !== id))
  }

  return (
    <div className="space-y-4">
      {steps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-2xl border-2 border-dashed border-slate-200 text-center gap-2">
          <span className="text-3xl" aria-hidden>✉️</span>
          <p className="text-sm font-semibold text-slate-600">Sin pasos aún</p>
          <p className="text-xs text-slate-400">Agrega el primer email de la secuencia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div key={step.id} className="relative">
              {/* Connector line between steps */}
              {idx < steps.length - 1 && (
                <div
                  className="absolute left-7 top-full w-0.5 h-3 bg-slate-200 z-10"
                  aria-hidden
                />
              )}
              <StepEditor
                step={step}
                index={idx}
                onChange={(updated) => updateStep(step.id, updated)}
                onDelete={() => deleteStep(step.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add step button */}
      <button
        onClick={addStep}
        className={cn(
          'flex items-center gap-2 w-full min-h-[44px] px-4 py-3 rounded-2xl',
          'border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500',
          'hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50',
          'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-400',
        )}
      >
        <Plus className="w-4 h-4" aria-hidden />
        Agregar paso
      </button>
    </div>
  )
}

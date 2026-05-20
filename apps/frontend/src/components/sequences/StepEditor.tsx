'use client'

/**
 * StepEditor — edits a single email step: delay, subject, body, preview.
 *
 * CRO Impact: Well-timed automated follow-ups are the #1 lever for
 * converting quiz leads that didn't book immediately. This editor makes
 * sequence configuration intuitive, reducing time-to-launch for operators.
 */

import { useState } from 'react'
import { Trash2, Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SequenceStep } from '@/lib/api'

interface StepEditorProps {
  step:       SequenceStep
  index:      number
  onChange:   (updated: SequenceStep) => void
  onDelete:   () => void
}

// ---------------------------------------------------------------------------
// Email preview modal
// ---------------------------------------------------------------------------

function EmailPreviewModal({
  subject,
  body,
  onClose,
}: {
  subject: string
  body:    string
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal
        aria-label="Vista previa del email"
      >
        {/* Email chrome */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vista previa del email</p>
            <button
              onClick={onClose}
              aria-label="Cerrar vista previa"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex gap-2">
              <span className="text-slate-400 w-14 flex-shrink-0">De:</span>
              <span className="text-slate-700">noreply@growthengine.app</span>
            </div>
            <div className="flex gap-2">
              <span className="text-slate-400 w-14 flex-shrink-0">Asunto:</span>
              <span className="text-slate-800 font-semibold">{subject || '(sin asunto)'}</span>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 max-h-80 overflow-y-auto">
          {body ? (
            <div
              className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          ) : (
            <p className="text-sm text-slate-400 italic">(sin contenido)</p>
          )}
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// StepEditor
// ---------------------------------------------------------------------------

export function StepEditor({ step, index, onChange, onDelete }: StepEditorProps) {
  const [showPreview, setShowPreview] = useState(false)
  const [bodyMode, setBodyMode]       = useState<'plain' | 'html'>('plain')

  function update<K extends keyof SequenceStep>(field: K, value: SequenceStep[K]) {
    onChange({ ...step, [field]: value })
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-card">
        {/* Step header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span
              className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-extrabold flex items-center justify-center flex-shrink-0"
              aria-label={`Paso ${index + 1}`}
            >
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-slate-700">Paso {index + 1}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPreview(true)}
              aria-label="Vista previa del email"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden />
              Vista previa
            </button>
            <button
              onClick={onDelete}
              aria-label="Eliminar paso"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden />
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="p-4 space-y-4">
          {/* Delay */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Demora {index === 0 ? '(desde el trigger)' : '(desde el paso anterior)'}
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={step.delayDays}
                  onChange={(e) => update('delayDays', parseInt(e.target.value, 10) || 0)}
                  aria-label="Días de demora"
                  className="w-16 min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
                <span className="text-sm text-slate-600">días</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={step.delayHours}
                  onChange={(e) => update('delayHours', parseInt(e.target.value, 10) || 0)}
                  aria-label="Horas de demora"
                  className="w-16 min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
                <span className="text-sm text-slate-600">horas</span>
              </div>
            </div>
            {index === 0 && step.delayDays === 0 && step.delayHours === 0 && (
              <p className="text-xs text-amber-600">
                Envío inmediato al activarse el trigger
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor={`step-${step.id}-subject`}>
              Asunto del email
            </label>
            <input
              id={`step-${step.id}-subject`}
              type="text"
              value={step.subject}
              onChange={(e) => update('subject', e.target.value)}
              placeholder="Ej: {nombre}, tu plan de acción está listo"
              className="w-full min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
            <p className="text-xs text-slate-400">
              Usa {'{nombre}'} y {'{empresa}'} para personalización dinámica
            </p>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor={`step-${step.id}-body`}>
                Cuerpo del email
              </label>
              {/* Plain/HTML toggle */}
              <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                {(['plain', 'html'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setBodyMode(mode)}
                    className={cn(
                      'px-2.5 py-1 font-medium transition-colors',
                      bodyMode === mode
                        ? 'bg-brand-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50',
                    )}
                  >
                    {mode === 'plain' ? 'Texto' : 'HTML'}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              id={`step-${step.id}-body`}
              rows={6}
              value={step.body}
              onChange={(e) => update('body', e.target.value)}
              placeholder={
                bodyMode === 'html'
                  ? '<p>Hola {nombre},</p>\n<p>Tu diagnóstico está listo...</p>'
                  : 'Hola {nombre},\n\nTu diagnóstico está listo...'
              }
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <EmailPreviewModal
          subject={step.subject}
          body={step.body}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}

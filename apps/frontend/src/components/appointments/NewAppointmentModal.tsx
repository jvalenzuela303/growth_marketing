'use client'

/**
 * NewAppointmentModal — slide-over for scheduling a new appointment with a lead.
 *
 * CRO Impact: Reducing the steps to book a follow-up meeting directly from the
 * dashboard eliminates the most common bottleneck in the sales handoff — the
 * gap between a hot lead and a booked call.
 */

import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAppointment } from '@/lib/api'
import type { CreateAppointmentInput } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
  accessToken: string
}

interface FormState {
  leadId: string
  scheduledAt: string
  durationMins: number
  channel: 'video_call' | 'phone' | 'in_person'
  meetingUrl: string
  notes: string
}

const INITIAL_FORM: FormState = {
  leadId: '',
  scheduledAt: '',
  durationMins: 30,
  channel: 'video_call',
  meetingUrl: '',
  notes: '',
}

const CHANNEL_LABELS: Record<FormState['channel'], string> = {
  video_call: 'Videollamada',
  phone: 'Llamada telefonica',
  in_person: 'En persona',
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!form.leadId.trim()) {
    errors.leadId = 'El ID del lead es obligatorio.'
  } else if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(form.leadId.trim())
  ) {
    errors.leadId = 'Debe ser un UUID valido (ej: 123e4567-e89b-12d3-...).'
  }

  if (!form.scheduledAt) {
    errors.scheduledAt = 'La fecha y hora son obligatorias.'
  } else if (new Date(form.scheduledAt) <= new Date()) {
    errors.scheduledAt = 'La fecha debe ser futura.'
  }

  return errors
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewAppointmentModal({
  isOpen,
  onClose,
  onCreated,
  accessToken,
}: NewAppointmentModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function handleChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    if (fieldErrors[key]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n })
    }
  }

  function handleClose() {
    setForm(INITIAL_FORM)
    setFieldErrors({})
    setSubmitError('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    const errors = validate(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)
    const payload: CreateAppointmentInput = {
      leadId: form.leadId.trim(),
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      durationMins: form.durationMins,
      channel: form.channel,
      ...(form.meetingUrl.trim() ? { meetingUrl: form.meetingUrl.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    }

    try {
      await createAppointment(payload, accessToken)
      onCreated()
      handleClose()
    } catch {
      setSubmitError('No se pudo crear la cita. Intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={cn(
          'relative w-full sm:max-w-lg',
          'bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl',
          'max-h-[90dvh] overflow-y-auto',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-3xl">
          <h2 id="modal-title" className="text-lg font-extrabold text-slate-900">
            Nueva cita
          </h2>
          <button
            onClick={handleClose}
            aria-label="Cerrar modal"
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5" noValidate>
          {/* Lead ID */}
          <div className="space-y-1.5">
            <label htmlFor="leadId" className="text-sm font-semibold text-slate-700">
              ID del lead <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="leadId"
              type="text"
              value={form.leadId}
              onChange={(e) => handleChange('leadId', e.target.value)}
              placeholder="UUID del lead (ej: 123e4567-e89b-...)"
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                fieldErrors.leadId ? 'border-red-400' : 'border-slate-200',
              )}
              aria-invalid={!!fieldErrors.leadId}
              aria-describedby={fieldErrors.leadId ? 'leadId-error' : undefined}
            />
            {fieldErrors.leadId && (
              <p id="leadId-error" className="text-xs text-red-600 flex items-center gap-1" role="alert">
                <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden />
                {fieldErrors.leadId}
              </p>
            )}
            <p className="text-xs text-slate-400">
              En produccion, este campo seria un buscador de leads. Por ahora ingresa el UUID directamente.
            </p>
          </div>

          {/* Scheduled At */}
          <div className="space-y-1.5">
            <label htmlFor="scheduledAt" className="text-sm font-semibold text-slate-700">
              Fecha y hora <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => handleChange('scheduledAt', e.target.value)}
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-sm text-slate-800',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                fieldErrors.scheduledAt ? 'border-red-400' : 'border-slate-200',
              )}
              aria-invalid={!!fieldErrors.scheduledAt}
              aria-describedby={fieldErrors.scheduledAt ? 'scheduledAt-error' : undefined}
            />
            {fieldErrors.scheduledAt && (
              <p id="scheduledAt-error" className="text-xs text-red-600 flex items-center gap-1" role="alert">
                <AlertCircle className="w-3 h-3 flex-shrink-0" aria-hidden />
                {fieldErrors.scheduledAt}
              </p>
            )}
          </div>

          {/* Duration + Channel row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="durationMins" className="text-sm font-semibold text-slate-700">
                Duracion (min)
              </label>
              <input
                id="durationMins"
                type="number"
                min={5}
                max={480}
                step={5}
                value={form.durationMins}
                onChange={(e) => handleChange('durationMins', Number(e.target.value))}
                className={cn(
                  'w-full rounded-xl border border-slate-200 px-3 py-2.5',
                  'text-sm text-slate-800',
                  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                )}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="channel" className="text-sm font-semibold text-slate-700">
                Canal
              </label>
              <select
                id="channel"
                value={form.channel}
                onChange={(e) => handleChange('channel', e.target.value as FormState['channel'])}
                className={cn(
                  'w-full rounded-xl border border-slate-200 px-3 py-2.5',
                  'text-sm text-slate-800 bg-white',
                  'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                )}
              >
                {(Object.keys(CHANNEL_LABELS) as FormState['channel'][]).map((ch) => (
                  <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Meeting URL */}
          <div className="space-y-1.5">
            <label htmlFor="meetingUrl" className="text-sm font-semibold text-slate-700">
              URL de la reunion <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="meetingUrl"
              type="url"
              value={form.meetingUrl}
              onChange={(e) => handleChange('meetingUrl', e.target.value)}
              placeholder="https://meet.google.com/..."
              className={cn(
                'w-full rounded-xl border border-slate-200 px-3 py-2.5',
                'text-sm text-slate-800 placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
              )}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label htmlFor="notes" className="text-sm font-semibold text-slate-700">
              Notas <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Contexto, agenda o temas a tratar..."
              rows={3}
              className={cn(
                'w-full rounded-xl border border-slate-200 px-3 py-2.5',
                'text-sm text-slate-800 placeholder:text-slate-400 resize-none',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
              )}
            />
          </div>

          {/* Submit error */}
          {submitError && (
            <p className="flex items-center gap-1.5 text-sm text-red-600" role="alert">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
              {submitError}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={cn(
                'flex-1 min-h-[44px] rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600',
                'hover:bg-slate-50 transition-colors disabled:opacity-50',
              )}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-2xl',
                'bg-gradient-brand text-white text-sm font-bold',
                'hover:opacity-90 transition-opacity shadow-card',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Guardando...
                </>
              ) : (
                'Agendar cita'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

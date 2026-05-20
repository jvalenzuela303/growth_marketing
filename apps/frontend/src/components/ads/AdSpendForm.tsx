'use client'

/**
 * AdSpendForm — slide-over modal for manually adding ad spend entries.
 * Used when campaigns are not directly synced from Meta/Google APIs.
 *
 * CRO Impact: Manual spend entry ensures CPL/CAC calculations are always
 * accurate even before API integrations are configured — operators can
 * act on real numbers from day one.
 */

import { useState } from 'react'
import { X, DollarSign, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdSpendInput } from '@/lib/api'

type Source = AdSpendInput['source']

interface AdSpendFormProps {
  isOpen:  boolean
  onClose: () => void
  onSubmit: (data: AdSpendInput) => Promise<void>
}

const SOURCES: { value: Source; label: string }[] = [
  { value: 'meta_ads',   label: 'Meta Ads (Facebook/Instagram)' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'manual',     label: 'Manual / Otro canal' },
]

const CURRENCIES = ['CLP', 'USD', 'COP', 'ARS', 'BRL', 'MXN']

export function AdSpendForm({ isOpen, onClose, onSubmit }: AdSpendFormProps) {
  const [formData, setFormData] = useState<AdSpendInput>({
    campaignName: '',
    source:       'meta_ads',
    spend:        0,
    currency:     'CLP',
    periodFrom:   '',
    periodTo:     '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess]           = useState(false)
  const [errors, setErrors]             = useState<Partial<Record<keyof AdSpendInput, string>>>({})

  function validate(): boolean {
    const newErrors: typeof errors = {}
    if (!formData.campaignName.trim()) newErrors.campaignName = 'Requerido'
    if (formData.spend <= 0)           newErrors.spend = 'Debe ser mayor a 0'
    if (!formData.periodFrom)          newErrors.periodFrom = 'Requerido'
    if (!formData.periodTo)            newErrors.periodTo = 'Requerido'
    if (formData.periodFrom && formData.periodTo && formData.periodFrom > formData.periodTo) {
      newErrors.periodTo = 'Debe ser posterior a la fecha de inicio'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
        setFormData({ campaignName: '', source: 'meta_ads', spend: 0, currency: 'CLP', periodFrom: '', periodTo: '' })
      }, 1500)
    } catch {
      setErrors({ campaignName: 'Error al guardar. Intenta de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  function update<K extends keyof AdSpendInput>(field: K, value: AdSpendInput[K]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50',
          'flex flex-col transform transition-transform duration-300',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal
        aria-label="Agregar gasto publicitario"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registrar gasto de publicidad</h2>
            <p className="text-xs text-slate-500 mt-0.5">Entrada manual de inversión publicitaria</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Campaign name */}
          <FormField label="Nombre de la campaña" error={errors.campaignName} required>
            <input
              type="text"
              value={formData.campaignName}
              onChange={(e) => update('campaignName', e.target.value)}
              placeholder="Ej: Campaña de captación LATAM Q2"
              className={inputClass(!!errors.campaignName)}
            />
          </FormField>

          {/* Source */}
          <FormField label="Canal / Fuente" required>
            <select
              value={formData.source}
              onChange={(e) => update('source', e.target.value as Source)}
              className={inputClass(false)}
            >
              {SOURCES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </FormField>

          {/* Spend + currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="Inversión total" error={errors.spend} required>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formData.spend || ''}
                    onChange={(e) => update('spend', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className={cn(inputClass(!!errors.spend), 'pl-9')}
                  />
                </div>
              </FormField>
            </div>
            <FormField label="Moneda" required>
              <select
                value={formData.currency}
                onChange={(e) => update('currency', e.target.value)}
                className={inputClass(false)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Fecha inicio" error={errors.periodFrom} required>
              <input
                type="date"
                value={formData.periodFrom}
                onChange={(e) => update('periodFrom', e.target.value)}
                className={inputClass(!!errors.periodFrom)}
              />
            </FormField>
            <FormField label="Fecha fin" error={errors.periodTo} required>
              <input
                type="date"
                value={formData.periodTo}
                onChange={(e) => update('periodTo', e.target.value)}
                className={inputClass(!!errors.periodTo)}
              />
            </FormField>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || success}
            className={cn(
              'flex-1 min-h-[44px] px-4 rounded-xl text-sm font-semibold text-white',
              'flex items-center justify-center gap-2 transition-all duration-150',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              success
                ? 'bg-emerald-500'
                : 'bg-gradient-brand hover:opacity-90 active:scale-[0.98] shadow-card',
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Guardando…</>
            ) : success ? (
              <><CheckCircle2 className="w-4 h-4" aria-hidden /> Guardado</>
            ) : (
              'Guardar gasto'
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function inputClass(hasError: boolean) {
  return cn(
    'w-full min-h-[44px] px-3 py-2.5 rounded-xl border text-sm text-slate-800',
    'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
    'transition-colors duration-150',
    hasError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
  )
}

interface FormFieldProps {
  label:    string
  error?:   string
  required?: boolean
  children: React.ReactNode
}

function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500" aria-hidden>*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

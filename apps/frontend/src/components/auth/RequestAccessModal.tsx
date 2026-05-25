'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

const PLAN_OPTIONS = [
  { value: '', label: 'Selecciona un plan de interés…' },
  { value: 'starter',  label: 'Starter — hasta 500 leads/mes' },
  { value: 'growth',   label: 'Growth — hasta 2.000 leads/mes' },
  { value: 'scale',    label: 'Scale — hasta 10.000 leads/mes' },
  { value: 'agency',   label: 'Agency — volumen ilimitado' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface FormState {
  name:    string
  company: string
  email:   string
  phone:   string
  plan:    string
}

const EMPTY: FormState = { name: '', company: '', email: '', phone: '', plan: '' }

export function RequestAccessModal({ isOpen, onClose }: Props) {
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  if (!isOpen) return null

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/request-access`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Error al enviar la solicitud.')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setForm(EMPTY)
    setSuccess(false)
    setError('')
    onClose()
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-access-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-brand-400" aria-hidden />
            </div>
            <div>
              <h2 id="request-access-title" className="text-base font-bold text-white">
                Solicitar acceso
              </h2>
              <p className="text-xs text-slate-400">Te contactamos en menos de 24 horas</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            /* ── Estado de éxito ── */
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-white">Solicitud enviada</p>
                <p className="text-sm text-slate-400">
                  Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo pronto.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
              >
                Entendido
              </button>
            </div>
          ) : (
            /* ── Formulario ── */
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label htmlFor="ra-name" className="block text-xs font-semibold text-slate-300">
                    Nombre completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="ra-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="María González"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label htmlFor="ra-company" className="block text-xs font-semibold text-slate-300">
                    Empresa <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="ra-company"
                    name="company"
                    type="text"
                    required
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Acme Corp."
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ra-email" className="block text-xs font-semibold text-slate-300">
                  Email corporativo <span className="text-red-400">*</span>
                </label>
                <input
                  id="ra-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@empresa.cl"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="ra-phone" className="block text-xs font-semibold text-slate-300">
                    Teléfono
                  </label>
                  <input
                    id="ra-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+56 9 1234 5678"
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="ra-plan" className="block text-xs font-semibold text-slate-300">
                    Plan de interés
                  </label>
                  <select
                    id="ra-plan"
                    name="plan"
                    value={form.plan}
                    onChange={handleChange}
                    className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-slate-800 text-sm text-slate-300 focus:border-brand-500 focus:outline-none transition-colors cursor-pointer"
                  >
                    {PLAN_OPTIONS.map(o => (
                      <option key={o.value} value={o.value} disabled={o.value === ''}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !form.name || !form.company || !form.email}
                className="w-full min-h-[44px] mt-1 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  'Enviar solicitud'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

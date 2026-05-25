'use client'

import { useState } from 'react'
import { X, Loader2, CheckCircle2, LifeBuoy, Copy, Check, AlertCircle } from 'lucide-react'

const API_URL      = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'
const SUPPORT_EMAIL = 'soporte@growthengine.io'

const ISSUE_OPTIONS = [
  { value: '',                 label: 'Selecciona el tipo de problema…' },
  { value: 'No puedo iniciar sesión',  label: 'No puedo iniciar sesión' },
  { value: 'Olvidé mi contraseña',     label: 'Olvidé mi contraseña' },
  { value: 'Mi cuenta está bloqueada', label: 'Mi cuenta está bloqueada' },
  { value: 'Otro problema',            label: 'Otro problema' },
]

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function SupportModal({ isOpen, onClose }: Props) {
  const [email,   setEmail]   = useState('')
  const [issue,   setIssue]   = useState('')
  const [message, setMessage] = useState('')
  const [copied,  setCopied]  = useState(false)
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  if (!isOpen) return null

  function handleClose() {
    setEmail('')
    setIssue('')
    setMessage('')
    setSent(false)
    setCopied(false)
    setError('')
    onClose()
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard no disponible — el usuario puede copiar manualmente
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/support`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, issue, message }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Error al enviar la solicitud.')
      }

      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = email.trim() !== '' && issue !== ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4 text-brand-400" aria-hidden />
            </div>
            <div>
              <h2 id="support-modal-title" className="text-base font-bold text-white">
                Centro de soporte
              </h2>
              <p className="text-xs text-slate-400">Te respondemos en menos de 24 horas</p>
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
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-white">Solicitud enviada</p>
                <p className="text-sm text-slate-400">
                  Nuestro equipo revisará tu caso y te contactará a{' '}
                  <span className="text-brand-400 font-medium">{email}</span> a la brevedad.
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
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email directo con botón copiar — fallback siempre disponible */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5">
                <span className="flex-1 text-xs text-slate-400 truncate">
                  {SUPPORT_EMAIL}
                </span>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
                  aria-label="Copiar email de soporte"
                >
                  {copied
                    ? <><Check className="w-3 h-3 text-green-400" /> Copiado</>
                    : <><Copy className="w-3 h-3" /> Copiar</>
                  }
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600">
                <div className="flex-1 h-px bg-white/5" />
                <span>o completa el formulario</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="sup-email" className="block text-xs font-semibold text-slate-300">
                  Tu email <span className="text-red-400">*</span>
                </label>
                <input
                  id="sup-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="tu@empresa.cl"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sup-issue" className="block text-xs font-semibold text-slate-300">
                  Tipo de problema <span className="text-red-400">*</span>
                </label>
                <select
                  id="sup-issue"
                  value={issue}
                  onChange={(e) => { setIssue(e.target.value); setError('') }}
                  required
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-slate-800 text-sm text-slate-300 focus:border-brand-500 focus:outline-none transition-colors cursor-pointer"
                >
                  {ISSUE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value} disabled={o.value === ''}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sup-message" className="block text-xs font-semibold text-slate-300">
                  Descripción (opcional)
                </label>
                <textarea
                  id="sup-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe brevemente el problema…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="w-full min-h-[44px] mt-1 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  'Enviar solicitud de soporte'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

/**
 * AIChatSuggestion — collapsible AI reply suggestion panel.
 *
 * CRO Impact: Reduces time-to-reply for sales agents by pre-generating
 * contextual AI suggestions, increasing response speed and consistency
 * which directly improves lead-to-close conversion rates.
 */

import { useState } from 'react'
import { Loader2, X, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sendChatMessage } from '@/lib/api'

interface AIChatSuggestionProps {
  leadId: string
  onSuggestionAccepted: (text: string) => void
  accessToken: string
}

type PanelState = 'collapsed' | 'input' | 'loading' | 'result' | 'error'

export function AIChatSuggestion({
  leadId,
  onSuggestionAccepted,
  accessToken,
}: AIChatSuggestionProps) {
  const [panelState, setPanelState] = useState<PanelState>('collapsed')
  const [instruction, setInstruction] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  function handleOpen() {
    setPanelState('input')
    setInstruction('')
    setSuggestion('')
    setErrorMsg('')
  }

  function handleClose() {
    setPanelState('collapsed')
  }

  async function handleGenerate() {
    if (!instruction.trim()) return
    setPanelState('loading')
    setErrorMsg('')
    try {
      const res = await sendChatMessage(leadId, instruction.trim(), accessToken)
      setSuggestion(res.response)
      setPanelState('result')
    } catch {
      setErrorMsg('No se pudo generar la sugerencia. Intenta de nuevo.')
      setPanelState('error')
    }
  }

  function handleAccept() {
    onSuggestionAccepted(suggestion)
    setPanelState('collapsed')
    setInstruction('')
    setSuggestion('')
  }

  function handleRetry() {
    setPanelState('input')
    setSuggestion('')
    setErrorMsg('')
  }

  if (panelState === 'collapsed') {
    return (
      <button
        onClick={handleOpen}
        className={cn(
          'flex items-center gap-2 px-4 min-h-[40px] rounded-xl',
          'text-sm font-semibold text-brand-700 bg-brand-50',
          'hover:bg-brand-100 transition-colors',
          'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
        )}
        aria-label="Sugerir respuesta con IA"
      >
        <span aria-hidden>✨</span>
        Sugerir respuesta con IA
      </button>
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-brand-100 bg-brand-50/60 p-4 space-y-3',
        'transition-all duration-200',
      )}
      role="region"
      aria-label="Sugerencia de respuesta con IA"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-brand-800 flex items-center gap-1.5">
          <span aria-hidden>✨</span>
          Sugerencia con IA
        </p>
        <button
          onClick={handleClose}
          aria-label="Cerrar panel de sugerencia"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {/* Input state */}
      {(panelState === 'input' || panelState === 'error') && (
        <>
          <div className="space-y-2">
            <label
              htmlFor="ai-instruction"
              className="text-xs font-medium text-slate-600"
            >
              Indica al asistente qué tipo de respuesta generar
            </label>
            <input
              id="ai-instruction"
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              placeholder="Ej: ofrecer demo gratuita, resolver objeción de precio..."
              className={cn(
                'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5',
                'text-sm text-slate-800 placeholder:text-slate-400',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
              )}
              aria-describedby={errorMsg ? 'ai-error' : undefined}
              autoFocus
            />
          </div>

          {panelState === 'error' && (
            <p
              id="ai-error"
              className="flex items-center gap-1.5 text-xs text-red-600"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={!instruction.trim()}
            className={cn(
              'flex items-center justify-center gap-2 w-full min-h-[40px] rounded-xl',
              'text-sm font-bold text-white bg-brand-600',
              'hover:bg-brand-700 transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            )}
          >
            Generar sugerencia
          </button>
        </>
      )}

      {/* Loading state */}
      {panelState === 'loading' && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-brand-700">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Generando sugerencia...
        </div>
      )}

      {/* Result state */}
      {panelState === 'result' && (
        <>
          <div
            className={cn(
              'rounded-xl bg-white border border-slate-200 p-3',
              'text-sm text-slate-800 leading-relaxed whitespace-pre-wrap',
            )}
            aria-live="polite"
          >
            {suggestion}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              className={cn(
                'flex items-center gap-1.5 flex-1 justify-center min-h-[40px] rounded-xl',
                'text-sm font-bold text-white bg-emerald-600',
                'hover:bg-emerald-700 transition-colors',
                'focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2',
              )}
            >
              <Check className="w-4 h-4" aria-hidden />
              Usar esta respuesta
            </button>
            <button
              onClick={handleRetry}
              className={cn(
                'flex items-center gap-1.5 px-4 min-h-[40px] rounded-xl',
                'text-sm font-medium text-slate-600 border border-slate-200 bg-white',
                'hover:bg-slate-50 transition-colors',
              )}
            >
              Reintentar
            </button>
          </div>
        </>
      )}
    </div>
  )
}

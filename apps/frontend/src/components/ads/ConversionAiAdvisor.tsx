'use client'

/**
 * ConversionAiAdvisor — AI-powered CRO analysis panel.
 *
 * Streams a Claude analysis from POST /api/v1/analytics/conversion-advisor.
 * Shows prioritized recommendations to increase lead-to-customer conversion rate.
 * Supports follow-up questions for interactive refinement.
 */

import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Sparkles, ChevronDown, Send, RefreshCw,
  Loader2, AlertCircle, StopCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role:    'user' | 'assistant'
  content: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

const RANGE_OPTIONS = [
  { value: '7d',  label: '7 días'  },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
]

/**
 * Very lightweight markdown-like renderer: bolds **text**, renders bullet lists,
 * and wraps lines starting with ## as section headers.
 */
function renderMarkdown(text: string) {
  const lines = text.split('\n')

  return lines.map((line, i) => {
    // Section header
    if (line.startsWith('## ')) {
      return (
        <p key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1 first:mt-0">
          {line.replace('## ', '')}
        </p>
      )
    }

    // Bullet list item
    if (line.startsWith('- ') || line.startsWith('• ')) {
      const content = line.replace(/^[-•]\s/, '')
      return (
        <li key={i} className="text-sm text-slate-700 ml-3 list-disc marker:text-brand-400">
          {renderInline(content)}
        </li>
      )
    }

    // Separator
    if (line.startsWith('---')) {
      return <hr key={i} className="border-slate-200 my-3" />
    }

    // Empty line
    if (line.trim() === '') return <div key={i} className="h-1" />

    // Regular paragraph
    return (
      <p key={i} className="text-sm text-slate-700 leading-relaxed">
        {renderInline(line)}
      </p>
    )
  })
}

/** Renders **bold** inline spans */
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ConversionAiAdvisor() {
  const { data: session } = useSession()

  const [range,       setRange]       = useState('30d')
  const [messages,    setMessages]    = useState<Message[]>([])
  const [streaming,   setStreaming]   = useState(false)
  const [question,    setQuestion]    = useState('')
  const [error,       setError]       = useState('')
  const [expanded,    setExpanded]    = useState(true)

  const abortRef   = useRef<AbortController | null>(null)
  const bottomRef  = useRef<HTMLDivElement>(null)

  // ── Stream logic ─────────────────────────────────────────────────────────────

  const runStream = useCallback(async (body: { range: string; question?: string }) => {
    const token = session?.accessToken
    if (!token) return

    setStreaming(true)
    setError('')

    // Append user message if it's a follow-up
    if (body.question) {
      setMessages((prev) => [...prev, { role: 'user', content: body.question! }])
    }

    // Append empty assistant message that we'll fill
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    abortRef.current = new AbortController()

    try {
      const res = await fetch(`${API_BASE}/api/v1/analytics/conversion-advisor`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body:   JSON.stringify(body),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`)
      }
      if (!res.body) {
        throw new Error('Respuesta vacía del servidor.')
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          try {
            const json = JSON.parse(payload) as { text?: string; error?: string }
            if (json.error) { setError(json.error); break }
            if (json.text) {
              setMessages((prev) => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                if (last?.role === 'assistant') {
                  copy[copy.length - 1] = { ...last, content: last.content + json.text! }
                }
                return copy
              })
              // Scroll to bottom on each chunk
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 0)
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        const msg = (err as Error)?.message ?? ''
        setError(msg || 'No se pudo conectar con el asistente de IA.')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [session?.accessToken])

  function handleGenerate() {
    setMessages([])
    runStream({ range })
  }

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim() || streaming) return
    const q = question.trim()
    setQuestion('')
    runStream({ range, question: q })
  }

  function handleStop() {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const hasContent = messages.length > 0

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="kpi-card space-y-0 overflow-hidden">
      {/* Header — always visible */}
      <div className="flex items-center justify-between gap-3 p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Asesor de Conversiones IA</h2>
            <p className="text-xs text-slate-500">Recomendaciones priorizadas por impacto real en tus campañas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            disabled={streaming}
            className="h-8 px-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
          >
            {RANGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Collapse toggle */}
          {hasContent && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform', !expanded && '-rotate-90')} />
            </button>
          )}
        </div>
      </div>

      {/* Generate button — shown when no content yet */}
      {!hasContent && (
        <div className="px-5 pb-5">
          <button
            onClick={handleGenerate}
            disabled={streaming || !session?.accessToken}
            className={cn(
              'w-full flex items-center justify-center gap-2 h-10 rounded-xl',
              'bg-gradient-to-r from-brand-500 to-violet-600 text-white text-sm font-semibold',
              'hover:opacity-90 transition-all shadow-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {streaming ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analizando campañas…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Analizar y optimizar conversiones</>
            )}
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mx-5 mb-4 flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Message thread */}
      {hasContent && expanded && (
        <div className="border-t border-slate-100">
          <div className="max-h-[520px] overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn(msg.role === 'user' ? 'flex justify-end' : '')}>
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] bg-brand-50 border border-brand-100 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-brand-900 font-medium">
                    {msg.content}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <ul className="space-y-0.5">
                      {renderMarkdown(msg.content)}
                    </ul>
                    {/* Streaming cursor */}
                    {streaming && i === messages.length - 1 && (
                      <span className="inline-block w-1.5 h-4 bg-brand-400 rounded-sm animate-pulse ml-0.5" />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Bottom action bar */}
          <div className="border-t border-slate-100 px-5 py-3 flex items-center gap-2">
            {streaming ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <StopCircle className="w-3.5 h-3.5" />
                Detener
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Nuevo análisis
              </button>
            )}

            {/* Follow-up input */}
            <form onSubmit={handleFollowUp} className="flex-1 flex items-center gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Pregunta algo específico sobre tus campañas…"
                disabled={streaming}
                className="flex-1 h-8 px-3 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!question.trim() || streaming}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

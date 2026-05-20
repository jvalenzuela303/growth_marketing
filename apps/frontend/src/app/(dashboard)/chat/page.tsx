'use client'

/**
 * Chat IA — AI chat with SSE streaming (typewriter effect).
 *
 * Uses GET /api/v1/chat/stream with fetch() streaming instead of EventSource
 * so we can attach the Authorization header.
 *
 * CRO Impact: Streaming responses feel instant and conversational — reduces
 * the perceived latency of AI replies by showing output token-by-token rather
 * than waiting for the full response before rendering.
 */

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, AlertCircle, MessageCircle, Send, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getLeads } from '@/lib/api'
import type { LeadRow } from '@/lib/api'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

// ---------------------------------------------------------------------------
// Types & Model registry
// ---------------------------------------------------------------------------

interface ChatMessage {
  role:      'user' | 'assistant'
  content:   string
  streaming?: boolean  // true while tokens are being received
}

interface AiModel {
  id:       string
  label:    string
  provider: string
}

const AI_MODELS: AiModel[] = [
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', provider: 'anthropic' },
  { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6',   provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',  provider: 'anthropic' },
  { id: 'gpt-4o',                    label: 'GPT-4o',            provider: 'openai'    },
  { id: 'gpt-4o-mini',               label: 'GPT-4o Mini',       provider: 'openai'    },
  { id: 'gemini-1.5-pro',            label: 'Gemini 1.5 Pro',    provider: 'google'    },
]

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: 'bg-orange-100 text-orange-700',
  openai:    'bg-emerald-100 text-emerald-700',
  google:    'bg-blue-100 text-blue-700',
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mr-2 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden />
        </div>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-brand-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm',
        )}
      >
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const { data: session }  = useSession()
  const [leads, setLeads]  = useState<LeadRow[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [selectedModel, setSelectedModel]   = useState('claude-sonnet-4-6')
  const [messages, setMessages]   = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingLeads, setIsLoadingLeads] = useState(true)
  const [error, setError]         = useState('')
  const bottomRef  = useRef<HTMLDivElement>(null)
  const abortRef   = useRef<AbortController | null>(null)

  // Fetch first page of leads for the dropdown
  useEffect(() => {
    if (!session?.accessToken || !session?.user?.tenantId) return
    setIsLoadingLeads(true)
    getLeads(session.user.tenantId, { page: 1, pageSize: 50 }, session.accessToken)
      .then((res) => {
        setLeads(res.data)
        if (res.data.length > 0) setSelectedLeadId(res.data[0].id)
      })
      .catch(() => setError('No se pudieron cargar los leads.'))
      .finally(() => setIsLoadingLeads(false))
  }, [session?.accessToken, session?.user?.tenantId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send with SSE streaming ───────────────────────────────────────────────

  async function handleSend() {
    if (!input.trim() || !selectedLeadId || !session?.accessToken || isSending) return

    const userText = input.trim()
    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setIsSending(true)

    // Add placeholder for streaming assistant message
    const assistantIdx = (prev: ChatMessage[]) => prev.length
    setMessages((prev) => [...prev, { role: 'assistant', content: '', streaming: true }])

    // Abort previous request if any
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const qs  = new URLSearchParams({ leadId: selectedLeadId, message: userText, model: selectedModel })
      const res = await fetch(`${API_BASE}/api/v1/chat/stream?${qs}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
        signal:  controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''  // last line may be partial

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') break

          try {
            const parsed = JSON.parse(payload) as { token?: string; error?: string }
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.token) {
              setMessages((prev) => {
                const updated = [...prev]
                const last    = updated[updated.length - 1]
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + parsed.token,
                  }
                }
                return updated
              })
            }
          } catch {
            // ignore parse errors on individual chunks
          }
        }
      }

      // Mark streaming done
      setMessages((prev) => {
        const updated = [...prev]
        const last    = updated[updated.length - 1]
        if (last?.role === 'assistant') {
          updated[updated.length - 1] = { ...last, streaming: false }
        }
        return updated
      })
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      setError('Error al enviar el mensaje. Intenta de nuevo.')
      // Remove the streaming placeholder
      setMessages((prev) => prev.filter((_, i) => i < prev.length - 1))
      // Also remove the optimistic user message
      setMessages((prev) => prev.filter((_, i) => i < prev.length - 1))
    } finally {
      setIsSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const leadLabel = (lead: LeadRow) => {
    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
    return name || lead.email || lead.id.slice(0, 8)
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-brand-600" aria-hidden />
            Chat con IA
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Streaming en tiempo real · {AI_MODELS.find((m) => m.id === selectedModel)?.label ?? selectedModel}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          SSE activo
        </span>
      </div>

      {/* Model selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex-shrink-0">Modelo:</span>
        <div className="relative flex-1 max-w-xs">
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value)
              setMessages([])
            }}
            className="w-full h-9 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-400 appearance-none cursor-pointer"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        </div>
        {(() => {
          const m = AI_MODELS.find((x) => x.id === selectedModel)
          return m ? (
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', PROVIDER_COLORS[m.provider] ?? 'bg-slate-100 text-slate-500')}>
              {m.provider}
            </span>
          ) : null
        })()}
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
        role="note"
      >
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden />
        <p className="text-xs text-amber-800 leading-relaxed">
          Esta herramienta usa IA para responder en nombre de tu equipo.{' '}
          <strong>Revisa siempre antes de enviar.</strong>
        </p>
      </div>

      {/* Lead selector */}
      <div className="space-y-1.5">
        <label htmlFor="lead-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Lead de contexto
        </label>
        {isLoadingLeads ? (
          <div className="skeleton h-11 w-full rounded-xl" />
        ) : (
          <select
            id="lead-select"
            value={selectedLeadId}
            onChange={(e) => {
              setSelectedLeadId(e.target.value)
              setMessages([])
            }}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {leads.length === 0 && <option value="">Sin leads disponibles</option>}
            {leads.map((l) => (
              <option key={l.id} value={l.id}>{leadLabel(l)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        {messages.length === 0 && !isSending && (
          <p className="text-center text-sm text-slate-400 py-12">
            Escribe un mensaje para iniciar la conversación.
          </p>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {/* Typing indicator while waiting for first token */}
        {isSending && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" aria-hidden />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje… (Enter para enviar, Shift+Enter para salto de línea)"
          disabled={isSending || !selectedLeadId}
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={isSending || !input.trim() || !selectedLeadId}
          aria-label="Enviar mensaje"
          className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          {isSending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

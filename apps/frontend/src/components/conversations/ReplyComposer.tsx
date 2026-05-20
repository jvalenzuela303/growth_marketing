'use client'

/**
 * ReplyComposer — auto-resize textarea with channel selector and send button.
 *
 * CRO Impact: Frictionless reply interface (no modals, no page changes) keeps
 * operators in flow state, directly increasing response speed — which is the
 * #1 predictor of lead-to-sale conversion.
 */

import { useRef, useState, useEffect } from 'react'
import { Send, MessageCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/api'

type Channel = Message['channel']

interface ReplyComposerProps {
  leadId:            string
  availableChannels: Channel[]
  isSending:         boolean
  onSend:            (content: string, channel: Channel) => void
}

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  whatsapp: { label: 'WhatsApp', icon: Phone },
  email:    { label: 'Email',    icon: MessageCircle },
  chat:     { label: 'Chat',     icon: MessageCircle },
}

export function ReplyComposer({ leadId: _leadId, availableChannels, isSending, onSend }: ReplyComposerProps) {
  const [content, setContent]   = useState('')
  const [channel, setChannel]   = useState<Channel>(availableChannels[0] ?? 'chat')
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [content])

  function handleSend() {
    const trimmed = content.trim()
    if (!trimmed || isSending) return
    onSend(trimmed, channel)
    setContent('')
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const ChannelIcon = CHANNEL_CONFIG[channel]?.icon ?? MessageCircle

  return (
    <div className="border-t border-slate-100 p-3 bg-white">
      {/* Channel selector — only shown when lead has multiple channels */}
      {availableChannels.length > 1 && (
        <div className="flex gap-1.5 mb-2">
          {availableChannels.map((ch) => {
            const cfg = CHANNEL_CONFIG[ch]
            const Icon = cfg.icon
            return (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                aria-pressed={channel === ch}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  channel === ch
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                <Icon className="w-3 h-3" aria-hidden />
                {cfg.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2">
        {/* Channel indicator (single channel) */}
        {availableChannels.length <= 1 && (
          <div className="flex-shrink-0 p-2 rounded-xl bg-slate-100 text-slate-500 mb-0.5">
            <ChannelIcon className="w-4 h-4" aria-hidden />
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={`Responder por ${CHANNEL_CONFIG[channel]?.label ?? 'chat'}… (Enter para enviar)`}
          disabled={isSending}
          aria-label="Escribir respuesta"
          className={cn(
            'flex-1 min-h-[44px] px-3 py-2.5 rounded-xl border border-slate-200',
            'text-sm text-slate-800 placeholder:text-slate-400',
            'resize-none overflow-hidden',
            'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
            'transition-all duration-150',
            isSending && 'opacity-60',
          )}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          aria-label="Enviar respuesta"
          className={cn(
            'flex-shrink-0 flex items-center justify-center',
            'w-11 h-11 rounded-xl',
            'bg-gradient-brand text-white shadow-card',
            'transition-all duration-150 active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {isSending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-1.5 px-1">
        Shift+Enter para nueva línea
      </p>
    </div>
  )
}

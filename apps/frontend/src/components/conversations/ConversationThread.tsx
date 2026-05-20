'use client'

/**
 * ConversationThread — right panel showing the message history and composer.
 */

import { useEffect, useRef } from 'react'
import { MessageCircle, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageBubble } from './MessageBubble'
import { ReplyComposer } from './ReplyComposer'
import type { Message, ConversationSummary } from '@/lib/api'

// ---------------------------------------------------------------------------
// Thread skeleton
// ---------------------------------------------------------------------------

function ThreadSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {[{ align: 'items-start', w: 'w-56' }, { align: 'items-end', w: 'w-48' }, { align: 'items-start', w: 'w-64' }].map(({ align, w }, i) => (
        <div key={i} className={cn('flex flex-col gap-1', align)}>
          <div className={cn('skeleton h-12 rounded-2xl', w)} />
          <div className="skeleton h-3 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-3">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
        <MessageCircle className="w-8 h-8 text-slate-400" aria-hidden />
      </div>
      <p className="text-base font-semibold text-slate-700">Selecciona una conversación</p>
      <p className="text-sm text-slate-400 max-w-xs">
        Elige un lead del panel izquierdo para ver y responder su conversación
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Channel badge
// ---------------------------------------------------------------------------

function ChannelBadge({ channel }: { channel: string }) {
  const isWA = channel === 'whatsapp'
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
      isWA ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700',
    )}>
      {isWA
        ? <Phone className="w-3 h-3" aria-hidden />
        : <MessageCircle className="w-3 h-3" aria-hidden />
      }
      {isWA ? 'WhatsApp' : 'Chat'}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Thread
// ---------------------------------------------------------------------------

interface ConversationThreadProps {
  conversation:  ConversationSummary | null
  messages:      Message[]
  isLoading:     boolean
  isSending:     boolean
  onSendReply:   (content: string, channel: string) => void
}

export function ConversationThread({
  conversation,
  messages,
  isLoading,
  isSending,
  onSendReply,
}: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!conversation) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <EmptyState />
      </div>
    )
  }

  const leadName = [conversation.firstName, conversation.lastName].filter(Boolean).join(' ') || 'Lead anónimo'
  const channels = conversation.channels ?? ['chat']

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Thread header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold"
            aria-hidden
          >
            {leadName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{leadName}</p>
            <p className="text-xs text-slate-500">{conversation.email ?? ''}</p>
          </div>
        </div>
        <ChannelBadge channel={conversation.lastChannel ?? 'chat'} />
      </div>

      {/* Messages */}
      {isLoading ? (
        <ThreadSkeleton />
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400">Sin mensajes aún. Sé el primero en escribir.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Composer */}
      <ReplyComposer
        leadId={conversation.leadId}
        availableChannels={channels as ('whatsapp' | 'email' | 'chat')[]}
        isSending={isSending}
        onSend={onSendReply}
      />
    </div>
  )
}

'use client'

/**
 * MessageBubble — renders a single message in the conversation thread.
 *
 * Roles:
 *  - user (lead):        left-aligned, slate bg
 *  - assistant (AI):     right-aligned, brand-50 bg, "IA" badge
 *  - human_agent:        right-aligned, emerald-50 bg, agent name badge
 */

import { cn, formatRelativeDate } from '@/lib/utils'
import type { Message } from '@/lib/api'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isLead      = message.role === 'user'
  const isAI        = message.role === 'assistant'
  const isAgent     = message.role === 'human_agent'

  const bubbleClasses = cn(
    'max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
    isLead  && 'bg-slate-100 text-slate-800 rounded-bl-sm',
    isAI    && 'bg-brand-50 text-brand-900 rounded-br-sm',
    isAgent && 'bg-emerald-50 text-emerald-900 rounded-br-sm',
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-1 w-full',
        isLead ? 'items-start' : 'items-end',
      )}
    >
      {/* Sender label badge */}
      {!isLead && (
        <div className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
          isAI    && 'bg-brand-100 text-brand-700',
          isAgent && 'bg-emerald-100 text-emerald-700',
        )}>
          {isAI    && <><span className="font-bold">IA</span></>}
          {isAgent && <>{message.agentName ?? 'Agente'}</>}
        </div>
      )}

      {/* Bubble */}
      <div className={bubbleClasses}>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {/* Timestamp */}
      <time
        dateTime={message.createdAt}
        className="text-xs text-slate-400 px-1"
      >
        {formatRelativeDate(message.createdAt)}
      </time>
    </div>
  )
}

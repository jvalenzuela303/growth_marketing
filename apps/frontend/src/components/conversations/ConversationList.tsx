'use client'

/**
 * ConversationList — left panel of the inbox showing conversation rows.
 *
 * CRO Impact: Avatar initials, channel icons and relative timestamps give
 * operators instant context to triage by recency and channel — reducing
 * response time, the primary driver of lead conversion.
 */

import { useState } from 'react'
import { MessageCircle, Phone, Instagram, Mail } from 'lucide-react'
import { cn, formatRelativeDate, truncate } from '@/lib/utils'
import type { ConversationSummary } from '@/lib/api'

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="skeleton w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-28 rounded-full" />
        <div className="skeleton h-3 w-40 rounded-full" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Channel icon
// ---------------------------------------------------------------------------

type Channel = 'whatsapp' | 'email' | 'instagram' | 'chat' | 'sms' | 'messenger'

const CHANNEL_FILTERS: { key: Channel | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todos'     },
  { key: 'whatsapp',  label: 'WhatsApp'  },
  { key: 'messenger', label: 'Messenger' },
  { key: 'sms',       label: 'SMS'       },
  { key: 'instagram', label: 'Instagram' },
  { key: 'email',     label: 'Email'     },
  { key: 'chat',      label: 'Chat'      },
]

function ChannelIcon({ channel }: { channel: Channel }) {
  if (channel === 'whatsapp')  return <Phone className="w-3.5 h-3.5 text-emerald-500" aria-label="WhatsApp" />
  if (channel === 'sms')       return <Phone className="w-3.5 h-3.5 text-slate-500"   aria-label="SMS" />
  if (channel === 'instagram') return <Instagram className="w-3.5 h-3.5 text-pink-500" aria-label="Instagram" />
  if (channel === 'email')     return <Mail className="w-3.5 h-3.5 text-amber-500" aria-label="Email" />
  if (channel === 'messenger') return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#0099FF" aria-label="Messenger">
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.438 5.507 3.686 7.21V22l3.372-1.853C10.024 20.38 11 20.486 12 20.486c5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm1.007 12.418L10.59 12.01l-4.738 2.407 5.208-5.527 2.416 2.408 4.74-2.408-5.209 5.528z"/>
    </svg>
  )
  return <MessageCircle className="w-3.5 h-3.5 text-blue-500" aria-label="Chat" />
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface ConversationRowProps {
  conversation: ConversationSummary
  isActive:     boolean
  onClick:      () => void
}

function ConversationRow({ conversation, isActive, onClick }: ConversationRowProps) {
  const initials = [conversation.firstName?.[0], conversation.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?'

  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-150',
        'border-l-2',
        isActive
          ? 'bg-brand-50 border-l-brand-500'
          : 'bg-white border-l-transparent hover:bg-slate-50',
      )}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-brand flex items-center justify-center text-white text-sm font-bold shadow-card"
        aria-hidden
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(
            'text-sm font-semibold truncate',
            isActive ? 'text-brand-700' : 'text-slate-800',
          )}>
            {[conversation.firstName, conversation.lastName].filter(Boolean).join(' ') || 'Lead anónimo'}
          </p>
          <time
            dateTime={conversation.lastMessageAt}
            className="text-xs text-slate-400 flex-shrink-0"
          >
            {formatRelativeDate(conversation.lastMessageAt)}
          </time>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          <ChannelIcon channel={(conversation.lastChannel ?? 'chat') as Channel} />
          <p className="text-xs text-slate-500 truncate">
            {truncate(conversation.lastMessage ?? '…', 48)}
          </p>
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

interface ConversationListProps {
  conversations: ConversationSummary[]
  activeLeadId:  string | null
  isLoading:     boolean
  onSelect:      (leadId: string) => void
}

export function ConversationList({
  conversations,
  activeLeadId,
  isLoading,
  onSelect,
}: ConversationListProps) {
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all')

  const filtered = channelFilter === 'all'
    ? conversations
    : conversations.filter((c) => c.lastChannel === channelFilter)

  // Solo mostrar tabs de canales que tienen conversaciones
  const availableChannels = new Set(conversations.map((c) => c.lastChannel))
  const visibleFilters = CHANNEL_FILTERS.filter(
    (f) => f.key === 'all' || availableChannels.has(f.key),
  )

  return (
    <div className="flex flex-col h-full border-r border-slate-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700">Conversaciones</h2>
          {!isLoading && (
            <p className="text-xs text-slate-400">{filtered.length} activas</p>
          )}
        </div>

        {/* Channel filter chips */}
        {!isLoading && visibleFilters.length > 2 && (
          <div className="flex gap-1 flex-wrap">
            {visibleFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setChannelFilter(key)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors',
                  channelFilter === key
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <ConversationSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-2">
            <span className="text-3xl" aria-hidden>💬</span>
            <p className="text-sm font-medium text-slate-600">Sin conversaciones</p>
            <p className="text-xs text-slate-400">
              {channelFilter === 'all'
                ? 'Las conversaciones aparecen cuando un lead responde'
                : `No hay conversaciones de ${channelFilter}`}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationRow
              key={conv.leadId}
              conversation={conv}
              isActive={activeLeadId === conv.leadId}
              onClick={() => onSelect(conv.leadId)}
            />
          ))
        )}
      </div>
    </div>
  )
}

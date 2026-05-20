'use client'

/**
 * Conversations page — split-panel inbox.
 * Left 1/3: ConversationList  |  Right 2/3: ConversationThread
 * Mobile: stacked; tap row to reveal thread.
 *
 * CRO Impact: Centralised inbox reduces operator context-switching, enabling
 * faster lead responses — directly improving conversion from lead to appointment.
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConversationsStore } from '@/stores/conversations-store'
import { ConversationList } from '@/components/conversations/ConversationList'
import { ConversationThread } from '@/components/conversations/ConversationThread'

export default function ConversationsPage() {
  const { data: session } = useSession()
  const [showThread, setShowThread] = useState(false)  // Mobile: toggle between list/thread

  const {
    conversations,
    activeLeadId,
    messages,
    isLoadingList,
    isLoadingThread,
    isSendingReply,
    loadConversations,
    loadThread,
    sendReply,
  } = useConversationsStore()

  // Load conversation list on mount
  useEffect(() => {
    if (session?.accessToken) {
      loadConversations(session.accessToken)
    }
  }, [session?.accessToken, loadConversations])

  function handleSelectConversation(leadId: string) {
    if (!session?.accessToken) return
    loadThread(leadId, session.accessToken)
    setShowThread(true)
  }

  function handleSendReply(content: string, channel: string) {
    if (!activeLeadId || !session?.accessToken) return
    sendReply(activeLeadId, content, channel, session.accessToken)
  }

  const activeConversation = conversations.find((c) => c.leadId === activeLeadId) ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        {/* Mobile back button */}
        {showThread && (
          <button
            onClick={() => setShowThread(false)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors md:hidden"
            aria-label="Volver a conversaciones"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Volver
          </button>
        )}
        {!showThread && (
          <h1 className="text-xl font-extrabold text-slate-900">Conversaciones</h1>
        )}
        {showThread && activeConversation && (
          <h1 className="text-base font-bold text-slate-800 md:hidden">
            {[activeConversation.firstName, activeConversation.lastName].filter(Boolean).join(' ') || 'Lead'}
          </h1>
        )}
        {/* Desktop title */}
        <h1 className="text-xl font-extrabold text-slate-900 hidden md:block">Conversaciones</h1>
        <div /> {/* spacer */}
      </div>

      {/* Split layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — conversation list */}
        <div
          className={cn(
            'flex flex-col overflow-hidden',
            // Mobile: full width or hidden based on state
            'w-full md:w-1/3',
            showThread && 'hidden md:flex',
          )}
        >
          <ConversationList
            conversations={conversations}
            activeLeadId={activeLeadId}
            isLoading={isLoadingList}
            onSelect={handleSelectConversation}
          />
        </div>

        {/* RIGHT — thread */}
        <div
          className={cn(
            'flex flex-col overflow-hidden flex-1',
            !showThread && 'hidden md:flex',
          )}
        >
          <ConversationThread
            conversation={activeConversation}
            messages={messages}
            isLoading={isLoadingThread}
            isSending={isSendingReply}
            onSendReply={handleSendReply}
          />
        </div>
      </div>
    </div>
  )
}

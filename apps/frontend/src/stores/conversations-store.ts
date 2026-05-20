/**
 * Conversations Store — manages the inbox state for the operator conversation view.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { apiFetch } from '@/lib/api'
import type { ConversationSummary, Message } from '@/lib/api'

interface ConversationsState {
  conversations:    ConversationSummary[]
  activeLeadId:     string | null
  messages:         Message[]
  isLoadingList:    boolean
  isLoadingThread:  boolean
  isSendingReply:   boolean

  // Actions
  loadConversations: (token: string) => Promise<void>
  loadThread:        (leadId: string, token: string) => Promise<void>
  sendReply:         (leadId: string, content: string, channel: string, token: string) => Promise<void>
  setActiveLeadId:   (leadId: string | null) => void
}

export const useConversationsStore = create<ConversationsState>()(
  devtools(
    (set, get) => ({
      conversations:   [],
      activeLeadId:    null,
      messages:        [],
      isLoadingList:   false,
      isLoadingThread: false,
      isSendingReply:  false,

      loadConversations: async (token) => {
        set({ isLoadingList: true }, false, 'conversations/loadStart')
        try {
          const data = await apiFetch<ConversationSummary[]>(
            '/api/v1/conversations',
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
          )
          set({ conversations: data, isLoadingList: false }, false, 'conversations/loaded')
        } catch {
          set({ isLoadingList: false }, false, 'conversations/loadError')
        }
      },

      loadThread: async (leadId, token) => {
        set({ isLoadingThread: true, activeLeadId: leadId, messages: [] }, false, 'conversations/threadStart')
        try {
          const data = await apiFetch<Message[]>(
            `/api/v1/conversations/${leadId}/messages`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
          )
          set({ messages: data, isLoadingThread: false }, false, 'conversations/threadLoaded')
        } catch {
          set({ isLoadingThread: false }, false, 'conversations/threadError')
        }
      },

      sendReply: async (leadId, content, channel, token) => {
        // Optimistic update
        const optimistic: Message = {
          id:        `optimistic-${Date.now()}`,
          leadId,
          role:      'human_agent',
          channel:   channel as Message['channel'],
          content,
          agentName: 'Tú',
          createdAt: new Date().toISOString(),
        }
        set(
          (state) => ({ messages: [...state.messages, optimistic], isSendingReply: true }),
          false,
          'conversations/sendStart',
        )

        try {
          await apiFetch<void>(
            `/api/v1/conversations/${leadId}/messages`,
            {
              method:  'POST',
              headers: { Authorization: `Bearer ${token}` },
              body:    JSON.stringify({ channel, content }),
            },
          )
          set({ isSendingReply: false }, false, 'conversations/sendSuccess')

          // Refresh conversation list to update last message preview
          get().loadConversations(token)
        } catch {
          // Rollback optimistic message on error
          set(
            (state) => ({
              messages:      state.messages.filter((m) => m.id !== optimistic.id),
              isSendingReply: false,
            }),
            false,
            'conversations/sendError',
          )
        }
      },

      setActiveLeadId: (leadId) =>
        set({ activeLeadId: leadId }, false, 'conversations/setActive'),
    }),
    { name: 'ConversationsStore' },
  ),
)

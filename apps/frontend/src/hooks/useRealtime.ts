'use client'

/**
 * useRealtime — Socket.IO client hook for tenant-scoped real-time events.
 *
 * Connects to /realtime namespace with JWT auth. Joins the tenant room
 * automatically. Exposes typed event subscription helpers.
 *
 * Usage:
 *   const { connected, on } = useRealtime()
 *   useEffect(() => on('lead:hot_alert', (data) => toast(...)), [on])
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'
import { io, Socket } from 'socket.io-client'

const WS_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

// ── Event payload types ────────────────────────────────────────────────────

export interface LeadScoredPayload {
  leadId:   string
  score:    number
  segment:  string
  tenantId: string
}

export interface HotAlertPayload {
  leadId:   string
  name:     string
  score:    number
  tenantId: string
}

export interface StageChangedPayload {
  leadId:   string
  stage:    string
  tenantId: string
}

export interface NewMessagePayload {
  conversationId: string
  message:        string
  from:           string
  tenantId:       string
}

export type RealtimeEvents = {
  'lead:scored':               LeadScoredPayload
  'lead:hot_alert':            HotAlertPayload
  'lead:stage_changed':        StageChangedPayload
  'conversation:new_message':  NewMessagePayload
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useRealtime() {
  const { data: session } = useSession()
  const socketRef         = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  // Establish connection when session becomes available
  useEffect(() => {
    const token = session?.accessToken
    if (!token) return

    const socket = io(`${WS_URL}/realtime`, {
      auth:       { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    })

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [session?.accessToken])

  /**
   * Subscribe to a typed server event. Returns an unsubscribe function.
   * Use inside useEffect with the returned fn as cleanup.
   */
  const on = useCallback(
    <K extends keyof RealtimeEvents>(
      event: K,
      handler: (payload: RealtimeEvents[K]) => void,
    ): (() => void) => {
      const socket = socketRef.current
      if (!socket) return () => {}
      socket.on(event as string, handler as (...args: any[]) => void)
      return () => socket.off(event as string, handler as (...args: any[]) => void)
    },
    [],
  )

  return { connected, on, socket: socketRef.current }
}

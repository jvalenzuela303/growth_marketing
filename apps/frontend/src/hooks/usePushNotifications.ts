'use client'

import { useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  const output   = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i)
  return output.buffer as ArrayBuffer
}

/**
 * Registers a Web Push subscription with the backend.
 * Called once after login. Silently skips if VAPID key is not configured.
 */
export function usePushNotifications() {
  const { data: session } = useSession()

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY || !session?.accessToken) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const reg          = await navigator.serviceWorker.ready
      const existing     = await reg.pushManager.getSubscription()
      const subscription = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications/push-subscribe`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(subscription.toJSON()),
      })
    } catch {
      // Push suscription failed silently — no VAPID key or user denied
    }
  }, [session?.accessToken])

  useEffect(() => {
    if (session?.accessToken) {
      subscribe()
    }
  }, [session?.accessToken, subscribe])
}

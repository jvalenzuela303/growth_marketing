'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Shows a native-feeling install banner when the browser fires
 * the beforeinstallprompt event (Chrome/Edge/Android).
 * iOS users see a manual "Agregar a pantalla de inicio" instruction.
 */
export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos,    setIsIos]    = useState(false)
  const [visible,  setVisible]  = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Don't show if already running as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Check if dismissed before
    if (localStorage.getItem('pwa-banner-dismissed')) return

    const isIosBrowser = /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window.navigator as any).standalone

    if (isIosBrowser) {
      setIsIos(true)
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-banner-dismissed', '1')
    setVisible(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setVisible(false)
  }

  if (!visible || installed) return null

  return (
    <div className={cn(
      'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50',
      'bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4',
      'flex items-start gap-3',
    )}>
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
        <Download className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">Instalar Growth Engine</p>
        {isIos ? (
          <p className="text-xs text-slate-400 mt-0.5">
            Toca <span className="text-white font-medium">Compartir</span> →{' '}
            <span className="text-white font-medium">Agregar a pantalla de inicio</span>
          </p>
        ) : (
          <p className="text-xs text-slate-400 mt-0.5">
            Acceso rápido desde tu pantalla de inicio
          </p>
        )}

        {!isIos && (
          <button
            onClick={install}
            className="mt-2 text-xs font-semibold text-brand-400 hover:text-brand-300"
          >
            Instalar ahora
          </button>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

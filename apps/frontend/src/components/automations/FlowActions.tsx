'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Play, Pause, Trash2, Loader2 } from 'lucide-react'
import { activateAutomationFlow, pauseAutomationFlow, deleteAutomationFlow, runAutomationFlow } from '@/lib/api'
import type { AutomationFlow } from '@/lib/api'

export function FlowActions({ flow }: { flow: AutomationFlow }) {
  const router           = useRouter()
  const { data: session } = useSession()
  const [busy, setBusy]  = useState<string | null>(null)

  async function handle(action: 'toggle' | 'run' | 'delete') {
    if (!session?.accessToken || busy) return
    setBusy(action)
    try {
      if (action === 'toggle') {
        if (flow.status === 'active') {
          await pauseAutomationFlow(flow.id, session.accessToken)
        } else {
          await activateAutomationFlow(flow.id, session.accessToken)
        }
      } else if (action === 'run') {
        await runAutomationFlow(flow.id, session.accessToken)
      } else if (action === 'delete') {
        if (!confirm(`¿Eliminar el flujo "${flow.name}"?`)) { setBusy(null); return }
        await deleteAutomationFlow(flow.id, session.accessToken)
      }
      router.refresh()
    } catch {
      // ignore
    } finally {
      setBusy(null)
    }
  }

  const isActive = flow.status === 'active'

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handle('run')}
        disabled={!!busy}
        title="Ejecutar ahora"
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors disabled:opacity-40"
      >
        {busy === 'run' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
      </button>
      <button
        onClick={() => handle('toggle')}
        disabled={!!busy}
        title={isActive ? 'Pausar' : 'Activar'}
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors disabled:opacity-40"
      >
        {busy === 'toggle' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
      </button>
      <button
        onClick={() => handle('delete')}
        disabled={!!busy}
        title="Eliminar"
        className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40"
      >
        {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  )
}

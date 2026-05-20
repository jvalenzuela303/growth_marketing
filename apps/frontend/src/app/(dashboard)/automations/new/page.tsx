'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Zap, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createAutomationFlow } from '@/lib/api'

const TRIGGER_OPTIONS = [
  { value: 'manual',        label: 'Manual — ejecutar bajo demanda' },
  { value: 'lead.captured', label: 'Lead capturado — nuevo lead en el sistema' },
  { value: 'score.updated', label: 'Score actualizado — cambia la calificación' },
  { value: 'schedule',      label: 'Programado — según horario' },
]

export default function NewFlowPage() {
  const router           = useRouter()
  const { data: session } = useSession()
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [trigger, setTrigger]     = useState('manual')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.accessToken) return
    setLoading(true)
    setError('')
    try {
      const flow = await createAutomationFlow(session.accessToken, {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger,
      })
      router.push(`/automations/${flow.id}`)
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear el flujo.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Link
          href="/automations"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Nuevo flujo</h1>
          <p className="text-sm text-slate-500">Configura el disparador y luego diseña el flujo.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="kpi-card space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700" htmlFor="flow-name">
            Nombre del flujo *
          </label>
          <input
            id="flow-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Seguimiento leads fríos"
            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700" htmlFor="flow-desc">
            Descripción
          </label>
          <textarea
            id="flow-desc"
            rows={2}
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Qué hace este flujo…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700" htmlFor="flow-trigger">
            Disparador *
          </label>
          <select
            id="flow-trigger"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {TRIGGER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="btn-cta w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Crear y diseñar flujo
            </>
          )}
        </button>
      </form>
    </div>
  )
}

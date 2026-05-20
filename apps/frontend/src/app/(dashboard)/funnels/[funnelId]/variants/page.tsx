'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Loader2, AlertCircle, FlaskConical,
  ToggleRight, ToggleLeft, Trash2, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getFunnelVariants,
  updateFunnelVariant,
  deleteFunnelVariant,
  getFunnelById,
} from '@/lib/api'
import type { FunnelVariant, Funnel } from '@/lib/api'
import { NewVariantModal } from '@/components/ab-testing/NewVariantModal'

// ---------------------------------------------------------------------------
// Variant card
// ---------------------------------------------------------------------------

function VariantCard({
  variant,
  onToggle,
  onDelete,
  onUpdateSplit,
}: {
  variant:       FunnelVariant
  onToggle:      (id: string, isActive: boolean) => Promise<void>
  onDelete:      (id: string) => Promise<void>
  onUpdateSplit: (id: string, split: number) => Promise<void>
}) {
  const [toggling,  setToggling]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [editSplit, setEditSplit] = useState(false)
  const [split,     setSplit]     = useState(variant.trafficSplit)

  const convRate = variant.totalViews > 0
    ? ((variant.totalCompletions / variant.totalViews) * 100).toFixed(1)
    : '—'

  async function handleToggle() {
    setToggling(true)
    await onToggle(variant.id, !variant.isActive)
    setToggling(false)
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la variante "${variant.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    await onDelete(variant.id)
  }

  async function handleSaveSplit() {
    await onUpdateSplit(variant.id, split)
    setEditSplit(false)
  }

  return (
    <article className={cn(
      'kpi-card space-y-4',
      !variant.isActive && 'opacity-60',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-slate-900 truncate">{variant.name}</h3>
            {variant.isControl && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                <Shield className="w-3 h-3" aria-hidden />
                Control
              </span>
            )}
            {!variant.isActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                Inactiva
              </span>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={variant.isActive ? 'Desactivar variante' : 'Activar variante'}
          className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors disabled:opacity-40"
        >
          {toggling
            ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            : variant.isActive
              ? <ToggleRight className="w-5 h-5 text-brand-500" aria-hidden />
              : <ToggleLeft className="w-5 h-5" aria-hidden />}
        </button>
      </div>

      {/* Traffic split bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Tráfico asignado</span>
          {editSplit ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={100}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
                className="w-14 text-center text-sm border border-brand-400 rounded-lg px-1 py-0.5 focus:outline-none"
                aria-label="Porcentaje de tráfico"
              />
              <span className="text-slate-400 text-xs">%</span>
              <button
                onClick={handleSaveSplit}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Guardar
              </button>
              <button
                onClick={() => { setEditSplit(false); setSplit(variant.trafficSplit) }}
                className="text-xs text-slate-400 hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditSplit(true)}
              className="font-bold text-slate-900 hover:text-brand-600 transition-colors"
              aria-label="Editar porcentaje de tráfico"
            >
              {variant.trafficSplit}%
            </button>
          )}
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-brand rounded-full transition-all duration-300"
            style={{ width: `${variant.trafficSplit}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Vistas',     value: variant.totalViews.toLocaleString('es-CL') },
          { label: 'Completos',  value: variant.totalCompletions.toLocaleString('es-CL') },
          { label: 'Conversión', value: `${convRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-2">
            <p className="text-base font-extrabold text-slate-900 tabular-nums">{value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Delete */}
      {!variant.isControl && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
          aria-label={`Eliminar variante ${variant.name}`}
        >
          {deleting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            : <Trash2 className="w-3.5 h-3.5" aria-hidden />}
          Eliminar variante
        </button>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VariantsPage() {
  const { data: session } = useSession()
  const token   = session?.accessToken ?? ''
  const params  = useParams()
  const funnelId = params.funnelId as string

  const [funnel,   setFunnel]   = useState<Funnel | null>(null)
  const [variants, setVariants] = useState<FunnelVariant[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [showNew,  setShowNew]  = useState(false)

  const load = useCallback(async () => {
    if (!token || !funnelId) return
    setLoading(true)
    setError('')
    try {
      const [f, v] = await Promise.all([
        getFunnelById(funnelId, token),
        getFunnelVariants(funnelId, token),
      ])
      setFunnel(f)
      setVariants(v)
    } catch {
      setError('No se pudo cargar la información del embudo.')
    } finally {
      setLoading(false)
    }
  }, [token, funnelId])

  useEffect(() => { load() }, [load])

  const totalSplit = variants.filter((v) => v.isActive).reduce((s, v) => s + v.trafficSplit, 0)
  const splitOk    = totalSplit === 100

  async function handleToggle(id: string, isActive: boolean) {
    try {
      const updated = await updateFunnelVariant(funnelId, id, { isActive }, token)
      setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)))
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    try {
      await deleteFunnelVariant(funnelId, id, token)
      setVariants((prev) => prev.filter((v) => v.id !== id))
    } catch { /* ignore */ }
  }

  async function handleUpdateSplit(id: string, trafficSplit: number) {
    try {
      const updated = await updateFunnelVariant(funnelId, id, { trafficSplit }, token)
      setVariants((prev) => prev.map((v) => (v.id === id ? updated : v)))
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/funnels"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="Volver a embudos"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 truncate">{funnel?.name ?? '…'}</p>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-brand-600" aria-hidden />
            Variantes A/B
          </h1>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-cta">
          <Plus className="w-4 h-4" aria-hidden />
          Nueva variante
        </button>
      </div>

      {/* Split health bar */}
      {variants.length > 0 && (
        <div className={cn(
          'flex items-center gap-3 p-3.5 rounded-xl border text-sm',
          splitOk
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-amber-50 border-amber-200 text-amber-700',
        )}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          {splitOk
            ? `El reparto de tráfico suma 100% — todo correcto.`
            : `El reparto de tráfico suma ${totalSplit}% (debe sumar exactamente 100%).`}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" aria-label="Cargando variantes…" />
        </div>
      ) : variants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <FlaskConical className="w-8 h-8 text-brand-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sin variantes aún</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Crea la primera variante para comenzar a probar diferentes versiones de tu embudo.
            </p>
          </div>
          <button onClick={() => setShowNew(true)} className="btn-cta">
            <Plus className="w-4 h-4" aria-hidden />
            Crear primera variante
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {variants.map((v) => (
            <VariantCard
              key={v.id}
              variant={v}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onUpdateSplit={handleUpdateSplit}
            />
          ))}
        </div>
      )}

      <NewVariantModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onCreated={load}
        funnelId={funnelId}
        accessToken={token}
        usedSplit={totalSplit}
      />
    </div>
  )
}

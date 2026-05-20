'use client'

/**
 * Deals page — Revenue attribution.
 * Allows registering won/lost deals tied to leads and ad campaigns.
 * Powers real ROAS calculation in the Ads dashboard.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Plus, DollarSign, TrendingUp, CheckCircle2, X, Trash2, Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatRelativeDate } from '@/lib/utils'
import {
  getDeals,
  createDeal,
  deleteDeal,
  exportDealsCsv,
  type Deal,
  type CreateDealInput,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STAGE_STYLES: Record<string, { label: string; cls: string }> = {
  won:      { label: 'Ganado',   cls: 'bg-emerald-100 text-emerald-700' },
  lost:     { label: 'Perdido',  cls: 'bg-red-100 text-red-700' },
  refunded: { label: 'Devuelto', cls: 'bg-amber-100 text-amber-700' },
}

function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)
}

// ---------------------------------------------------------------------------
// New Deal Form (inline modal)
// ---------------------------------------------------------------------------

function NewDealModal({ onClose, onSubmit }: {
  onClose:  () => void
  onSubmit: (data: CreateDealInput) => Promise<void>
}) {
  const [form, setForm] = useState<CreateDealInput>({
    leadId:  '',
    amount:  0,
    stage:   'won',
    source:  'manual',
    closedAt: new Date().toISOString().slice(0, 10),
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.leadId || form.amount <= 0) {
      toast.error('Ingresa el Lead ID y un monto válido')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(form)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const field = 'w-full min-h-[40px] px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:outline-none'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Registrar venta</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Lead ID *</label>
            <input
              required
              placeholder="UUID del lead"
              value={form.leadId}
              onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
              className={field}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Monto *</label>
              <input
                type="number"
                required
                min={1}
                step={1000}
                value={form.amount || ''}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                className={field}
                placeholder="990000"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Estado</label>
              <select
                value={form.stage}
                onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as 'won' | 'lost' | 'refunded' }))}
                className={field}
              >
                <option value="won">Ganado</option>
                <option value="lost">Perdido</option>
                <option value="refunded">Devuelto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fuente</label>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as any }))}
                className={field}
              >
                <option value="manual">Manual</option>
                <option value="meta_ads">Meta Ads</option>
                <option value="google_ads">Google Ads</option>
                <option value="organic">Orgánico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Fecha de cierre</label>
              <input
                type="date"
                value={form.closedAt?.slice(0, 10) ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, closedAt: e.target.value }))}
                className={field}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Campaña (opcional)</label>
            <input
              placeholder="Nombre de la campaña"
              value={form.campaignName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, campaignName: e.target.value }))}
              className={field}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notas</label>
            <textarea
              rows={2}
              value={form.notes ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className={cn(field, 'resize-none')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-[44px] rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-all"
        >
          {submitting ? 'Guardando…' : 'Registrar venta'}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STAGE_FILTERS = [
  { value: '',         label: 'Todos' },
  { value: 'won',      label: 'Ganados' },
  { value: 'lost',     label: 'Perdidos' },
  { value: 'refunded', label: 'Devueltos' },
]

export default function DealsPage() {
  const { data: session } = useSession()
  const queryClient       = useQueryClient()

  const [stageFilter, setStageFilter] = useState('')
  const [page,        setPage]        = useState(1)
  const [showModal,   setShowModal]   = useState(false)
  const [exporting,   setExporting]   = useState(false)

  const handleExportCsv = async () => {
    if (!token) return
    setExporting(true)
    try {
      const blob = await exportDealsCsv(token, { stage: stageFilter || undefined })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `deals_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al exportar ventas')
    } finally {
      setExporting(false)
    }
  }

  const token = session?.accessToken ?? ''

  const { data, isLoading } = useQuery({
    queryKey: ['deals', page, stageFilter],
    queryFn:  () => getDeals({ stage: stageFilter, page, limit: 20 }, token),
    enabled:  !!token,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (input: CreateDealInput) => createDeal(input, token),
    onSuccess: () => {
      toast.success('Venta registrada')
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['financial-kpis'] })
    },
    onError: () => toast.error('Error al registrar venta'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDeal(id, token),
    onSuccess: () => {
      toast.success('Deal eliminado')
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['financial-kpis'] })
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const deals      = data?.data ?? []
  const meta       = data?.meta
  const revenue    = meta?.revenue ?? 0
  const totalPages = meta?.pages ?? 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Ventas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registro de cierres para atribución de ingresos y ROAS real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600"
          >
            {exporting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 min-h-[40px] px-4 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-all shadow-card"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Registrar venta
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="kpi-card flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <DollarSign className="w-3.5 h-3.5" /> Ingresos totales (ganados)
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">
            {isLoading ? '—' : formatCLP(revenue)}
          </p>
        </div>
        <div className="kpi-card flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Total deals
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {isLoading ? '—' : (meta?.total ?? 0)}
          </p>
        </div>
        <div className="kpi-card flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <TrendingUp className="w-3.5 h-3.5" /> Valor promedio
          </div>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">
            {isLoading || !meta?.total ? '—' : formatCLP(revenue / (meta.total || 1))}
          </p>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {STAGE_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setStageFilter(value); setPage(1) }}
            className={cn(
              'min-h-[32px] px-4 rounded-lg text-xs font-semibold transition-all',
              stageFilter === value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando ventas…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Lead', 'Monto', 'Estado', 'Fuente', 'Campaña', 'Cierre', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deals.map((deal) => {
                  const stageInfo = STAGE_STYLES[deal.stage] ?? STAGE_STYLES.won
                  const leadName  = deal.lead
                    ? `${deal.lead.firstName ?? ''} ${deal.lead.lastName ?? ''}`.trim() || deal.lead.email
                    : deal.leadId.slice(0, 8)

                  return (
                    <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{leadName}</p>
                        <p className="text-xs text-slate-400 font-mono">{deal.leadId.slice(0, 8)}…</p>
                      </td>
                      <td className="px-5 py-3 font-bold tabular-nums text-slate-900">
                        {formatCLP(Number(deal.amount))}
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', stageInfo.cls)}>
                          {stageInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-500 capitalize whitespace-nowrap">
                        {deal.source.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3 text-slate-400 max-w-[150px] truncate">
                        {deal.campaignName ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                        {formatRelativeDate(deal.closedAt)}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => deleteMutation.mutate(deal.id)}
                          aria-label="Eliminar deal"
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      No hay ventas registradas aún.{' '}
                      <button onClick={() => setShowModal(true)} className="text-brand-600 font-semibold underline">
                        Registra la primera
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            Anterior
          </button>
          <span className="tabular-nums">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            Siguiente
          </button>
        </div>
      )}

      {/* New deal modal */}
      {showModal && (
        <NewDealModal
          onClose={() => setShowModal(false)}
          onSubmit={async (data) => { await createMutation.mutateAsync(data) }}
        />
      )}
    </div>
  )
}

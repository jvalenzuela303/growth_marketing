'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { Search, Filter, ChevronLeft, ChevronRight, X, LayoutGrid, List, Flame, Download, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { cn, SEGMENT_COLORS, SEGMENT_NAMES, STAGE_NAMES, formatRelativeDate, type SegmentKey } from '@/lib/utils'
import { getLeads, updateLead, exportLeadsCsv, type LeadRow } from '@/lib/api'
import { KanbanBoard } from '@/components/leads/KanbanBoard'
import { useRealtime } from '@/hooks/useRealtime'
import { FeatureGate } from '@/components/access/FeatureGate'

// ---------------------------------------------------------------------------
// Lead detail modal
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

function LeadModal({ lead, onClose, token }: { lead: LeadRow; onClose: () => void; token: string }) {
  const seg = (lead.segment as SegmentKey) ?? 'sin_clasificar'
  const sc  = SEGMENT_COLORS[seg]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end xs:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle del lead ${lead.firstName ?? lead.email}`}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {lead.firstName ?? '—'} {lead.lastName ?? ''}
            </h2>
            <p className="text-sm text-slate-500">{lead.email ?? '—'}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="flex items-center justify-center w-8 h-8 rounded-xl text-slate-400 hover:bg-slate-100"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Score + segment */}
        <div className="flex items-center gap-3">
          <div className={cn('flex flex-col items-center justify-center w-16 h-16 rounded-2xl border-2', sc.bg, sc.border)}>
            <span className={cn('text-2xl font-extrabold tabular-nums', sc.text)}>{lead.totalScore}</span>
            <span className="text-xs text-slate-400">score</span>
          </div>
          <div className="space-y-1">
            <span className={cn('segment-badge text-sm', sc.badge)}>
              {SEGMENT_NAMES[seg]}
            </span>
            <p className="text-xs text-slate-400">
              Etapa: <span className="font-semibold text-slate-700">
                {STAGE_NAMES[lead.pipelineStage] ?? lead.pipelineStage}
              </span>
            </p>
          </div>
        </div>

        {/* Details grid */}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Teléfono',    value: lead.phone  ?? '—' },
            { label: 'Fuente',      value: lead.source ?? '—' },
            { label: 'Registrado',  value: formatRelativeDate(lead.createdAt) },
            { label: 'ID',          value: lead.id.slice(0, 8) + '…' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <dt className="text-xs font-semibold text-slate-400 mb-0.5">{label}</dt>
              <dd className="font-medium text-slate-800 truncate">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex gap-2">
          <button
            onClick={async () => {
              const res = await fetch(`${API_BASE}/api/v1/leads/${lead.id}/report`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (!res.ok) return
              const html = await res.text()
              const win  = window.open()
              if (win) { win.document.write(html); win.document.close() }
            }}
            className="flex items-center gap-1.5 flex-1 justify-center min-h-[44px] rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Reporte PDF
          </button>
          <button onClick={onClose} className="btn-cta flex-1">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEGMENTS: { value: string; label: string }[] = [
  { value: '',              label: 'Todos los segmentos' },
  { value: 'fuego',         label: 'Fuego'         },
  { value: 'caliente',      label: 'Caliente'      },
  { value: 'tibio',         label: 'Tibio'         },
  { value: 'frio',          label: 'Frío'          },
  { value: 'motor_detenido',label: 'Motor Detenido'},
]

const STAGES: { value: string; label: string }[] = [
  { value: '',                label: 'Todas las etapas'  },
  { value: 'nuevo',           label: 'Nuevo'             },
  { value: 'calificado',      label: 'Calificado'        },
  { value: 'contactado',      label: 'Contactado'        },
  { value: 'propuesta',       label: 'Propuesta'         },
  { value: 'negociacion',     label: 'Negociación'       },
  { value: 'cerrado_ganado',  label: 'Cerrado Ganado'    },
  { value: 'cerrado_perdido', label: 'Cerrado Perdido'   },
]

type ViewMode = 'table' | 'kanban'

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function LeadsPage() {
  const { data: session } = useSession()
  const queryClient       = useQueryClient()
  const { on }            = useRealtime()

  const [viewMode,      setViewMode]      = useState<ViewMode>('table')
  const [search,        setSearch]        = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [stageFilter,   setStageFilter]   = useState('')
  const [page,          setPage]          = useState(1)
  const [selectedLead,  setSelectedLead]  = useState<LeadRow | null>(null)
  const [exporting,     setExporting]     = useState(false)

  const handleExportCsv = async () => {
    if (!session?.accessToken) return
    setExporting(true)
    try {
      const blob     = await exportLeadsCsv(session.accessToken, {
        segment:       segmentFilter || undefined,
        pipelineStage: stageFilter   || undefined,
      })
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = `leads_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al exportar leads')
    } finally {
      setExporting(false)
    }
  }

  // ── Real-time hot-lead alerts ─────────────────────────────────────────────

  useEffect(() => {
    return on('lead:hot_alert', ({ name, score }) => {
      toast.custom(() => (
        <div className="flex items-center gap-3 bg-white border border-red-200 rounded-2xl shadow-lg px-4 py-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <Flame className="w-5 h-5 text-red-600" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">¡Lead Fuego detectado!</p>
            <p className="text-xs text-slate-500">{name} — score {score}</p>
          </div>
        </div>
      ), { duration: 8000 })
    })
  }, [on])

  // Invalidate leads query when a stage changes via WebSocket (another user moved a card)
  useEffect(() => {
    return on('lead:stage_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    })
  }, [on, queryClient])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', session?.user.tenantId, page, segmentFilter, stageFilter, search],
    queryFn:  () =>
      getLeads(
        session!.user.tenantId,
        { page, pageSize: viewMode === 'kanban' ? 100 : 25, segment: segmentFilter, stage: stageFilter, search },
        session!.accessToken,
      ),
    enabled: !!session,
    staleTime: 30_000,
  })

  const leads      = data?.data      ?? []
  const totalPages = data ? data.meta.pages : 1

  // ── Stage update mutation ──────────────────────────────────────────────────

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      updateLead(id, { pipelineStage: stage }, session!.accessToken),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
    onError: () => toast.error('Error al mover el lead'),
  })

  const handleStageChange = useCallback(
    (leadId: string, newStage: string) =>
      stageMutation.mutateAsync({ id: leadId, stage: newStage }),
    [stageMutation],
  )

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(1)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data ? `${data.meta.total.toLocaleString('es-CL')} leads en total` : 'Cargando…'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <FeatureGate
            minPlan="growth"
            showUpgrade={false}
            fallback={
              <button
                disabled
                title="Requiere plan Growth para exportar"
                aria-label="Exportar CSV requiere plan Growth"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white opacity-40 cursor-not-allowed text-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            }
          >
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-600"
            >
              {exporting
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              CSV
            </button>
          </FeatureGate>

        {/* View toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            aria-label="Vista tabla"
            className={cn(
              'flex items-center gap-1.5 min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <List className="w-3.5 h-3.5" aria-hidden /> Lista
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            aria-label="Vista kanban"
            className={cn(
              'flex items-center gap-1.5 min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-all',
              viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" aria-hidden /> Kanban
          </button>
        </div>
        </div>{/* end actions */}
      </div>

      {/* Filters (hidden in Kanban for simplicity) */}
      {viewMode === 'table' && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden />
            <input
              type="search"
              placeholder="Buscar por nombre o email…"
              value={search}
              onChange={handleSearchChange}
              aria-label="Buscar leads"
              className="w-full min-h-[40px] pl-9 pr-4 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:outline-none"
            />
          </div>

          <select
            value={segmentFilter}
            onChange={(e) => { setSegmentFilter(e.target.value); setPage(1) }}
            aria-label="Filtrar por segmento"
            className="min-h-[40px] px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:outline-none"
          >
            {SEGMENTS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setPage(1) }}
            aria-label="Filtrar por etapa"
            className="min-h-[40px] px-3 text-sm rounded-xl border border-slate-200 bg-white focus:border-brand-500 focus:outline-none"
          >
            {STAGES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Table view ────────────────────────────────────────────────────── */}
      {viewMode === 'table' && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
            {isLoading && (
              <div className="py-16 text-center text-slate-400 text-sm" aria-live="polite">
                Cargando leads…
              </div>
            )}
            {error && (
              <div className="py-16 text-center text-red-500 text-sm" role="alert">
                Error al cargar leads. Por favor recarga la página.
              </div>
            )}
            {!isLoading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Lista de leads">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {['Nombre', 'Email', 'Score', 'Prob. cierre', 'Segmento', 'Etapa', 'Fuente', 'Fecha'].map((h) => (
                        <th
                          key={h}
                          scope="col"
                          className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leads.map((lead) => {
                      const seg = (lead.segment as SegmentKey) ?? 'sin_clasificar'
                      const sc  = SEGMENT_COLORS[seg]
                      return (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="hover:bg-brand-50/40 cursor-pointer transition-colors"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedLead(lead)}
                          role="button"
                          aria-label={`Ver detalle de ${lead.firstName ?? lead.email}`}
                        >
                          <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">
                            {lead.firstName ?? '—'} {lead.lastName ?? ''}
                          </td>
                          <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                            {lead.email ?? '—'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums', sc.badge)}>
                              {lead.totalScore}
                            </span>
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {lead.conversionProbability != null ? (
                              <span className={cn(
                                'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                                lead.conversionLabel === 'alto'  ? 'bg-emerald-100 text-emerald-700' :
                                lead.conversionLabel === 'medio' ? 'bg-amber-100   text-amber-700'   :
                                                                    'bg-slate-100   text-slate-500',
                              )}>
                                {Math.round(lead.conversionProbability * 100)}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn('segment-badge', sc.badge)}>
                              {SEGMENT_NAMES[seg]}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-500 capitalize whitespace-nowrap">
                            {STAGE_NAMES[lead.pipelineStage] ?? lead.pipelineStage}
                          </td>
                          <td className="px-5 py-3 text-slate-400 capitalize whitespace-nowrap">
                            {lead.source.replace('_', ' ')}
                          </td>
                          <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                            {formatRelativeDate(lead.createdAt)}
                          </td>
                        </tr>
                      )
                    })}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                          No se encontraron leads con los filtros seleccionados
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
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Página anterior"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden />
              </button>
              <span className="text-sm text-slate-600 tabular-nums">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Página siguiente"
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Kanban view ───────────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <>
          {isLoading && (
            <div className="py-16 text-center text-slate-400 text-sm">Cargando leads…</div>
          )}
          {!isLoading && (
            <KanbanBoard
              leads={leads}
              onStageChange={handleStageChange}
              onLeadClick={(lead) => setSelectedLead(lead)}
            />
          )}
        </>
      )}

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} token={session?.accessToken ?? ''} />
      )}
    </div>
  )
}

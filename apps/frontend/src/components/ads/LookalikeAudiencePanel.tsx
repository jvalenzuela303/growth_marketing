'use client'

/**
 * LookalikeAudiencePanel — exports high-value segments as Meta Ads Lookalike audiences.
 *
 * CRO Impact: Lookalike audiences built from "fuego" segments typically achieve
 * 40-60% lower CPL than broad targeting, directly improving ROAS. This panel
 * makes that workflow a single click.
 */

import { useState } from 'react'
import { Users, Upload, CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import type { AudienceExport } from '@/lib/api'

type Segment = 'fuego' | 'caliente'

interface LookalikeAudiencePanelProps {
  onExport:       (segment: Segment) => Promise<void>
  exportHistory:  AudienceExport[]
  isLoading:      boolean
  leadCounts:     Record<Segment, number>
}

const SEGMENT_CONFIG: Record<Segment, { label: string; emoji: string; description: string; colorClasses: string }> = {
  fuego: {
    label:       'Fuego',
    emoji:       '🔥',
    description: 'Leads listos para comprar',
    colorClasses: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  caliente: {
    label:       'Caliente',
    emoji:       '⚡',
    description: 'Alto potencial de conversión',
    colorClasses: 'bg-blue-50 border-blue-200 text-blue-700',
  },
}

const STATUS_CONFIG = {
  pending:   { icon: Clock,         color: 'text-amber-600',  label: 'Procesando' },
  completed: { icon: CheckCircle2,  color: 'text-emerald-600', label: 'Completado' },
  failed:    { icon: AlertCircle,   color: 'text-red-600',    label: 'Error' },
}

export function LookalikeAudiencePanel({
  onExport,
  exportHistory,
  isLoading,
  leadCounts,
}: LookalikeAudiencePanelProps) {
  const [selectedSegment, setSelectedSegment] = useState<Segment>('fuego')
  const [isExporting, setIsExporting]         = useState(false)
  const [exportSuccess, setExportSuccess]     = useState(false)
  const [exportError, setExportError]         = useState<string | null>(null)

  async function handleExport() {
    setIsExporting(true)
    setExportError(null)
    setExportSuccess(false)
    try {
      await onExport(selectedSegment)
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch {
      setExportError('Error al exportar. Verifica tu conexión con Meta.')
    } finally {
      setIsExporting(false)
    }
  }

  const count = leadCounts[selectedSegment] ?? 0
  const hasSufficientLeads = count >= 100  // Meta requires min 100 leads

  return (
    <div className="kpi-card space-y-5">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-blue-50">
          <Users className="w-5 h-5 text-blue-600" aria-hidden />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Audiencias Lookalike</h3>
          <p className="text-xs text-slate-500">Exportar segmentos a Meta Ads</p>
        </div>
      </div>

      {/* Segment selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Segmento a exportar</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(SEGMENT_CONFIG) as [Segment, typeof SEGMENT_CONFIG.fuego][]).map(([seg, cfg]) => (
            <button
              key={seg}
              onClick={() => setSelectedSegment(seg)}
              aria-pressed={selectedSegment === seg}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all duration-150',
                selectedSegment === seg
                  ? cfg.colorClasses
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
              )}
            >
              <span className="text-xl" aria-hidden>{cfg.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{cfg.label}</p>
                <p className="text-xs opacity-75 truncate">{cfg.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lead count preview */}
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        hasSufficientLeads ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200',
      )}>
        <Users className={cn('w-4 h-4 flex-shrink-0', hasSufficientLeads ? 'text-emerald-600' : 'text-amber-600')} aria-hidden />
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {isLoading ? '…' : count.toLocaleString('es-CL')} leads en este segmento
          </p>
          {!hasSufficientLeads && (
            <p className="text-xs text-amber-700 mt-0.5">
              Meta requiere al menos 100 leads para crear una Lookalike
            </p>
          )}
        </div>
      </div>

      {/* Export error */}
      {exportError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          {exportError}
        </div>
      )}

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={isExporting || !hasSufficientLeads || exportSuccess}
        className={cn(
          'flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2.5',
          'rounded-xl font-semibold text-sm transition-all duration-150',
          'focus-visible:ring-2 focus-visible:ring-brand-400',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          exportSuccess
            ? 'bg-emerald-500 text-white'
            : 'bg-gradient-brand text-white hover:opacity-90 active:scale-[0.98] shadow-card',
        )}
      >
        {isExporting ? (
          <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Exportando…</>
        ) : exportSuccess ? (
          <><CheckCircle2 className="w-4 h-4" aria-hidden /> Exportado con éxito</>
        ) : (
          <><Upload className="w-4 h-4" aria-hidden /> Exportar a Meta</>
        )}
      </button>

      {/* Export history */}
      {exportHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Historial de exportaciones</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {exportHistory.map((exp) => {
              const cfg = STATUS_CONFIG[exp.status] ?? STATUS_CONFIG.pending
              const StatusIcon = cfg.icon
              return (
                <div key={exp.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <StatusIcon className={cn('w-4 h-4 flex-shrink-0', cfg.color)} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 capitalize">{exp.segment}</p>
                    <p className="text-xs text-slate-400">{exp.leadCount.toLocaleString('es-CL')} leads</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</p>
                    <p className="text-xs text-slate-400">{formatRelativeDate(exp.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

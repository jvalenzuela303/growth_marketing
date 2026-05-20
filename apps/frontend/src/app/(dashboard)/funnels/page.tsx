import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { Plus, BarChart2, Edit2, Eye, FlaskConical } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { getFunnels } from '@/lib/api'
import { cn, formatPercent } from '@/lib/utils'
import type { Funnel, FunnelStatus } from '@growth-engine/shared-types'
import { TemplatePickerButton } from '@/components/funnels/TemplatePickerButton'

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<FunnelStatus, { label: string; classes: string }> = {
  active:   { label: 'Activo',     classes: 'bg-emerald-100 text-emerald-700' },
  draft:    { label: 'Borrador',   classes: 'bg-slate-100   text-slate-600'   },
  paused:   { label: 'Pausado',    classes: 'bg-amber-100   text-amber-700'   },
  archived: { label: 'Archivado',  classes: 'bg-gray-100    text-gray-500'    },
}

function StatusBadge({ status }: { status: FunnelStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.draft
  return (
    <span className={cn('segment-badge', s.classes)}>{s.label}</span>
  )
}

// ---------------------------------------------------------------------------
// Funnel card
// ---------------------------------------------------------------------------

function FunnelCard({ funnel }: { funnel: Funnel }) {
  const completionRate =
    funnel.completionRate ??
    (funnel.totalStarts > 0
      ? (funnel.totalCompletions / funnel.totalStarts) * 100
      : 0)

  return (
    <article className="kpi-card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="font-bold text-slate-900 truncate">{funnel.name}</h3>
          {funnel.description && (
            <p className="text-sm text-slate-500 line-clamp-2">{funnel.description}</p>
          )}
        </div>
        <StatusBadge status={funnel.status} />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Vistas',        value: funnel.totalViews.toLocaleString('es-CL') },
          { label: 'Completados',   value: funnel.totalCompletions.toLocaleString('es-CL') },
          { label: 'Tasa compl.',   value: formatPercent(completionRate, 1) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-xl p-2.5">
            <p className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href={`/funnels/${funnel.id}/analytics`}
          className={cn(
            'flex items-center gap-1.5 flex-1 justify-center min-h-[40px]',
            'rounded-xl border border-slate-200 text-sm font-medium text-slate-600',
            'hover:bg-slate-50 transition-colors',
          )}
          aria-label={`Ver analytics de ${funnel.name}`}
        >
          <BarChart2 className="w-4 h-4" aria-hidden />
          Analytics
        </Link>
        <Link
          href={`/funnels/${funnel.id}/edit`}
          className={cn(
            'flex items-center gap-1.5 flex-1 justify-center min-h-[40px]',
            'rounded-xl border border-slate-200 text-sm font-medium text-slate-600',
            'hover:bg-slate-50 transition-colors',
          )}
          aria-label={`Editar ${funnel.name}`}
        >
          <Edit2 className="w-4 h-4" aria-hidden />
          Editar
        </Link>
        <Link
          href={`/funnels/${funnel.id}/variants`}
          className={cn(
            'flex items-center justify-center w-10 h-10',
            'rounded-xl border border-slate-200 text-slate-600',
            'hover:bg-slate-50 transition-colors',
          )}
          aria-label={`Variantes A/B de ${funnel.name}`}
        >
          <FlaskConical className="w-4 h-4" aria-hidden />
        </Link>
        <Link
          href={`/${funnel.slug}`}
          target="_blank"
          rel="noopener"
          className={cn(
            'flex items-center justify-center w-10 h-10',
            'rounded-xl border border-slate-200 text-slate-600',
            'hover:bg-slate-50 transition-colors',
          )}
          aria-label={`Previsualizar embudo ${funnel.name}`}
        >
          <Eye className="w-4 h-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function FunnelsPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  let funnels: Funnel[] = []
  try {
    funnels = await getFunnels(session.user.tenantId, session.accessToken)
  } catch {
    // graceful fallback — show empty state
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Embudos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {funnels.length} embudo{funnels.length !== 1 ? 's' : ''} configurado{funnels.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TemplatePickerButton />
          <Link
            href="/funnels/new"
            className="btn-cta text-base px-5 py-2.5 min-h-[44px]"
            aria-label="Crear nuevo embudo"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Crear nuevo embudo
          </Link>
        </div>
      </div>

      {/* Grid */}
      {funnels.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.id} funnel={funnel} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <BarChart2 className="w-8 h-8 text-brand-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Aún no tienes embudos
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Crea tu primer embudo de diagnóstico para empezar a capturar y
              calificar leads automáticamente.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <TemplatePickerButton />
            <Link
              href="/funnels/new"
              className="btn-cta"
              aria-label="Crear primer embudo"
            >
              <Plus className="w-4 h-4" aria-hidden />
              Crear desde cero
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

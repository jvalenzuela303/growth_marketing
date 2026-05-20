'use client'

/**
 * Funnel analytics page — shows abandonment data with KPI summary cards.
 *
 * CRO Impact: Making funnel leaks visible drives operator action. Each
 * percentage point of completion rate improvement translates directly
 * into more leads from the same ad spend.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { TrendingDown, Users, CheckCircle2, BarChart2 } from 'lucide-react'
import { cn, formatPercent } from '@/lib/utils'
import { getFunnelAbandonmentStats } from '@/lib/api'
import type { AbandonmentStep } from '@/lib/api'

// Dynamic import to avoid SSR hydration issues with Recharts
const AbandonmentFunnelChart = dynamic(
  () => import('@/components/analytics/AbandonmentFunnelChart').then((m) => m.AbandonmentFunnelChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
)

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ChartSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-3 items-center">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="skeleton h-7 rounded-lg" style={{ width: `${70 - i * 8}%` }} />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon:    React.ComponentType<{ className?: string }>
  label:   string
  value:   string
  sub?:    string
  color?:  'green' | 'amber' | 'red' | 'blue'
}

function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }: KpiCardProps) {
  const colorMap = {
    green: { icon: 'text-emerald-600', bg: 'bg-emerald-50' },
    amber: { icon: 'text-amber-600',   bg: 'bg-amber-50'   },
    red:   { icon: 'text-red-600',     bg: 'bg-red-50'     },
    blue:  { icon: 'text-blue-600',    bg: 'bg-blue-50'    },
  }
  const c = colorMap[color]

  return (
    <div className="kpi-card flex items-start gap-4">
      <div className={cn('flex-shrink-0 p-2.5 rounded-xl', c.bg)}>
        <Icon className={cn('w-5 h-5', c.icon)} aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FunnelAnalyticsPage() {
  const { funnelId } = useParams<{ funnelId: string }>()
  const { data: session } = useSession()

  const [steps, setSteps]         = useState<AbandonmentStep[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!session?.accessToken || !funnelId) return

    setIsLoading(true)
    getFunnelAbandonmentStats(funnelId, session.accessToken)
      .then((data) => {
        setSteps(data.steps)
        setIsLoading(false)
      })
      .catch(() => {
        setError('No se pudieron cargar los datos de análisis.')
        setIsLoading(false)
      })
  }, [funnelId, session?.accessToken])

  // Compute summary KPIs from steps
  const totalViews       = steps[0]?.views ?? 0
  const totalCompletions = steps[steps.length - 1]?.completions ?? 0
  const completionRate   = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0
  const worstStep        = steps.reduce<AbandonmentStep | null>(
    (worst, s) => (!worst || s.dropOffRate > worst.dropOffRate ? s : worst),
    null,
  )

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Análisis de abandono</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visualiza dónde pierdes leads en cada paso del quiz
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Vistas totales"
          value={isLoading ? '—' : totalViews.toLocaleString('es-CL')}
          color="blue"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completaron"
          value={isLoading ? '—' : totalCompletions.toLocaleString('es-CL')}
          color="green"
        />
        <KpiCard
          icon={BarChart2}
          label="Tasa completación"
          value={isLoading ? '—' : formatPercent(completionRate)}
          sub="del total de vistas"
          color={completionRate >= 50 ? 'green' : completionRate >= 30 ? 'amber' : 'red'}
        />
        <KpiCard
          icon={TrendingDown}
          label="Mayor abandono"
          value={isLoading ? '—' : worstStep ? `${worstStep.dropOffRate.toFixed(0)}%` : '—'}
          sub={worstStep ? `P${worstStep.questionIndex + 1}` : undefined}
          color={!worstStep || worstStep.dropOffRate < 10 ? 'green' : worstStep.dropOffRate <= 25 ? 'amber' : 'red'}
        />
      </div>

      {/* Chart card */}
      <div className="kpi-card">
        <h2 className="text-base font-bold text-slate-800 mb-4">Abandono por pregunta</h2>
        {error ? (
          <p className="text-sm text-red-500 py-4">{error}</p>
        ) : (
          <AbandonmentFunnelChart steps={steps} />
        )}
      </div>

      {/* Table — per-step detail */}
      {!isLoading && steps.length > 0 && (
        <div className="kpi-card overflow-x-auto">
          <h2 className="text-base font-bold text-slate-800 mb-4">Detalle por pregunta</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-100">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400">#</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Pregunta</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">Vistas</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">Completaron</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 text-right">Abandono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {steps.map((step) => {
                const color =
                  step.dropOffRate < 10  ? 'text-emerald-600' :
                  step.dropOffRate <= 25 ? 'text-amber-600'   :
                  'text-red-600'
                return (
                  <tr key={step.questionIndex} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-4 font-bold text-slate-400">{step.questionIndex + 1}</td>
                    <td className="py-3 pr-4 text-slate-700 max-w-xs truncate">
                      {step.questionText ?? `Pregunta ${step.questionIndex + 1}`}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 text-right tabular-nums">
                      {step.views.toLocaleString('es-CL')}
                    </td>
                    <td className="py-3 pr-4 text-slate-700 text-right tabular-nums">
                      {step.completions.toLocaleString('es-CL')}
                    </td>
                    <td className={cn('py-3 text-right tabular-nums font-semibold', color)}>
                      {step.dropOffRate.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

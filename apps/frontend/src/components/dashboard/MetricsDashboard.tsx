'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel as RechartsFunnel,
  LabelList,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Target,
  Percent,
  Zap,
  Download,
} from 'lucide-react'
import { cn, formatCurrency, formatPercent, formatRelativeDate, SEGMENT_COLORS, SEGMENT_NAMES, type SegmentKey } from '@/lib/utils'
import type { DashboardKPIs, LeadRow } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d'

interface MetricsDashboardProps {
  kpis:         DashboardKPIs
  recentLeads:  LeadRow[]
  tenantId:     string
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

type TrendDir = 'up' | 'down' | 'neutral'

interface KPICardProps {
  title:   string
  value:   string
  target?: string
  trend:   number       // % change vs prior period
  status:  'above' | 'at' | 'below'
  icon:    React.ComponentType<{ className?: string }>
}

function KPICard({ title, value, target, trend, status, icon: Icon }: KPICardProps) {
  const trendDir: TrendDir =
    trend > 2 ? 'up' : trend < -2 ? 'down' : 'neutral'

  const statusColors = {
    above: { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    at:    { bar: 'bg-amber-500',   text: 'text-amber-600',   bg: 'bg-amber-50'   },
    below: { bar: 'bg-red-500',     text: 'text-red-600',     bg: 'bg-red-50'     },
  }

  const sc = statusColors[status]

  const TrendIcon = trendDir === 'up'
    ? TrendingUp
    : trendDir === 'down'
    ? TrendingDown
    : Minus

  return (
    <div className="kpi-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 truncate">
            {title}
          </p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
        </div>
        <div className={cn('flex-shrink-0 p-2 rounded-xl', sc.bg)}>
          <Icon className={cn('w-5 h-5', sc.text)} aria-hidden />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className={cn('flex items-center gap-1 font-semibold', sc.text)}>
          <TrendIcon className="w-3.5 h-3.5" aria-hidden />
          <span>{trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs mes anterior</span>
        </div>
        {target && (
          <span className="text-slate-400">
            Meta: {target}
          </span>
        )}
      </div>

      {/* Status bar */}
      <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full rounded-full', sc.bar)} style={{ width: '60%' }} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Segment distribution chart
// ---------------------------------------------------------------------------

const SEGMENT_ORDER: SegmentKey[] = ['fuego', 'caliente', 'tibio', 'frio', 'motor_detenido']

interface SegmentData {
  name:  string
  value: number
  color: string
}

function LeadScoreDistribution({ data }: { data: SegmentData[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="kpi-card">
      <h3 className="text-sm font-bold text-slate-800 mb-4">
        Distribución de Leads por Segmento
      </h3>
      <div className="flex gap-6 items-center">
        <PieChart width={140} height={140}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={62}
            paddingAngle={3}
            dataKey="value"
            aria-label="Distribución de leads por segmento"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [value, 'Leads']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
        </PieChart>

        <div className="flex-1 space-y-2">
          {data.map(({ name, value, color }) => (
            <div key={name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="text-xs text-slate-600">{name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 tabular-nums">{value}</span>
                <span className="text-xs text-slate-400 tabular-nums">
                  ({total > 0 ? formatPercent((value / total) * 100, 0) : '0%'})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Funnel chart
// ---------------------------------------------------------------------------

const FUNNEL_COLORS = ['#c44df0', '#a730d6', '#8b24b0', '#731f8e', '#5e1b74']

interface FunnelStage {
  name:  string
  value: number
}

function FunnelVisualization({ stages }: { stages: FunnelStage[] }) {
  return (
    <div className="kpi-card">
      <h3 className="text-sm font-bold text-slate-800 mb-4">
        Embudo de Conversión
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <FunnelChart>
          <Tooltip
            formatter={(value: number) => [value.toLocaleString('es-CL'), 'Usuarios']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <RechartsFunnel
            dataKey="value"
            data={stages.map((s, i) => ({ ...s, fill: FUNNEL_COLORS[i] ?? '#c44df0' }))}
            isAnimationActive
          >
            <LabelList
              position="right"
              content={({ value, name }) => (
                <text
                  x={0}
                  y={0}
                  fill="#64748b"
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="start"
                >
                  {name}: {Number(value).toLocaleString('es-CL')}
                </text>
              )}
            />
          </RechartsFunnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Leads table
// ---------------------------------------------------------------------------

function RecentLeadsTable({ leads }: { leads: LeadRow[] }) {
  return (
    <div className="kpi-card overflow-hidden">
      <h3 className="text-sm font-bold text-slate-800 mb-4">Leads Recientes</h3>
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm" aria-label="Tabla de leads recientes">
          <thead>
            <tr className="border-b border-slate-100">
              {['Nombre', 'Email', 'Score', 'Segmento', 'Etapa', 'Fecha'].map((h) => (
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
              const sc  = SEGMENT_COLORS[seg] ?? SEGMENT_COLORS.sin_clasificar
              return (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800 whitespace-nowrap">
                    {lead.firstName ?? '—'} {lead.lastName ?? ''}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                    {lead.email ?? '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs font-bold tabular-nums',
                        sc.badge,
                      )}
                    >
                      {lead.totalScore}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={cn('segment-badge', sc.badge)}>
                      {SEGMENT_NAMES[seg]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500 capitalize whitespace-nowrap">
                    {lead.pipelineStage.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                    {formatRelativeDate(lead.createdAt)}
                  </td>
                </tr>
              )
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-sm">
                  No hay leads en el período seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export function MetricsDashboard({ kpis, recentLeads, tenantId }: MetricsDashboardProps) {
  const [range, setRange] = useState<DateRange>('30d')

  const RANGE_OPTIONS: { value: DateRange; label: string }[] = [
    { value: '7d',  label: '7 días'  },
    { value: '30d', label: '30 días' },
    { value: '90d', label: '90 días' },
  ]

  // Determine KPI status (above/at/below target)
  function kpiStatus(value: number, target: number): KPICardProps['status'] {
    const ratio = value / target
    if (ratio >= 0.9) return 'above'
    if (ratio >= 0.7) return 'at'
    return 'below'
  }

  // Build segment distribution data from mock (backend will provide real data)
  const segmentData: SegmentData[] = SEGMENT_ORDER.map((seg) => ({
    name:  SEGMENT_NAMES[seg],
    value: Math.floor(Math.random() * 100), // replace with real data from API
    color: SEGMENT_COLORS[seg].hex,
  }))

  const funnelStages: FunnelStage[] = [
    { name: 'Impresiones', value: 24800 },
    { name: 'Clics',       value: 1240  },
    { name: 'Quiz inicio', value: 620   },
    { name: 'Leads',       value: 248   },
    { name: 'Calificados', value: 89    },
  ]

  function handleExportCSV() {
    const headers = ['Nombre', 'Email', 'Score', 'Segmento', 'Etapa', 'Fecha']
    const rows    = recentLeads.map((l) => [
      `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim(),
      l.email ?? '',
      l.totalScore,
      l.segment,
      l.pipelineStage,
      l.createdAt,
    ])
    const csv     = [headers, ...rows].map((r) => r.join(',')).join('\n')
    const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href        = url
    a.download    = `leads-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Resumen del Embudo</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rendimiento en tiempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range picker */}
          <div
            className="flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden"
            role="group"
            aria-label="Filtro de período"
          >
            {RANGE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setRange(value)}
                aria-pressed={range === value}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors duration-150 min-h-[36px]',
                  range === value
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            onClick={handleExportCSV}
            aria-label="Exportar leads a CSV"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200',
              'bg-white text-sm font-medium text-slate-600',
              'hover:bg-slate-50 transition-colors duration-150 min-h-[36px]',
            )}
          >
            <Download className="w-4 h-4" aria-hidden />
            <span className="hidden xs:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="CPL"
          value={formatCurrency(kpis.cpl.value)}
          target={formatCurrency(kpis.cpl.target)}
          trend={kpis.cpl.trend}
          status={kpiStatus(kpis.cpl.target, kpis.cpl.value)} // lower CPL = better
          icon={DollarSign}
        />
        <KPICard
          title="ROAS"
          value={`${kpis.roas.value.toFixed(1)}×`}
          target={`${kpis.roas.target}×`}
          trend={kpis.roas.trend}
          status={kpiStatus(kpis.roas.value, kpis.roas.target)}
          icon={TrendingUp}
        />
        <KPICard
          title="Tasa Completación Quiz"
          value={formatPercent(kpis.quizCompletionRate.value)}
          target={formatPercent(kpis.quizCompletionRate.target)}
          trend={kpis.quizCompletionRate.trend}
          status={kpiStatus(kpis.quizCompletionRate.value, kpis.quizCompletionRate.target)}
          icon={Percent}
        />
        <KPICard
          title="% Automatización"
          value={formatPercent(kpis.automationRate.value)}
          target={formatPercent(kpis.automationRate.target)}
          trend={kpis.automationRate.trend}
          status={kpiStatus(kpis.automationRate.value, kpis.automationRate.target)}
          icon={Zap}
        />
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <FunnelVisualization stages={funnelStages} />
        <LeadScoreDistribution data={segmentData} />
      </div>

      {/* Recent leads */}
      <RecentLeadsTable leads={recentLeads} />
    </div>
  )
}

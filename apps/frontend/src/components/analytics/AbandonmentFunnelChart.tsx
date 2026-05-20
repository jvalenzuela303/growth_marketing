'use client'

/**
 * AbandonmentFunnelChart — horizontal bar chart per quiz step.
 * Color coding: green (<10% drop-off), amber (10-25%), red (>25%).
 *
 * CRO Impact: Visualizing per-step drop-off pinpoints exactly where leads
 * abandon the funnel, enabling targeted fixes that directly raise completion
 * rates and reduce wasted ad spend.
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { AbandonmentStep } from '@/lib/api'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBarColor(dropOffRate: number): string {
  if (dropOffRate < 10)  return '#10b981' // emerald
  if (dropOffRate <= 25) return '#f59e0b' // amber
  return '#ef4444'                         // red
}

interface ChartPayload {
  name:        string
  completions: number
  dropOffRate: number
  views:       number
}

// ---------------------------------------------------------------------------
// Custom tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?:  boolean
  payload?: { payload: ChartPayload }[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-card-hover text-sm">
      <p className="font-bold text-slate-800 mb-1">{d.name}</p>
      <p className="text-slate-600">Vistas:       <span className="font-semibold text-slate-900">{d.views.toLocaleString('es-CL')}</span></p>
      <p className="text-slate-600">Completaron:  <span className="font-semibold text-slate-900">{d.completions.toLocaleString('es-CL')}</span></p>
      <p className="text-slate-600">
        Abandono:{' '}
        <span className="font-semibold" style={{ color: getBarColor(d.dropOffRate) }}>
          {d.dropOffRate.toFixed(1)}%
        </span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chart
// ---------------------------------------------------------------------------

interface AbandonmentFunnelChartProps {
  steps: AbandonmentStep[]
}

export function AbandonmentFunnelChart({ steps }: AbandonmentFunnelChartProps) {
  if (!steps.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sin datos de abandono para este período
      </div>
    )
  }

  const data: ChartPayload[] = steps.map((step) => ({
    name:        step.questionText ?? `Pregunta ${step.questionIndex + 1}`,
    completions: step.completions,
    dropOffRate: step.dropOffRate,
    views:       step.views,
  }))

  return (
    <div className="w-full">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <LegendDot color="#10b981" label="Abandono < 10%" />
        <LegendDot color="#f59e0b" label="Abandono 10–25%" />
        <LegendDot color="#ef4444" label="Abandono > 25%" />
      </div>

      <ResponsiveContainer width="100%" height={Math.max(steps.length * 52, 180)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
          barCategoryGap="25%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString('es-CL')}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 18) + '…' : v}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
          <Bar dataKey="completions" radius={[0, 6, 6, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.dropOffRate)} />
            ))}
            <LabelList
              dataKey="dropOffRate"
              position="right"
              formatter={(v: number) => `${v.toFixed(0)}%`}
              style={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-slate-500">{label}</span>
    </div>
  )
}

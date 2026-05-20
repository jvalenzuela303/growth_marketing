'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  TrendingUp, DollarSign, Users, Target, Loader2, AlertCircle,
  ArrowUpRight, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttributionChannel {
  source:         string
  leads:          number
  avgScore:       number
  adSpend:        number
  deals:          number
  revenue:        number
  cpl:            number | null
  conversionRate: number
  roas:           number | null
}

interface AttributionData {
  range:    string
  since:    string
  channels: AttributionChannel[] | undefined
  totals: {
    leads:   number
    adSpend: number
    deals:   number
    revenue: number
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { value: '7d',  label: '7 días'  },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
]

const SOURCE_LABELS: Record<string, string> = {
  facebook:  'Meta Ads',
  instagram: 'Instagram Ads',
  google:    'Google Ads',
  tiktok:    'TikTok Ads',
  organic:   'Orgánico',
  direct:    'Directo',
  referral:  'Referido',
  whatsapp:  'WhatsApp',
  messenger: 'Messenger',
  email:     'Email',
}

const SOURCE_COLORS: Record<string, string> = {
  facebook:  'bg-blue-500',
  instagram: 'bg-pink-500',
  google:    'bg-red-500',
  tiktok:    'bg-slate-900',
  organic:   'bg-emerald-500',
  direct:    'bg-slate-400',
  referral:  'bg-violet-500',
  messenger: 'bg-sky-500',
}

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('es-CL', { maximumFractionDigits: decimals })
}
function fmtCurrency(n: number) {
  return `$${fmt(Math.round(n))}`
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string
  icon: React.ComponentType<{ className?: string }>; color: string
}) {
  return (
    <div className="kpi-card flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Attribution row ──────────────────────────────────────────────────────────

function ChannelRow({ ch, maxRevenue }: { ch: AttributionChannel; maxRevenue: number }) {
  const barWidth = maxRevenue > 0 ? (ch.revenue / maxRevenue) * 100 : 0
  const color    = SOURCE_COLORS[ch.source] ?? 'bg-slate-400'

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', color)} />
          <span className="text-sm font-semibold text-slate-800">
            {SOURCE_LABELS[ch.source] ?? ch.source}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">{fmt(ch.leads)}</td>
      <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">
        <span className={cn(
          'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold',
          ch.avgScore >= 70 ? 'bg-emerald-50 text-emerald-700' :
          ch.avgScore >= 40 ? 'bg-amber-50 text-amber-700' :
                              'bg-slate-100 text-slate-500',
        )}>
          {ch.avgScore}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">
        {ch.adSpend > 0 ? fmtCurrency(ch.adSpend) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">
        {ch.cpl != null ? fmtCurrency(ch.cpl) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">{ch.deals}</td>
      <td className="px-4 py-3 text-sm text-slate-700 tabular-nums">
        {ch.conversionRate}%
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 tabular-nums w-20 text-right">
            {fmtCurrency(ch.revenue)}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 min-w-[48px]">
            <div
              className={cn('h-1.5 rounded-full', color)}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">
        {ch.roas != null ? (
          <span className={cn(
            'font-bold',
            ch.roas >= 3 ? 'text-emerald-600' :
            ch.roas >= 1 ? 'text-amber-600' : 'text-red-500',
          )}>
            {ch.roas}x
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttributionPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''

  const [range,   setRange]   = useState('30d')
  const [data,    setData]    = useState<AttributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/analytics/attribution?range=${range}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
      .then((r) => r.json())
      .then((d) => { setData(d); setError('') })
      .catch(() => setError('No se pudo cargar la atribución.'))
      .finally(() => setLoading(false))
  }, [token, range])

  const totals     = data?.totals
  const globalRoas = totals?.adSpend && totals.adSpend > 0
    ? Math.round((totals.revenue / totals.adSpend) * 100) / 100
    : null
  const globalCpl  = totals?.leads && totals.adSpend && totals.leads > 0
    ? Math.round((totals.adSpend / totals.leads) * 100) / 100
    : null
  const maxRevenue = Math.max(...(data?.channels?.map((c) => c.revenue) ?? [1]), 1)

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            Atribución de Ingresos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Conecta cada peso invertido en ads con leads captados, deals cerrados y revenue real.
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {RANGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                range === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI summary */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Leads captados"
              value={fmt(totals?.leads ?? 0)}
              sub={`en ${range}`}
              icon={Users}
              color="bg-brand-500"
            />
            <KpiCard
              label="Inversión total"
              value={fmtCurrency(totals?.adSpend ?? 0)}
              sub={globalCpl ? `CPL: ${fmtCurrency(globalCpl)}` : 'Sin datos de ads'}
              icon={DollarSign}
              color="bg-amber-500"
            />
            <KpiCard
              label="Deals cerrados"
              value={fmt(totals?.deals ?? 0)}
              sub={totals?.leads ? `${Math.round(((totals.deals)/(totals.leads))*1000)/10}% conv.` : undefined}
              icon={Target}
              color="bg-emerald-500"
            />
            <KpiCard
              label="Revenue atribuido"
              value={fmtCurrency(totals?.revenue ?? 0)}
              sub={globalRoas ? `ROAS: ${globalRoas}x` : 'Sin inversión registrada'}
              icon={TrendingUp}
              color={globalRoas && globalRoas >= 3 ? 'bg-emerald-600' : 'bg-slate-500'}
            />
          </div>

          {/* Attribution table */}
          <div className="kpi-card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">
                Desglose por canal — {data.channels?.length ?? 0} fuentes
              </h2>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Desde {new Date(data.since).toLocaleDateString('es-CL')}</span>
              </div>
            </div>

            {(data.channels ?? []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-10">
                No hay datos de leads en este período.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50">
                      {['Canal', 'Leads', 'Score Prom.', 'Inversión', 'CPL', 'Deals', 'Conv.%', 'Revenue', 'ROAS'].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide first:px-5">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.channels ?? []).map((ch) => (
                      <ChannelRow key={ch.source} ch={ch} maxRevenue={maxRevenue} />
                    ))}
                  </tbody>
                  {/* Totals row */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <td className="px-5 py-3 text-sm text-slate-800">Total</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{fmt(totals?.leads ?? 0)}</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-sm tabular-nums">{fmtCurrency(totals?.adSpend ?? 0)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{globalCpl ? fmtCurrency(globalCpl) : '—'}</td>
                      <td className="px-4 py-3 text-sm tabular-nums">{fmt(totals?.deals ?? 0)}</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-sm tabular-nums">{fmtCurrency(totals?.revenue ?? 0)}</td>
                      <td className="px-4 py-3 text-sm tabular-nums text-emerald-700">
                        {globalRoas ? `${globalRoas}x` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Insight callout */}
          {(data.channels ?? []).length > 0 && (() => {
            const best = [...(data.channels ?? [])]
              .filter((c) => c.roas !== null)
              .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0]
            if (!best) return null
            return (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-emerald-800">
                    Mejor canal por ROAS: {SOURCE_LABELS[best.source] ?? best.source}
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Retorna <strong>{best.roas}x</strong> por cada peso invertido —
                    {' '}{best.deals} deals cerrados, {fmtCurrency(best.revenue)} en revenue.
                    Considera aumentar el presupuesto en este canal.
                  </p>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}

'use client'

/**
 * BudgetOptimizerPanel — AI-driven budget redistribution recommendations.
 *
 * Fetches ROAS analysis per campaign and surfaces actionable recommendations:
 * scale winners, cut losers, pause zero-return campaigns.
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  Zap, TrendingUp, TrendingDown, PauseCircle, Minus,
  Loader2, AlertCircle, RefreshCw, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

type RecommendationAction = 'increase' | 'decrease' | 'pause' | 'maintain'

interface BudgetRecommendation {
  campaignName:    string
  platform:        string
  currentSpend:    number
  revenue:         number
  roas:            number
  deals:           number
  cpl:             number | null
  action:          RecommendationAction
  recommendation:  string
  suggestedDelta:  number
  confidence:      'high' | 'medium' | 'low'
}

interface OptimizerResult {
  generatedAt:     string
  periodDays:      number
  totalSpend:      number
  totalRevenue:    number
  globalRoas:      number
  recommendations: BudgetRecommendation[] | undefined
  summary:         string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

function fmtCLP(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n / 1000)}K`
  return `$${Math.round(n)}`
}

const ACTION_CONFIG: Record<RecommendationAction, {
  label: string
  icon:  React.ComponentType<{ className?: string }>
  color: string
  bg:    string
}> = {
  increase: { label: 'Escalar',   icon: TrendingUp,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  decrease: { label: 'Reducir',   icon: TrendingDown,  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'     },
  pause:    { label: 'Pausar',    icon: PauseCircle,   color: 'text-red-700',     bg: 'bg-red-50 border-red-200'         },
  maintain: { label: 'Mantener',  icon: Minus,         color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200'     },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100   text-amber-700',
  low:    'bg-slate-100   text-slate-500',
}

const PLATFORM_LABELS: Record<string, string> = {
  meta:     'Meta',
  facebook: 'Meta',
  google:   'Google',
  tiktok:   'TikTok',
}

// ── Recommendation row ────────────────────────────────────────────────────────

function RecommendationRow({ rec }: { rec: BudgetRecommendation }) {
  const cfg  = ACTION_CONFIG[rec.action]
  const Icon = cfg.icon

  return (
    <div className={cn('rounded-2xl border p-4 space-y-3', cfg.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 truncate">{rec.campaignName}</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
              {PLATFORM_LABELS[rec.platform] ?? rec.platform}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">{rec.recommendation}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className={cn('flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border', cfg.color, cfg.bg)}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
            {rec.suggestedDelta !== 0 && (
              <span className="ml-1">{rec.suggestedDelta > 0 ? `+${rec.suggestedDelta}` : rec.suggestedDelta}%</span>
            )}
          </div>
          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', CONFIDENCE_COLORS[rec.confidence])}>
            {rec.confidence === 'high' ? 'Alta confianza' : rec.confidence === 'medium' ? 'Confianza media' : 'Pocos datos'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Inversión', value: fmtCLP(rec.currentSpend) },
          { label: 'Revenue',   value: fmtCLP(rec.revenue)      },
          { label: 'ROAS',      value: `${rec.roas}×`           },
          { label: 'Deals',     value: String(rec.deals)         },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/70 rounded-xl p-2">
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="text-xs font-bold text-slate-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function BudgetOptimizerPanel() {
  const { data: session }  = useSession()
  const [data,     setData]     = useState<OptimizerResult | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [days,     setDays]     = useState(30)

  async function load() {
    if (!session?.accessToken) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API_BASE}/api/v1/budget-optimizer/recommendations?days=${days}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json() as OptimizerResult
      setData(json)
    } catch {
      setError('No se pudieron cargar las recomendaciones.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [session?.accessToken, days])

  return (
    <div className="kpi-card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Optimizador de Budget</h2>
            <p className="text-xs text-slate-500">Redistribución inteligente basada en ROAS real</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-8 px-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={60}>60 días</option>
            <option value={90}>90 días</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
        </div>
      )}

      {data && (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total invertido',   value: fmtCLP(data.totalSpend   ?? 0), icon: BarChart3,  color: 'text-slate-600' },
              { label: 'Revenue atribuido', value: fmtCLP(data.totalRevenue ?? 0), icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'ROAS global',       value: `${data.globalRoas ?? 0}×`,     icon: Zap,        color: (data.globalRoas ?? 0) >= 3 ? 'text-emerald-600' : (data.globalRoas ?? 0) >= 1 ? 'text-amber-600' : 'text-red-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                <Icon className={cn('w-4 h-4 mx-auto mb-1', color)} />
                <p className="text-xs text-slate-500">{label}</p>
                <p className={cn('text-sm font-extrabold', color)}>{value}</p>
              </div>
            ))}
          </div>

          {/* Summary */}
          {data.summary && (
            <p className="text-xs text-slate-600 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
              {data.summary}
            </p>
          )}

          {/* Recommendations */}
          {(data.recommendations ?? []).length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No hay campañas con datos suficientes en este período.</p>
              <p className="text-xs mt-1">Registra gasto en campañas para ver recomendaciones.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data.recommendations ?? []).map((rec) => (
                <RecommendationRow key={`${rec.platform}-${rec.campaignName}`} rec={rec} />
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-400 text-center">
            Generado: {new Date(data.generatedAt).toLocaleString('es-CL')} · {data.periodDays} días analizados
          </p>
        </>
      )}
    </div>
  )
}

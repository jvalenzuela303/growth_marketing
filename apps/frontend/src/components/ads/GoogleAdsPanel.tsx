'use client'

/**
 * GoogleAdsPanel — datos reales de la cuenta 917-047-0641 via Google Ads API v20.
 * OAuth2 completado: refresh_token almacenado en ads_accounts (platform='google').
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, ExternalLink, CheckCircle2, AlertCircle,
  MousePointer, Eye, TrendingUp, DollarSign, Loader2,
  ChevronRight,
} from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { getGoogleAdsCampaigns } from '@/lib/api'
import type { GoogleAdsCampaign } from '@/lib/api'

const CUSTOMER_ID = '917-047-0641'
const DAYS        = 30

// ---------------------------------------------------------------------------
// KPI row
// ---------------------------------------------------------------------------

function KpiRow({ campaigns }: { campaigns: GoogleAdsCampaign[] }) {
  const active           = campaigns.filter((c) => c.status === 'ENABLED')
  const totalSpend       = active.reduce((s, c) => s + c.spend, 0)
  const totalImpressions = active.reduce((s, c) => s + c.impressions, 0)
  const totalClicks      = active.reduce((s, c) => s + c.clicks, 0)
  const totalConversions = active.reduce((s, c) => s + c.conversions, 0)
  const avgCtr           = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0
  const avgCpc           = totalClicks > 0 ? totalSpend / totalClicks : 0
  const costPerConv      = totalConversions > 0 ? totalSpend / totalConversions : 0

  const kpis = [
    { icon: DollarSign,   label: 'Inversión',    value: formatCurrency(totalSpend),               color: 'blue'   },
    { icon: Eye,          label: 'Impresiones',  value: totalImpressions.toLocaleString('es-CL'), color: 'slate'  },
    { icon: MousePointer, label: 'Clicks',       value: totalClicks.toLocaleString('es-CL'),      color: 'purple' },
    { icon: TrendingUp,   label: 'CTR prom.',    value: formatPercent(avgCtr * 100),              color: avgCtr * 100 >= 2 ? 'green' : avgCtr > 0 ? 'amber' : 'slate' },
    { icon: DollarSign,   label: 'CPC prom.',    value: formatCurrency(avgCpc),                   color: 'blue'   },
    { icon: CheckCircle2, label: 'Conversiones', value: totalConversions.toFixed(1),              color: 'green'  },
    { icon: DollarSign,   label: 'Costo/Conv.',  value: costPerConv > 0 ? formatCurrency(costPerConv) : '—', color: 'amber' },
  ] as const

  const colorMap = {
    blue:   'text-blue-600 bg-blue-50',
    green:  'text-emerald-600 bg-emerald-50',
    amber:  'text-amber-600 bg-amber-50',
    slate:  'text-slate-500 bg-slate-100',
    purple: 'text-purple-600 bg-purple-50',
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      {kpis.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="kpi-card flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className={cn('p-1.5 rounded-lg', colorMap[color])}>
              <Icon className="w-3.5 h-3.5" aria-hidden />
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 leading-tight">{label}</p>
          </div>
          <p className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign table
// ---------------------------------------------------------------------------

const CHANNEL_LABELS: Record<string, string> = {
  SEARCH:          'Búsqueda',
  DISPLAY:         'Display',
  PERFORMANCE_MAX: 'PMax',
  VIDEO:           'Video',
  SHOPPING:        'Shopping',
  SMART:           'Smart',
}

const CHANNEL_COLORS: Record<string, string> = {
  SEARCH:          'bg-blue-100 text-blue-700',
  DISPLAY:         'bg-purple-100 text-purple-700',
  PERFORMANCE_MAX: 'bg-brand-100 text-brand-700',
  VIDEO:           'bg-red-100 text-red-700',
  SHOPPING:        'bg-orange-100 text-orange-700',
  SMART:           'bg-slate-100 text-slate-700',
}

function CampaignsTable({ campaigns }: { campaigns: GoogleAdsCampaign[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-100">
            {['Campaña', 'Tipo', 'Estado', 'Budget/día', 'Inversión', 'CTR', 'CPC', 'Conv.'].map((h) => (
              <th key={h} className="px-4 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {campaigns.map((c) => {
            const isEnabled  = c.status === 'ENABLED'
            const channelKey = c.channelType ?? 'SEARCH'
            const ctrPct     = c.ctr * 100

            return (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800 max-w-[200px] truncate" title={c.name}>
                    {c.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {c.id}</p>
                </td>

                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-semibold',
                    CHANNEL_COLORS[channelKey] ?? 'bg-slate-100 text-slate-600',
                  )}>
                    {CHANNEL_LABELS[channelKey] ?? channelKey}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                    isEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isEnabled ? 'bg-emerald-500 animate-pulse-slow' : 'bg-amber-500',
                    )} />
                    {isEnabled ? 'Activa' : 'Pausada'}
                  </span>
                </td>

                <td className="px-4 py-3 tabular-nums text-slate-600 text-xs">
                  {c.budgetDaily != null ? `${formatCurrency(c.budgetDaily)}/d` : '—'}
                </td>

                <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                  {c.spend > 0 ? formatCurrency(c.spend) : '—'}
                </td>

                <td className={cn(
                  'px-4 py-3 tabular-nums font-semibold',
                  ctrPct >= 2 ? 'text-emerald-600' : ctrPct >= 1 ? 'text-amber-600' : ctrPct === 0 ? 'text-slate-400' : 'text-red-500',
                )}>
                  {c.ctr > 0 ? formatPercent(ctrPct) : '—'}
                </td>

                <td className="px-4 py-3 tabular-nums text-slate-700">
                  {c.cpc > 0 ? formatCurrency(c.cpc) : '—'}
                </td>

                <td className="px-4 py-3 tabular-nums text-slate-700">
                  {c.conversions > 0 ? c.conversions.toFixed(1) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel principal
// ---------------------------------------------------------------------------

export function GoogleAdsPanel() {
  const { data: session }               = useSession()
  const [campaigns, setCampaigns]       = useState<GoogleAdsCampaign[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [isSyncing, setIsSyncing]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [lastSync, setLastSync]         = useState<string | null>(null)

  const token = session?.accessToken ?? ''

  async function load() {
    if (!token) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getGoogleAdsCampaigns(CUSTOMER_ID, token, DAYS)
      setCampaigns(data)
      setLastSync(new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar campañas'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSync() {
    setIsSyncing(true)
    await load()
    setIsSyncing(false)
  }

  useEffect(() => { load() }, [token])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
        <span className="text-sm font-medium">Cargando campañas desde Google Ads…</span>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-500" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 mb-1">Error al conectar Google Ads API</p>
          <p className="text-xs text-slate-500 max-w-sm">{error}</p>
        </div>
        <button
          onClick={handleSync}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Account badge */}
      <div className="flex items-center gap-3 p-4 rounded-2xl border bg-emerald-50 border-emerald-200">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
          <span className="text-base font-extrabold" style={{ color: '#4285F4' }}>G</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">Google Ads — {CUSTOMER_ID}</p>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" aria-hidden />
              Conectada
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {campaigns.length} campañas · últimos {DAYS} días
            {lastSync && ` · sync ${lastSync}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`https://ads.google.com/aw/overview?ocid=${CUSTOMER_ID.replace(/-/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
          >
            Ver en Google Ads
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={cn(
              'flex items-center gap-1.5 min-h-[32px] px-3 rounded-xl',
              'border border-slate-200 bg-white text-xs font-semibold text-slate-700',
              'hover:bg-slate-50 transition-colors shadow-sm',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            )}
          >
            {isSyncing
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              : <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            }
            {isSyncing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {campaigns.length > 0 && <KpiRow campaigns={campaigns} />}

      {/* Campaign table */}
      <div className="kpi-card overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-base font-bold text-slate-800">
            Campañas Google Ads
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({campaigns.filter((c) => c.status === 'ENABLED').length} activas)
            </span>
          </h2>
        </div>

        {campaigns.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-10">
            No se encontraron campañas en los últimos {DAYS} días.
          </p>
        ) : (
          <CampaignsTable campaigns={campaigns} />
        )}
      </div>

    </div>
  )
}

'use client'

/**
 * TikTokAdsPanel — Integración con TikTok Business API v1.3.
 *
 * OAuth2 flow:
 *   1. Usuario ingresa su Advertiser ID
 *   2. Click "Conectar con TikTok" → redirige a /api/v1/tiktok-ads/oauth/init
 *   3. TikTok devuelve auth_code → callback → token almacenado
 *   4. Panel muestra campañas en tiempo real
 *
 * Credentials: TIKTOK_APP_ID + TIKTOK_APP_SECRET en .env backend
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  RefreshCw, ExternalLink, CheckCircle2, AlertCircle,
  MousePointer, Eye, TrendingUp, DollarSign, Loader2,
  Play, Pause, Link2,
} from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import { getTikTokCampaigns, getAdsAccounts } from '@/lib/api'
import type { TikTokCampaign, AdsAccount } from '@/lib/api'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------

function KpiStrip({ campaigns }: { campaigns: TikTokCampaign[] }) {
  const active     = campaigns.filter((c) => c.status === 'ENABLE')
  const spend      = active.reduce((s, c) => s + c.spend, 0)
  const impr       = active.reduce((s, c) => s + c.impressions, 0)
  const clicks     = active.reduce((s, c) => s + c.clicks, 0)
  const conv       = active.reduce((s, c) => s + c.conversions, 0)
  const avgCtr     = impr > 0 ? clicks / impr : 0
  const avgCpc     = clicks > 0 ? spend / clicks : 0
  const costPerConv = conv > 0 ? spend / conv : 0

  const kpis = [
    { label: 'Inversión',    value: formatCurrency(spend),           icon: DollarSign,   color: 'blue'   },
    { label: 'Impresiones',  value: impr.toLocaleString('es-CL'),   icon: Eye,          color: 'slate'  },
    { label: 'Clicks',       value: clicks.toLocaleString('es-CL'), icon: MousePointer, color: 'purple' },
    { label: 'CTR prom.',    value: formatPercent(avgCtr * 100),    icon: TrendingUp,   color: avgCtr * 100 >= 1 ? 'green' : 'amber' },
    { label: 'CPC prom.',    value: formatCurrency(avgCpc),         icon: DollarSign,   color: 'blue'   },
    { label: 'Conversiones', value: conv.toFixed(1),                icon: CheckCircle2, color: 'green'  },
    { label: 'Costo/Conv.',  value: costPerConv > 0 ? formatCurrency(costPerConv) : '—', icon: DollarSign, color: 'amber' },
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
      {kpis.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="kpi-card flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className={cn('p-1.5 rounded-lg', colorMap[color])}>
              <Icon className="w-3.5 h-3.5" aria-hidden />
            </div>
            <span className="text-xs text-slate-500 truncate">{label}</span>
          </div>
          <p className="text-lg font-bold text-slate-900 tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Campaign table
// ---------------------------------------------------------------------------

const STATUS_MAP: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  ENABLE:  { label: 'Activa',    cls: 'bg-emerald-100 text-emerald-700', icon: Play },
  DISABLE: { label: 'Pausada',   cls: 'bg-amber-100 text-amber-700',     icon: Pause },
  DELETE:  { label: 'Eliminada', cls: 'bg-red-100 text-red-700',         icon: AlertCircle },
}

function CampaignRow({ c }: { c: TikTokCampaign }) {
  const s = STATUS_MAP[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600', icon: AlertCircle }
  const Icon = s.icon

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={c.name}>{c.name}</p>
        <p className="text-xs text-slate-400">{c.objective}</p>
      </td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', s.cls)}>
          <Icon className="w-3 h-3" aria-hidden />
          {s.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-700 tabular-nums">{formatCurrency(c.spend)}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-500 tabular-nums">{c.impressions.toLocaleString('es-CL')}</td>
      <td className="px-4 py-3 text-right text-sm text-slate-500 tabular-nums">{c.clicks.toLocaleString('es-CL')}</td>
      <td className="px-4 py-3 text-right text-sm tabular-nums">
        <span className={cn(
          'font-medium',
          c.ctr * 100 >= 1 ? 'text-emerald-600' : c.ctr > 0 ? 'text-amber-600' : 'text-slate-400',
        )}>
          {formatPercent(c.ctr * 100)}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm text-slate-700 tabular-nums">{formatCurrency(c.cpc)}</td>
      <td className="px-4 py-3 text-right text-sm font-medium text-slate-700 tabular-nums">{c.conversions.toFixed(1)}</td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Connect form
// ---------------------------------------------------------------------------

function ConnectForm({ onConnect }: { onConnect: (advertiserId: string) => void }) {
  const [advertiserId, setAdvertiserId] = useState('')

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md mx-auto text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center mx-auto">
        {/* TikTok logo mark */}
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.27 8.27 0 004.84 1.54V7.04a4.85 4.85 0 01-1.07-.35z"/>
        </svg>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900">Conectar TikTok Ads</h3>
        <p className="text-sm text-slate-500 mt-1">
          Ingresa tu Advertiser ID de TikTok Business y autoriza el acceso.
        </p>
      </div>

      <div className="text-left space-y-1.5">
        <label className="text-xs font-semibold text-slate-600">Advertiser ID</label>
        <input
          type="text"
          value={advertiserId}
          onChange={(e) => setAdvertiserId(e.target.value.trim())}
          placeholder="ej. 7123456789012345678"
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        <p className="text-xs text-slate-400">Encuéntralo en TikTok Ads Manager → Cuenta → Detalles</p>
      </div>

      <a
        href={advertiserId
          ? `${BACKEND_URL}/api/v1/tiktok-ads/oauth/init?advertiserId=${encodeURIComponent(advertiserId)}`
          : '#'}
        className={cn(
          'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors',
          advertiserId ? 'bg-black hover:bg-gray-800' : 'bg-gray-300 cursor-not-allowed pointer-events-none',
        )}
        onClick={() => { if (advertiserId) onConnect(advertiserId) }}
      >
        <Link2 className="w-4 h-4" />
        Conectar con TikTok
      </a>

      <p className="text-xs text-slate-400">
        Necesitas una cuenta de <strong>TikTok Business Center</strong> y una app aprobada con permisos de{' '}
        <code className="bg-slate-100 px-1 rounded">campaign.read</code> y{' '}
        <code className="bg-slate-100 px-1 rounded">report.read</code>.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function TikTokAdsPanel() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''

  const [tiktokAccount, setTiktokAccount] = useState<AdsAccount | null>(null)
  const [campaigns, setCampaigns]         = useState<TikTokCampaign[]>([])
  const [warning, setWarning]             = useState<string | null>(null)
  const [isLoading, setIsLoading]         = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  // Check if there's already a connected TikTok account
  useEffect(() => {
    if (!token) return
    getAdsAccounts(token)
      .then((accounts) => {
        const tt = accounts.find((a) => a.platform === 'tiktok' && a.status === 'active')
        setTiktokAccount(tt ?? null)
        if (tt) loadCampaigns(tt.externalAccountId, tt.id)
        else setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle success redirect from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tt_success') && params.get('advertiser')) {
      // Reload accounts after successful connect
      if (token) {
        getAdsAccounts(token).then((accounts) => {
          const tt = accounts.find((a) => a.platform === 'tiktok')
          if (tt) {
            setTiktokAccount(tt)
            loadCampaigns(tt.externalAccountId, tt.id)
          }
        })
      }
    }
    if (params.get('tt_error')) {
      setError(`Error de conexión: ${decodeURIComponent(params.get('tt_error') ?? '')}`)
      setIsLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCampaigns = async (advertiserId: string, accountId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getTikTokCampaigns(advertiserId, token, accountId)
      setCampaigns(data.campaigns)
      setWarning(data.warning ?? null)
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar campañas TikTok')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Not connected ──────────────────────────────────────────────────────────

  if (!tiktokAccount && !isLoading) {
    return (
      <div className="py-8">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <ConnectForm onConnect={() => {}} />
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando campañas TikTok…
      </div>
    )
  }

  // ── Connected — show data ──────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Account header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.27 8.27 0 004.84 1.54V7.04a4.85 4.85 0 01-1.07-.35z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{tiktokAccount?.name}</p>
            <p className="text-xs text-slate-400">Advertiser {tiktokAccount?.externalAccountId}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Conectado
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => tiktokAccount && loadCampaigns(tiktokAccount.externalAccountId, tiktokAccount.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          <a
            href="https://ads.tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            TikTok Ads Manager
          </a>
        </div>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {warning}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI strip */}
      {campaigns.length > 0 && <KpiStrip campaigns={campaigns} />}

      {/* Campaign table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
            Sin campañas activas en esta cuenta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-left">Campaña</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Gasto</th>
                  <th className="px-4 py-3 text-right">Impresiones</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">CTR</th>
                  <th className="px-4 py-3 text-right">CPC</th>
                  <th className="px-4 py-3 text-right">Conversiones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => <CampaignRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

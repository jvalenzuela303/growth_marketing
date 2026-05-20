'use client'

/**
 * Ads overview page — Meta Ads + Google Ads en una sola pantalla.
 * Soporta múltiples cuentas de ads por tenant con selector de cuenta.
 *
 * CRO Impact: Single-screen visibility into ad performance eliminates the
 * need to context-switch to each ad platform — operators can act on
 * underperforming campaigns in seconds instead of minutes.
 */

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, DollarSign, TrendingUp, Users, BarChart2, Loader2 } from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import {
  getAdsAccounts,
  createAdsAccount,
  deleteAdsAccount,
  updateAdsAccount,
  syncAdsAccount,
  getAdCampaigns,
  createAdSpend,
  getFinancialKpis,
  exportAudience,
  getLeads,
} from '@/lib/api'
import type {
  AdsAccount,
  CreateAdsAccountInput,
  AdCampaign,
  FinancialKpis,
  AudienceExport,
  AdSpendInput,
} from '@/lib/api'
import { CampaignTable } from '@/components/ads/CampaignTable'
import { LookalikeAudiencePanel } from '@/components/ads/LookalikeAudiencePanel'
import { AdSpendForm } from '@/components/ads/AdSpendForm'
import { GoogleAdsPanel } from '@/components/ads/GoogleAdsPanel'
import { TikTokAdsPanel } from '@/components/ads/TikTokAdsPanel'
import { AdAccountSelector } from '@/components/ads/AdAccountSelector'
import { ManageAdAccountsModal } from '@/components/ads/ManageAdAccountsModal'
import { BudgetOptimizerPanel } from '@/components/ads/BudgetOptimizerPanel'
import { ConversionAiAdvisor } from '@/components/ads/ConversionAiAdvisor'

type AdPlatform = 'meta' | 'google' | 'tiktok'

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon:    React.ComponentType<{ className?: string }>
  label:   string
  value:   string
  trend?:  number
  sub?:    string
  color:   'green' | 'amber' | 'red' | 'blue' | 'purple'
}

function KpiCard({ icon: Icon, label, value, trend, sub, color }: KpiCardProps) {
  const colorMap = {
    green:  { icon: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'text-emerald-600' },
    amber:  { icon: 'text-amber-600',   bg: 'bg-amber-50',   trend: 'text-amber-600' },
    red:    { icon: 'text-red-600',     bg: 'bg-red-50',     trend: 'text-red-600' },
    blue:   { icon: 'text-blue-600',    bg: 'bg-blue-50',    trend: 'text-blue-600' },
    purple: { icon: 'text-brand-600',   bg: 'bg-brand-50',   trend: 'text-brand-600' },
  }
  const c = colorMap[color]

  return (
    <div className="kpi-card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 truncate">{label}</p>
          <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
        </div>
        <div className={cn('flex-shrink-0 p-2 rounded-xl', c.bg)}>
          <Icon className={cn('w-5 h-5', c.icon)} aria-hidden />
        </div>
      </div>
      {(sub || trend !== undefined) && (
        <div className="flex items-center justify-between text-xs">
          {trend !== undefined && (
            <span className={cn('font-semibold flex items-center gap-1', c.trend)}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs mes anterior
            </span>
          )}
          {sub && <span className="text-slate-400">{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdsPage() {
  const { data: session } = useSession()

  const [platform, setPlatform]             = useState<AdPlatform>('meta')
  const [accounts, setAccounts]             = useState<AdsAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [campaigns, setCampaigns]           = useState<AdCampaign[]>([])
  const [kpis, setKpis]                     = useState<FinancialKpis | null>(null)
  const [exports, setExports]               = useState<AudienceExport[]>([])
  const [leadCounts, setLeadCounts]         = useState<Record<string, number>>({ fuego: 0, caliente: 0 })
  const [isSyncingId, setIsSyncingId]       = useState<string | null>(null)
  const [isLoading, setIsLoading]           = useState(true)
  const [showSpendForm, setShowSpendForm]   = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)

  const token = session?.accessToken ?? ''

  // ── Load accounts ──────────────────────────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    if (!token) return
    const list = await getAdsAccounts(token)
    setAccounts(list)

    // Keep selection valid; prefer default account on first load
    setSelectedAccountId((prev) => {
      if (prev && list.some((a) => a.id === prev)) return prev
      return list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? null
    })
  }, [token])

  // ── Load campaigns & KPIs for selected account ─────────────────────────────

  const loadData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    try {
      const [campaignData, kpiData, fuegoLeads, calienteLeads] = await Promise.allSettled([
        getAdCampaigns(token, selectedAccountId ?? undefined),
        getFinancialKpis(token),
        getLeads(session?.user?.tenantId ?? '', { segment: 'fuego', pageSize: 1 }, token),
        getLeads(session?.user?.tenantId ?? '', { segment: 'caliente', pageSize: 1 }, token),
      ])

      if (campaignData.status === 'fulfilled') setCampaigns(campaignData.value)
      if (kpiData.status === 'fulfilled')      setKpis(kpiData.value)
      setLeadCounts({
        fuego:    fuegoLeads.status    === 'fulfilled' ? fuegoLeads.value.meta.total    : 0,
        caliente: calienteLeads.status === 'fulfilled' ? calienteLeads.value.meta.total : 0,
      })
    } finally {
      setIsLoading(false)
    }
  }, [token, selectedAccountId, session?.user?.tenantId])

  // Initial load
  useEffect(() => {
    if (token) loadAccounts()
  }, [token, loadAccounts])

  // Reload campaigns when account changes
  useEffect(() => {
    if (token) loadData()
  }, [token, selectedAccountId, loadData])

  // ── Sync single account ────────────────────────────────────────────────────

  async function handleSync(accountId: string) {
    if (!token) return
    setIsSyncingId(accountId)
    try {
      await syncAdsAccount(accountId, token)
      await loadAccounts()
      await loadData()
    } finally {
      setIsSyncingId(null)
    }
  }

  // ── Toggle campaign status ─────────────────────────────────────────────────

  async function handleToggleStatus(campaignId: string, currentStatus: string) {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? { ...c, status: currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }
          : c,
      ),
    )
  }

  // ── Audience export ────────────────────────────────────────────────────────

  async function handleExportAudience(segment: 'fuego' | 'caliente') {
    if (!token) return
    const result = await exportAudience({ segment, type: 'lookalike' }, token)
    const newExport: AudienceExport = {
      id:        result.exportId,
      segment,
      status:    'pending',
      leadCount: leadCounts[segment] ?? 0,
      createdAt: new Date().toISOString(),
    }
    setExports((prev) => [newExport, ...prev])
  }

  // ── Ad spend ───────────────────────────────────────────────────────────────

  async function handleAddSpend(data: AdSpendInput) {
    if (!token) return
    await createAdSpend(data, token)
    await loadData()
  }

  // ── Account management callbacks ───────────────────────────────────────────

  async function handleCreateAccount(data: CreateAdsAccountInput) {
    await createAdsAccount(data, token)
    await loadAccounts()
  }

  async function handleDeleteAccount(id: string) {
    await deleteAdsAccount(id, token)
    if (selectedAccountId === id) setSelectedAccountId(null)
    await loadAccounts()
  }

  async function handleSetDefaultAccount(id: string) {
    await updateAdsAccount(id, { isDefault: true }, token)
    await loadAccounts()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Publicidad</h1>
          <p className="text-sm text-slate-500 mt-0.5">Inversión y rendimiento de campañas por plataforma</p>
        </div>
        {platform === 'meta' && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Account selector */}
            <AdAccountSelector
              accounts={accounts.filter((a) => a.platform === 'meta')}
              selectedId={selectedAccountId}
              onSelect={(acc) => setSelectedAccountId(acc.id)}
              onSync={handleSync}
              onManageAccounts={() => setShowManageModal(true)}
              isSyncingId={isSyncingId}
            />

            <button
              onClick={() => setShowSpendForm(true)}
              className={cn(
                'flex items-center gap-1.5 min-h-[40px] px-4 rounded-xl',
                'border border-slate-200 text-sm font-semibold text-slate-700',
                'hover:bg-slate-50 transition-colors',
              )}
            >
              <Plus className="w-4 h-4" aria-hidden />
              Registrar gasto
            </button>
          </div>
        )}
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {([
          { id: 'meta',    label: 'Meta Ads',    logo: 'M', logoClass: 'bg-blue-600 text-white' },
          { id: 'google',  label: 'Google Ads',  logo: 'G', logoClass: 'bg-white border border-slate-200 text-blue-500 shadow-sm' },
          { id: 'tiktok',  label: 'TikTok Ads',  logo: '♪', logoClass: 'bg-black text-white' },
        ] as { id: AdPlatform; label: string; logo: string; logoClass: string }[]).map(({ id, label, logo, logoClass }) => (
          <button
            key={id}
            onClick={() => setPlatform(id)}
            className={cn(
              'flex items-center gap-2 min-h-[36px] px-4 rounded-lg text-sm font-semibold transition-all duration-150',
              platform === id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <span className={cn('w-5 h-5 rounded-md flex items-center justify-center text-xs font-extrabold', logoClass)}>
              {logo}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Meta Ads content */}
      {platform === 'meta' && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={DollarSign}
              label="Inversión total"
              value={isLoading ? '—' : formatCurrency(kpis?.totalSpend ?? 0)}
              color="blue"
              sub="este período"
            />
            <KpiCard
              icon={Users}
              label="Costo por Lead"
              value={isLoading ? '—' : formatCurrency(kpis?.cpl ?? 0)}
              trend={kpis?.cplTrend}
              color={!kpis ? 'blue' : kpis.cpl <= (kpis.cplTarget ?? Infinity) ? 'green' : 'red'}
            />
            <KpiCard
              icon={TrendingUp}
              label="CAC"
              value={isLoading ? '—' : formatCurrency(kpis?.cac ?? 0)}
              trend={kpis?.cacTrend}
              color={!kpis ? 'blue' : kpis.cac <= (kpis.cacTarget ?? Infinity) ? 'green' : 'amber'}
            />
            <KpiCard
              icon={BarChart2}
              label="CTR promedio"
              value={isLoading ? '—' : formatPercent(kpis?.avgCtr ?? 0)}
              color={!kpis ? 'blue' : (kpis.avgCtr ?? 0) >= 2 ? 'green' : (kpis.avgCtr ?? 0) >= 1 ? 'amber' : 'red'}
              sub="todas las campañas"
            />
          </div>

          {/* Account empty state */}
          {accounts.filter((a) => a.platform === 'meta').length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-extrabold text-blue-600">M</span>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Sin cuentas de Meta Ads</h3>
              <p className="text-sm text-slate-500 mb-4 max-w-xs">
                Conecta tu primera cuenta de Meta Ads para ver y gestionar tus campañas desde aquí.
              </p>
              <button
                onClick={() => setShowManageModal(true)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl',
                  'bg-gradient-brand text-white text-sm font-semibold',
                  'hover:opacity-90 transition-all shadow-card',
                )}
              >
                <Plus className="w-4 h-4" aria-hidden />
                Conectar cuenta
              </button>
            </div>
          )}

          {/* Main content: table + sidebar */}
          {accounts.filter((a) => a.platform === 'meta').length > 0 && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 kpi-card overflow-hidden">
                <h2 className="text-base font-bold text-slate-800 mb-4">Campañas activas</h2>
                <CampaignTable
                  campaigns={campaigns}
                  isLoading={isLoading}
                  onToggleStatus={handleToggleStatus}
                />
              </div>

              <div className="lg:w-80 flex-shrink-0">
                <LookalikeAudiencePanel
                  onExport={handleExportAudience}
                  exportHistory={exports}
                  isLoading={isLoading}
                  leadCounts={leadCounts as Record<'fuego' | 'caliente', number>}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Google Ads content */}
      {platform === 'google' && <GoogleAdsPanel />}
      {platform === 'tiktok' && <TikTokAdsPanel />}

      {/* AI Conversion Advisor */}
      <ConversionAiAdvisor />

      {/* Budget optimizer */}
      <BudgetOptimizerPanel />

      {/* Ad spend form */}
      <AdSpendForm
        isOpen={showSpendForm}
        onClose={() => setShowSpendForm(false)}
        onSubmit={handleAddSpend}
      />

      {/* Manage accounts modal */}
      {showManageModal && (
        <ManageAdAccountsModal
          accounts={accounts}
          onClose={() => setShowManageModal(false)}
          onCreate={handleCreateAccount}
          onDelete={handleDeleteAccount}
          onSetDefault={handleSetDefaultAccount}
        />
      )}
    </div>
  )
}

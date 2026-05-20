'use client'

/**
 * CampaignTable — shows ad campaigns with status, spend, and performance metrics.
 *
 * CRO Impact: Inline status toggle enables instant pausing of under-performing
 * campaigns, protecting budget and maintaining blended ROAS targets.
 */

import { useState } from 'react'
import { Pause, Play, Loader2 } from 'lucide-react'
import { cn, formatCurrency, formatPercent } from '@/lib/utils'
import type { AdCampaign } from '@/lib/api'

interface CampaignTableProps {
  campaigns:     AdCampaign[]
  isLoading:     boolean
  onToggleStatus: (campaignId: string, currentStatus: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
      isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        isActive ? 'bg-emerald-500 animate-pulse-slow' : 'bg-amber-500',
      )} />
      {isActive ? 'Activa' : 'Pausada'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <tbody className="divide-y divide-slate-50">
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="skeleton h-4 rounded-full" style={{ width: `${50 + (j + i) % 3 * 20}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------

export function CampaignTable({ campaigns, isLoading, onToggleStatus }: CampaignTableProps) {
  const [toggling, setToggling] = useState<string | null>(null)

  async function handleToggle(campaign: AdCampaign) {
    setToggling(campaign.id)
    try {
      await onToggleStatus(campaign.id, campaign.status)
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-slate-100">
            {['Campaña', 'Estado', 'Inversión', 'Impresiones', 'Clicks', 'CTR', 'Leads', 'Acción'].map((h) => (
              <th
                key={h}
                className="px-4 pb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        {isLoading ? (
          <TableSkeleton />
        ) : campaigns.length === 0 ? (
          <tbody>
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">
                Sin campañas. Sincroniza tu cuenta de Meta Ads para ver datos.
              </td>
            </tr>
          </tbody>
        ) : (
          <tbody className="divide-y divide-slate-50">
            {campaigns.map((c) => {
              const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0
              return (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 max-w-[160px] truncate" title={c.name}>
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.source}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 tabular-nums font-semibold text-slate-800">
                    {formatCurrency(c.spend)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {c.impressions.toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {c.clicks.toLocaleString('es-CL')}
                  </td>
                  <td className={cn(
                    'px-4 py-3 tabular-nums font-semibold',
                    ctr >= 2 ? 'text-emerald-600' : ctr >= 1 ? 'text-amber-600' : 'text-red-600',
                  )}>
                    {formatPercent(ctr)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">
                    {c.leads.toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(c)}
                      disabled={toggling === c.id}
                      aria-label={c.status === 'ACTIVE' ? 'Pausar campaña' : 'Activar campaña'}
                      className={cn(
                        'flex items-center gap-1.5 min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors',
                        c.status === 'ACTIVE'
                          ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {toggling === c.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                      ) : c.status === 'ACTIVE' ? (
                        <><Pause className="w-3.5 h-3.5" aria-hidden /> Pausar</>
                      ) : (
                        <><Play className="w-3.5 h-3.5" aria-hidden /> Activar</>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        )}
      </table>
    </div>
  )
}

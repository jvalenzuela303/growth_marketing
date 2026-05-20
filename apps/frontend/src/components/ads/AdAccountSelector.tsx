'use client'

/**
 * AdAccountSelector — dropdown that lets operators switch between connected
 * ads accounts without leaving the Ads page. Shows platform badge, status
 * indicator, and quick-sync button per account.
 */

import { useState } from 'react'
import { ChevronDown, RefreshCw, CheckCircle2, AlertCircle, PauseCircle, Loader2, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdsAccount } from '@/lib/api'

const PLATFORM_LABELS: Record<string, string> = {
  meta:     'Meta Ads',
  google:   'Google Ads',
  tiktok:   'TikTok Ads',
  linkedin: 'LinkedIn Ads',
}

const PLATFORM_COLORS: Record<string, string> = {
  meta:     'bg-blue-600 text-white',
  google:   'bg-white border border-slate-200 text-blue-500',
  tiktok:   'bg-black text-white',
  linkedin: 'bg-blue-700 text-white',
}

interface StatusProps {
  status: AdsAccount['status']
}

function StatusBadge({ status }: StatusProps) {
  const map = {
    active:       { icon: CheckCircle2, color: 'text-emerald-600', label: 'Activa' },
    paused:       { icon: PauseCircle,  color: 'text-amber-500',   label: 'Pausada' },
    disconnected: { icon: AlertCircle,  color: 'text-slate-400',   label: 'Desconectada' },
    error:        { icon: AlertCircle,  color: 'text-red-500',     label: 'Error' },
  } as const
  const { icon: Icon, color, label } = map[status] ?? map.disconnected
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium', color)}>
      <Icon className="w-3.5 h-3.5" aria-hidden />
      {label}
    </span>
  )
}

interface Props {
  accounts:         AdsAccount[]
  selectedId:       string | null
  onSelect:         (account: AdsAccount) => void
  onSync:           (accountId: string) => Promise<void>
  onManageAccounts: () => void
  isSyncingId:      string | null
}

export function AdAccountSelector({
  accounts,
  selectedId,
  onSelect,
  onSync,
  onManageAccounts,
  isSyncingId,
}: Props) {
  const [open, setOpen] = useState(false)
  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0] ?? null

  if (accounts.length === 0) {
    return (
      <button
        onClick={onManageAccounts}
        className={cn(
          'flex items-center gap-2 min-h-[40px] px-4 rounded-xl',
          'border border-dashed border-slate-300 text-sm font-semibold text-slate-500',
          'hover:border-brand-400 hover:text-brand-600 transition-colors',
        )}
      >
        <PlusCircle className="w-4 h-4" aria-hidden />
        Conectar cuenta de ads
      </button>
    )
  }

  return (
    <div className="relative flex items-center gap-2">
      {/* Account picker */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex items-center gap-2 min-h-[40px] pl-3 pr-2 rounded-xl',
            'border border-slate-200 bg-white text-sm font-semibold text-slate-800',
            'hover:bg-slate-50 transition-colors shadow-sm',
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected && (
            <span className={cn(
              'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-extrabold flex-shrink-0',
              PLATFORM_COLORS[selected.platform],
            )}>
              {selected.platform[0].toUpperCase()}
            </span>
          )}
          <span className="max-w-[160px] truncate">{selected?.name ?? 'Seleccionar cuenta'}</span>
          <ChevronDown className={cn('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>

        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />

            {/* Dropdown */}
            <div
              role="listbox"
              className={cn(
                'absolute left-0 top-full mt-1.5 z-20 w-80',
                'bg-white rounded-2xl border border-slate-200 shadow-xl py-1',
              )}
            >
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  role="option"
                  aria-selected={acc.id === selectedId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 cursor-pointer',
                    'hover:bg-slate-50 transition-colors',
                    acc.id === selectedId && 'bg-brand-50',
                  )}
                  onClick={() => { onSelect(acc); setOpen(false) }}
                >
                  <span className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0',
                    PLATFORM_COLORS[acc.platform],
                  )}>
                    {acc.platform[0].toUpperCase()}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-slate-900 truncate">{acc.name}</p>
                      {acc.isDefault && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-700 leading-none flex-shrink-0">
                          default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{PLATFORM_LABELS[acc.platform]}</span>
                      <span className="text-slate-200">·</span>
                      <StatusBadge status={acc.status} />
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 flex-shrink-0">{acc.campaignCount} campañas</span>
                </div>
              ))}

              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => { onManageAccounts(); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 font-semibold hover:bg-brand-50 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden />
                  Administrar cuentas
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Per-account sync button */}
      {selected && (
        <button
          onClick={() => onSync(selected.id)}
          disabled={isSyncingId === selected.id}
          title={`Sincronizar ${selected.name}`}
          className={cn(
            'flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl',
            'border border-slate-200 bg-white text-sm font-semibold text-slate-700',
            'hover:bg-slate-50 transition-colors shadow-sm',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSyncingId === selected.id ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden />
          )}
          <span className="hidden sm:inline">Sincronizar</span>
        </button>
      )}
    </div>
  )
}

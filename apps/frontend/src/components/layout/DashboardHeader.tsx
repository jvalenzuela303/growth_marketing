'use client'

import { Bell, LogOut, Building2 } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

interface DashboardHeaderProps {
  userName:   string
  userEmail?: string
  tenantName: string
  plan:       string
}

const PLAN_BADGE: Record<string, { label: string; className: string }> = {
  starter: { label: 'Starter', className: 'bg-slate-100 text-slate-500' },
  growth:  { label: 'Growth',  className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  scale:   { label: 'Scale',   className: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200' },
  agency:  { label: 'Agency',  className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
}

export function DashboardHeader({
  userName,
  userEmail,
  tenantName,
  plan,
}: DashboardHeaderProps) {
  const initials = userName
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')

  const badge = PLAN_BADGE[plan] ?? PLAN_BADGE.starter

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-white border-b border-slate-100 safe-top">

      {/* Left: workspace context */}
      <div className="flex items-center gap-2 min-w-0">
        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
        <p className="text-sm font-semibold text-slate-700 truncate">{tenantName}</p>
        <span className={cn(
          'hidden xs:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
          badge.className,
        )}>
          {badge.label}
        </span>
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <button
          aria-label="Ver notificaciones"
          className={cn(
            'relative flex items-center justify-center w-9 h-9 rounded-xl',
            'text-slate-400 hover:bg-slate-50 hover:text-slate-700',
            'transition-colors duration-150',
          )}
        >
          <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" aria-hidden />
          <span aria-hidden className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-accent-500" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-100 mx-1" aria-hidden />

        {/* User section */}
        <div className="flex items-center gap-2">
          <div
            aria-hidden
            className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          >
            {initials || '?'}
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate max-w-[120px] leading-tight">
              {userName}
            </p>
            {userEmail && (
              <p className="text-[11px] text-slate-400 truncate max-w-[120px] leading-tight">
                {userEmail}
              </p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="Cerrar sesión"
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg ml-1',
              'text-slate-400 hover:text-slate-700 hover:bg-slate-50',
              'transition-colors duration-150',
            )}
          >
            <LogOut className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}

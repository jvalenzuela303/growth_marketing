'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { PLAN_LABELS, PLAN_BORDER_COLORS, PLAN_ICON_COLORS } from '@/lib/permissions'
import { cn } from '@/lib/utils'

interface UpgradePromptProps {
  requiredPlan: 'starter' | 'growth' | 'scale' | 'agency'
  featureName?: string
  className?:   string
}

export function UpgradePrompt({ requiredPlan, featureName, className }: UpgradePromptProps) {
  const planLabel    = PLAN_LABELS[requiredPlan] ?? requiredPlan
  const borderColor  = PLAN_BORDER_COLORS[requiredPlan] ?? 'border-slate-200'
  const iconColor    = PLAN_ICON_COLORS[requiredPlan] ?? 'text-slate-500'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-slate-50 px-6 py-10 text-center',
        borderColor,
        className,
      )}
      role="status"
      aria-label={`Funcion disponible en plan ${planLabel}`}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl border bg-white shadow-sm',
          borderColor,
        )}
      >
        <Lock className={cn('h-5 w-5', iconColor)} aria-hidden />
      </div>

      <div className="space-y-1 max-w-xs">
        <p className="text-sm font-bold text-slate-800">
          Esta funcion requiere el plan{' '}
          <span className="font-extrabold uppercase tracking-wide">{planLabel}</span>
        </p>
        {featureName && (
          <p className="text-xs text-slate-500">
            Actualiza tu plan para desbloquear {featureName}
          </p>
        )}
        {!featureName && (
          <p className="text-xs text-slate-500">
            Actualiza tu plan para acceder a esta funcionalidad
          </p>
        )}
      </div>

      <Link
        href="/billing"
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        Actualizar Plan
      </Link>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { PLAN_LABELS, PLAN_COLORS } from '@/lib/permissions'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'

interface PlanBadgeProps {
  /** Override the plan displayed. Defaults to the current session plan. */
  plan?:        string
  showUpgrade?: boolean
  className?:   string
  /** Collapsed sidebar mode: only renders a small colored dot */
  compact?:     boolean
}

export function PlanBadge({ plan: planProp, showUpgrade = true, className, compact = false }: PlanBadgeProps) {
  const { plan: sessionPlan } = usePermissions()
  const plan       = planProp ?? sessionPlan
  const planLabel  = PLAN_LABELS[plan] ?? plan
  const colorClass = PLAN_COLORS[plan] ?? PLAN_COLORS.starter

  // In compact (collapsed sidebar) mode render only the colored dot
  if (compact) {
    return (
      <span
        className={cn(
          'inline-flex h-2 w-2 rounded-full flex-shrink-0',
          plan === 'starter' ? 'bg-gray-400'   :
          plan === 'growth'  ? 'bg-blue-500'   :
          plan === 'scale'   ? 'bg-purple-500' :
                               'bg-amber-500',
          className,
        )}
        aria-label={`Plan ${planLabel}`}
        title={`Plan ${planLabel}`}
      />
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide',
          colorClass,
        )}
      >
        {planLabel}
      </span>

      {showUpgrade && plan !== 'agency' && (
        <Link
          href="/billing"
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-600 hover:text-brand-800 transition-colors focus-visible:outline-none focus-visible:underline"
          aria-label="Ir a facturacion para actualizar el plan"
        >
          Mejorar
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
      )}
    </div>
  )
}

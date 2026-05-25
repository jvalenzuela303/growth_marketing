'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  getAdminBillingPlans,
  getAdminBillingStats,
  AdminPlan,
  AdminBillingStats,
} from '@/lib/api'
import {
  Users,
  DollarSign,
  TrendingUp,
  Zap,
  Rocket,
  Building2,
  Loader2,
} from 'lucide-react'

// ── constants ──────────────────────────────────────────────────────────────────

const PLAN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  starter: Zap,
  growth:  Rocket,
  scale:   Zap,
  agency:  Building2,
}

const PLAN_COLORS: Record<string, { border: string; bg: string; badge: string; heading: string }> = {
  starter: { border: 'border-gray-200',   bg: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-700',   heading: 'text-gray-700'   },
  growth:  { border: 'border-blue-200',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   heading: 'text-blue-700'   },
  scale:   { border: 'border-purple-300', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', heading: 'text-purple-700' },
  agency:  { border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', heading: 'text-orange-700' },
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { data: session, status } = useSession()
  const token   = (session as any)?.accessToken as string | undefined
  const isReady = status === 'authenticated' && !!token

  const { data: plans = [], isLoading: loadingPlans } = useQuery<AdminPlan[]>({
    queryKey: ['admin-billing-plans'],
    queryFn:  () => getAdminBillingPlans(token!),
    enabled:  isReady,
  })

  const { data: stats } = useQuery<AdminBillingStats>({
    queryKey: ['admin-billing-stats'],
    queryFn:  () => getAdminBillingStats(token!),
    enabled:  isReady,
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-900">Planes</h1>
        <p className="text-gray-500 mt-1">Configuración de planes y estado de Stripe Price IDs.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total workspaces"
          value={stats?.totalTenants ?? '—'}
          icon={Users}
          color="indigo"
        />
        <StatCard
          label="Workspaces de pago"
          value={stats?.paidTenants ?? '—'}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="MRR estimado"
          value={stats ? `$${stats.mrr.toLocaleString()} USD` : '—'}
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Plan cards */}
      {loadingPlans ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const colors = PLAN_COLORS[plan.key] ?? PLAN_COLORS.starter
            const Icon   = PLAN_ICONS[plan.key]  ?? Zap

            return (
              <div
                key={plan.key}
                className={`rounded-xl border-2 p-5 flex flex-col gap-4 ${colors.border} ${colors.bg}`}
              >
                {/* Label + price */}
                <div>
                  <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${colors.badge}`}>
                    <Icon className="w-3.5 h-3.5" />
                    {plan.label}
                  </div>
                  <p className={`text-2xl font-bold ${colors.heading}`}>{plan.price}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {plan.monthlyUsd > 0 ? `$${plan.monthlyUsd} USD/mes` : 'Plan gratuito'}
                  </p>
                </div>

                {/* Limits */}
                <div className="space-y-1.5 text-sm text-gray-700">
                  <LimitRow label="Funnels"       value={plan.maxFunnels} />
                  <LimitRow label="Leads/mes"     value={plan.maxLeadsPerMonth.toLocaleString()} />
                  <LimitRow label="WhatsApp/mes"  value={plan.maxWhatsappMessages.toLocaleString()} />
                </div>

                {/* Workspace count */}
                <div className="flex items-center justify-between text-sm border-t border-black/5 pt-3">
                  <span className="text-gray-500">Workspaces</span>
                  <span className="font-bold text-gray-900">{plan.tenantCount}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'indigo' | 'green' | 'purple'
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function LimitRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

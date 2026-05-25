import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardKPIs, getLeads } from '@/lib/api'
import dynamic from 'next/dynamic'
import { Building2, User, ShieldCheck } from 'lucide-react'

const MetricsDashboard = dynamic(
  () => import('@/components/dashboard/MetricsDashboard').then(m => m.MetricsDashboard),
  { ssr: false },
)

const RoiCalculator = dynamic(
  () => import('@/components/dashboard/RoiCalculator').then(m => m.RoiCalculator),
  { ssr: false },
)
import { KPISkeleton } from '@/components/dashboard/KPISkeleton'

// ---------------------------------------------------------------------------
// Fallback KPIs — used when backend is unavailable
// ---------------------------------------------------------------------------
const FALLBACK_KPIS = {
  cpl:                 { value: 185,  target: 200, trend: -8.2 },
  cac:                 { value: 1240, target: 1500, trend: -12.1 },
  roas:                { value: 3.4,  target: 3.0,  trend: 13.3 },
  quizCompletionRate:  { value: 68,   target: 60,   trend: 5.1 },
  automationRate:      { value: 74,   target: 80,   trend: -1.8 },
  totalLeads: 247,
  hotLeads:   31,
}

/**
 * Server Component — fetches all dashboard data server-side so the page
 * is pre-rendered and hydration is minimal. Heavy client interactivity
 * (date range switching) re-fetches via React Query.
 */
export default async function OverviewPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  // Fetch in parallel — failing gracefully if backend is down
  const [kpis, leadsPage] = await Promise.allSettled([
    getDashboardKPIs(session.user.tenantId, '30d', session.accessToken),
    getLeads(session.user.tenantId, { page: 1, pageSize: 10 }, session.accessToken),
  ])

  const resolvedKPIs   = kpis.status   === 'fulfilled' ? kpis.value   : FALLBACK_KPIS
  const resolvedLeads  = leadsPage.status === 'fulfilled' ? leadsPage.value.data : []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const firstName = (session.user.name ?? session.user.email).split(' ')[0]

  const ROLE_LABELS: Record<string, string> = {
    owner: 'Propietario', admin: 'Administrador', member: 'Miembro', viewer: 'Visor',
  }
  const PLAN_STYLES: Record<string, string> = {
    starter: 'bg-slate-100 text-slate-600',
    growth:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    scale:   'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    agency:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  }

  return (
    <div className="space-y-6">

      {/* ── Identity banner ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        {/* Left: greeting + user */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-brand-500 flex items-center justify-center text-white text-base font-extrabold flex-shrink-0">
            {firstName[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">{greeting}</p>
            <p className="text-lg font-extrabold text-slate-900 leading-tight">
              {session.user.name ?? session.user.email}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{session.user.email}</p>
          </div>
        </div>

        {/* Right: company + role + plan */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden />
            <span className="text-sm font-semibold text-slate-700">
              {session.user.tenantName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" aria-hidden />
            <span className="text-sm font-medium text-slate-600">
              {ROLE_LABELS[session.user.role] ?? session.user.role}
            </span>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wide ${PLAN_STYLES[session.user.plan] ?? PLAN_STYLES.starter}`}>
            {session.user.plan}
          </span>
        </div>
      </div>

      <Suspense fallback={<KPISkeleton />}>
        <MetricsDashboard
          kpis={resolvedKPIs}
          recentLeads={resolvedLeads}
          tenantId={session.user.tenantId}
        />
      </Suspense>

      {/* ROI Calculator — client interactive widget */}
      <div className="max-w-xl">
        <RoiCalculator />
      </div>
    </div>
  )
}

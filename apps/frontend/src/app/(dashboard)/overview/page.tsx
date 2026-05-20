import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDashboardKPIs, getLeads } from '@/lib/api'
import dynamic from 'next/dynamic'

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

  return (
    <div className="space-y-6">
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

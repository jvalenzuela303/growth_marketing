import { cn } from '@/lib/utils'

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={cn('skeleton rounded-xl', className)}
      role="status"
      aria-label="Cargando..."
    />
  )
}

/**
 * Skeleton placeholder for the MetricsDashboard while server data loads.
 * Matches the exact layout of the real dashboard to prevent layout shift.
 */
export function KPISkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando métricas del dashboard">
      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBox className="h-6 w-40" />
          <SkeletonBox className="h-4 w-56" />
        </div>
        <SkeletonBox className="h-9 w-52 rounded-xl" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="kpi-card space-y-3">
            <div className="flex justify-between">
              <div className="space-y-2">
                <SkeletonBox className="h-3 w-20" />
                <SkeletonBox className="h-7 w-28" />
              </div>
              <SkeletonBox className="h-10 w-10 rounded-xl" />
            </div>
            <SkeletonBox className="h-3 w-36" />
            <SkeletonBox className="h-1 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <SkeletonBox className="h-60 rounded-2xl" />
        <SkeletonBox className="h-60 rounded-2xl" />
      </div>

      {/* Table */}
      <div className="kpi-card space-y-3">
        <SkeletonBox className="h-5 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBox key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

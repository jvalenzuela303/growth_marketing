import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardSidebar } from '@/components/layout/DashboardSidebar'
import { DashboardHeader } from '@/components/layout/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex">
      {/* Sidebar — hidden on mobile, shown from md breakpoint */}
      <DashboardSidebar
        tenantName={session.user.tenantName}
        tenantSlug={session.user.tenantSlug}
        userRole={session.user.role}
        plan={session.user.plan}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          userName={session.user.name ?? session.user.email}
          userEmail={session.user.email}
          tenantName={session.user.tenantName}
          plan={session.user.plan}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

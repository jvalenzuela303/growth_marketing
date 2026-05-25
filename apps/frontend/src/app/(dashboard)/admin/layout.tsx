'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, ShieldX } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  const role = (session?.user as any)?.role as string | undefined

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/login'); return }
    if (role && role !== 'owner' && role !== 'admin') router.replace('/overview')
  }, [role, status, router])

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (role && role !== 'owner' && role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-gray-400">
        <ShieldX className="w-10 h-10" />
        <p className="font-medium">Acceso restringido a administradores.</p>
      </div>
    )
  }

  return <>{children}</>
}

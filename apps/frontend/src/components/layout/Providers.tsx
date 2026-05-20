'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner'
import { usePushNotifications } from '@/hooks/usePushNotifications'

function PushRegistrar() {
  usePushNotifications()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry:     1,
          },
        },
      }),
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <PushRegistrar />
        {children}
        <PwaInstallBanner />
      </QueryClientProvider>
    </SessionProvider>
  )
}

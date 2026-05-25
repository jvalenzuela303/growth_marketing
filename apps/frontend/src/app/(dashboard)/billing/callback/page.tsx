'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { confirmEnrollment } from '@/lib/api'

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function CallbackInner() {
  const router           = useRouter()
  const params           = useSearchParams()
  const { data: session, status } = useSession()
  const token            = (session as any)?.accessToken as string | undefined
  const calledRef        = useRef(false)

  const tokenWs = params.get('token_ws') ?? params.get('TBK_TOKEN')

  const confirm = useMutation({
    mutationFn: (sessionToken: string) => confirmEnrollment(sessionToken, token!),
  })

  useEffect(() => {
    if (!tokenWs || calledRef.current || status !== 'authenticated' || !token) return
    calledRef.current = true
    confirm.mutate(tokenWs)
  }, [tokenWs, status, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const isPending = confirm.isPending || (!confirm.isSuccess && !confirm.isError && !!tokenWs)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center px-4">
      {!tokenWs ? (
        /* ── Sin token — usuario canceló en Transbank ── */
        <>
          <AlertCircle className="h-16 w-16 text-red-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Inscripción cancelada
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              No se recibió la confirmación de Transbank. Puedes intentarlo nuevamente.
            </p>
          </div>
          <button
            onClick={() => router.push('/billing')}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
        </>
      ) : isPending ? (
        /* ── Procesando ── */
        <>
          <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
          <p className="text-sm font-medium text-gray-600">Inscribiendo tarjeta...</p>
        </>
      ) : confirm.isSuccess ? (
        /* ── Éxito ── */
        <>
          <CheckCircle className="h-16 w-16 text-green-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Tarjeta inscrita correctamente
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Tu tarjeta ha sido registrada como método de pago.
            </p>
          </div>
          <button
            onClick={() => router.push('/billing')}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Ir a Facturación
          </button>
        </>
      ) : (
        /* ── Error ── */
        <>
          <AlertCircle className="h-16 w-16 text-red-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              No se pudo completar la inscripción
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {(confirm.error as any)?.message ?? 'Ocurrió un error al confirmar tu tarjeta.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/billing')}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Volver
          </button>
        </>
      )}
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function BillingCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  )
}

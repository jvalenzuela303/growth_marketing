'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  CreditCard,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
  Lock,
  Clock,
  CalendarClock,
  ExternalLink,
  PlusCircle,
  X,
  CheckCircle,
  Zap,
  Building2,
  Rocket,
} from 'lucide-react'
import {
  getBillingSubscription,
  getBillingInvoices,
  getPaymentMethods,
  startEnrollment,
  detachPaymentMethod,
  createCheckoutSession,
  createPortalSession,
  BillingSubscription,
  BillingInvoice,
  PaymentMethod,
} from '@/lib/api'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtPeriod(start?: string | null, end?: string | null): string {
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

function fmtCurrency(amount: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currency.toUpperCase(),
  }).format(amount)
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid:          'bg-green-100 text-green-700',
  open:          'bg-yellow-100 text-yellow-700',
  draft:         'bg-gray-100  text-gray-500',
  void:          'bg-gray-100  text-gray-400',
  uncollectible: 'bg-red-100   text-red-500',
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  paid:          'Pagada',
  open:          'Pendiente',
  draft:         'Borrador',
  void:          'Anulada',
  uncollectible: 'Incobrable',
}

const BRAND_LABEL: Record<string, string> = {
  visa:       'VISA',
  mastercard: 'Mastercard',
  amex:       'American Express',
  discover:   'Discover',
  jcb:        'JCB',
  unionpay:   'UnionPay',
  diners:     'Diners',
}

// ── Plan definitions (for upgrade section) ───────────────────────────────────

const PLANS = [
  { key: 'starter' as const, label: 'Starter', price: 'Gratis',   color: 'gray',   icon: Zap,       features: ['1 funnel', '500 leads/mes', '500 WhatsApp'] },
  { key: 'growth'  as const, label: 'Growth',  price: '$49/mes',  color: 'blue',   icon: Rocket,    features: ['5 funnels', '2,000 leads/mes', 'Agente AI'], },
  { key: 'scale'   as const, label: 'Scale',   price: '$149/mes', color: 'purple', icon: Zap,       features: ['20 funnels', '10,000 leads/mes', 'Reportes'], highlight: true },
  { key: 'agency'  as const, label: 'Agency',  price: '$399/mes', color: 'orange', icon: Building2, features: ['100 funnels', '50,000 leads/mes', 'Multi-cuenta'] },
]

const colorMap: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  gray:   { border: 'border-gray-200',   bg: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-700',    btn: 'bg-gray-600 hover:bg-gray-700'     },
  blue:   { border: 'border-blue-200',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700'     },
  purple: { border: 'border-purple-300', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
}

// ── SubscriptionBanner ────────────────────────────────────────────────────────

function SubscriptionBanner({ billing }: { billing: BillingSubscription }) {
  const status    = billing.status ?? 'free'
  const trialEnd  = billing.sub?.trialEnd
  const periodEnd = billing.sub?.currentPeriodEnd
  const today     = new Date(); today.setHours(0, 0, 0, 0)

  // TRIAL
  if (status === 'trialing' && trialEnd) {
    const daysLeft = Math.ceil((new Date(trialEnd).getTime() - today.getTime()) / 86_400_000)
    const isUrgent = daysLeft <= 3
    return (
      <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
        isUrgent ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">
            {daysLeft > 0
              ? `Tu plan de prueba termina en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`
              : 'Tu período de prueba ha expirado'}
          </p>
          <p className="text-xs mt-0.5">
            Agrega una tarjeta y elige un plan para continuar usando todas las funciones.
          </p>
        </div>
      </div>
    )
  }

  // PAST_DUE
  if (status === 'past_due') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Pago pendiente — suscripción vencida</p>
          <p className="text-xs mt-0.5">
            El cobro automático falló. Verifica que tu tarjeta esté vigente y con fondos suficientes.
            Se reintentará automáticamente.
          </p>
        </div>
      </div>
    )
  }

  // ACTIVE — próxima renovación en ≤ 7 días
  if (status === 'active' && periodEnd) {
    const daysToRenewal = daysUntil(periodEnd)
    if (daysToRenewal !== null && daysToRenewal <= 7 && daysToRenewal >= 0) {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-indigo-700">
          <CalendarClock className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-sm">
            Tu suscripción se renueva el{' '}
            <span className="font-semibold">
              {new Date(periodEnd).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
            </span>{' '}
            ({daysToRenewal} día{daysToRenewal !== 1 ? 's' : ''}).
          </p>
        </div>
      )
    }
  }

  return null
}

// ── CardSection ───────────────────────────────────────────────────────────────

function CardSection({ token, isReady }: { token: string; isReady: boolean }) {
  const qc = useQueryClient()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const { data: cards = [], isLoading, isError } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods'],
    queryFn:  () => getPaymentMethods(token),
    enabled:  isReady,
    retry:    false,
  })

  const enrollMutation = useMutation({
    mutationFn: () =>
      startEnrollment(`${window.location.origin}/billing/callback`, token),
    onSuccess: ({ redirectUrl }) => {
      window.location.href = redirectUrl
    },
    onError: () => toast.error('No se pudo iniciar la inscripción. Intenta nuevamente.'),
  })

  const detachMutation = useMutation({
    mutationFn: (cardId: string) => detachPaymentMethod(cardId, token),
    onSuccess: () => {
      toast.success('Tarjeta eliminada')
      setConfirmDeleteId(null)
      qc.invalidateQueries({ queryKey: ['payment-methods'] })
    },
    onError: () => toast.error('No se pudo eliminar la tarjeta'),
  })

  const activeCard = cards.find((c) => c.isDefault) ?? cards[0] ?? null

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Mi tarjeta</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Método de pago para la suscripción de la plataforma
        </p>
      </div>

      <div className="px-6 py-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando tarjeta...
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Error al cargar la información de tarjeta.
          </div>
        ) : !activeCard ? (
          /* ── Empty state ── */
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              No tienes ninguna tarjeta inscrita. Agrega una tarjeta para activar el cobro
              automático de tu suscripción.
            </p>
            <button
              onClick={() => enrollMutation.mutate()}
              disabled={!isReady || enrollMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {enrollMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CreditCard className="h-4 w-4" />}
              Inscribir tarjeta
            </button>
          </div>
        ) : (
          /* ── Card on file ── */
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
                <CreditCard className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 tracking-widest">
                  •••• •••• •••• {activeCard.last4}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeCard.brand}
                  {' · '}
                  {activeCard.cardType === 'CREDIT' ? 'Crédito' : 'Débito'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => enrollMutation.mutate()}
                disabled={!isReady || enrollMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {enrollMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <PlusCircle className="h-3.5 w-3.5" />}
                Cambiar
              </button>
              <button
                onClick={() => setConfirmDeleteId(activeCard.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
          <Lock className="h-3 w-3 shrink-0" />
          Su tarjeta es procesada de forma segura por Transbank. No almacenamos datos sensibles.
        </p>
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">Eliminar tarjeta</h3>
              <button onClick={() => setConfirmDeleteId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              ¿Estás seguro de que deseas eliminar esta tarjeta? Tu suscripción podría quedar sin
              método de pago activo.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => detachMutation.mutate(confirmDeleteId)}
                disabled={detachMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {detachMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── InvoicesSection ───────────────────────────────────────────────────────────

function InvoicesSection({ token, isReady }: { token: string; isReady: boolean }) {
  const [page, setPage]         = useState(0)
  const [expandedId, setExpanded] = useState<string | null>(null)

  const { data: invoices = [], isLoading, isError } = useQuery<BillingInvoice[]>({
    queryKey: ['billing-invoices'],
    queryFn:  () => getBillingInvoices(token),
    enabled:  isReady,
  })

  // Client-side pagination (invoices are already limited to 24 by backend)
  const PAGE_SIZE = 10
  const totalPages = Math.ceil(invoices.length / PAGE_SIZE)
  const pageItems  = invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggle(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Historial de facturas</h2>
        <p className="text-sm text-gray-500 mt-0.5">Registro de cobros de tu suscripción</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-gray-300" />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 m-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Error al cargar el historial de facturas.
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <CreditCard className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-sm font-medium text-gray-500">Sin facturas registradas</p>
          <p className="text-xs text-gray-400 mt-1">Las facturas de tu suscripción aparecerán aquí</p>
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase">
                <th className="w-8 px-4 py-3" />
                <th className="px-4 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((inv) => (
                <>
                  <tr
                    key={inv.id}
                    className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggle(inv.id)}
                  >
                    {/* Expand chevron */}
                    <td className="px-4 py-3 text-gray-400">
                      {expandedId === inv.id
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {fmtPeriod(inv.periodStart, inv.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {fmtCurrency(inv.amountPaid > 0 ? inv.amountPaid : inv.amountDue, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </td>
                    {/* Actions — stop propagation so row click doesn't double-toggle */}
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggle(inv.id)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                          aria-label={expandedId === inv.id ? 'Ocultar detalle' : 'Ver detalle'}
                        >
                          {expandedId === inv.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                        {/* Retry — for open/past_due invoices */}
                        {(inv.status === 'open') && (
                          <button
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-amber-300 text-xs text-amber-700 hover:bg-amber-50 transition-colors"
                            onClick={() => window.open(inv.hostedInvoiceUrl ?? '#', '_blank')}
                            title="Ver y pagar en Stripe"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Pagar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded detail row */}
                  {expandedId === inv.id && (
                    <tr key={`${inv.id}-expand`}>
                      <td colSpan={5} className="p-0">
                        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Detalle de factura
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-700 mb-3">
                            <div>
                              <p className="text-gray-400 mb-0.5">ID Stripe</p>
                              <p className="font-mono truncate">{inv.stripeInvoiceId}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-0.5">Total facturado</p>
                              <p className="font-medium">{fmtCurrency(inv.amountDue, inv.currency)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-0.5">Total cobrado</p>
                              <p className="font-medium">{fmtCurrency(inv.amountPaid, inv.currency)}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 mb-0.5">Estado</p>
                              <span className={`rounded-full px-2 py-0.5 font-medium ${INVOICE_STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {inv.hostedInvoiceUrl && (
                              <a
                                href={inv.hostedInvoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver factura en Stripe
                              </a>
                            )}
                            {inv.invoicePdfUrl && (
                              <a
                                href={inv.invoicePdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium underline"
                              >
                                Descargar PDF
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Página {page + 1} de {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── PlanCards (upgrade section) ───────────────────────────────────────────────

function PlanCards({
  currentPlan,
  isReady,
  token,
}: {
  currentPlan: string
  isReady: boolean
  token: string
}) {
  const qc = useQueryClient()
  const [upgrading, setUpgrading] = useState<string | null>(null)

  const checkoutMutation = useMutation({
    mutationFn: (plan: 'growth' | 'scale' | 'agency') => createCheckoutSession(plan, token),
    onSuccess:  ({ url }) => { if (url) window.location.href = url },
    onSettled:  () => setUpgrading(null),
  })

  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(token),
    onSuccess:  ({ url }) => { if (url) window.location.href = url },
  })

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Planes disponibles</h2>
          <p className="text-sm text-gray-500 mt-0.5">Cambia o actualiza tu plan en cualquier momento</p>
        </div>
        <button
          onClick={() => portalMutation.mutate()}
          disabled={!isReady || portalMutation.isPending}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {portalMutation.isPending
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <ExternalLink className="h-3.5 w-3.5" />}
          Portal Stripe
        </button>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const colors    = colorMap[plan.color]
          const isCurrent = plan.key === currentPlan

          return (
            <div
              key={plan.key}
              className={`relative rounded-xl border-2 p-4 flex flex-col gap-3 ${
                isCurrent ? `${colors.border} ${colors.bg}` : 'border-gray-200 bg-white hover:border-gray-300'
              } ${plan.highlight ? 'ring-2 ring-purple-400' : ''}`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  Popular
                </span>
              )}
              <div>
                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} mb-1.5`}>
                  <plan.icon className="w-3.5 h-3.5" />
                  {plan.label}
                </div>
                <p className="text-xl font-bold text-gray-900">{plan.price}</p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className={`text-center text-xs font-medium py-1.5 rounded-lg ${colors.badge}`}>Plan actual</div>
              ) : plan.key === 'starter' ? (
                <div className="text-center text-xs text-gray-400 py-1.5">Plan gratuito</div>
              ) : (
                <button
                  onClick={() => { setUpgrading(plan.key); checkoutMutation.mutate(plan.key as 'growth' | 'scale' | 'agency') }}
                  disabled={!isReady || !!upgrading}
                  className={`w-full py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-50 ${colors.btn}`}
                >
                  {upgrading === plan.key
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    : `Cambiar a ${plan.label}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Inner page (uses useSearchParams) ─────────────────────────────────────────

function BillingPageInner() {
  const { data: session, status } = useSession()
  const token   = (session as any)?.accessToken as string | undefined
  const isReady = status === 'authenticated' && !!token
  const params  = useSearchParams()

  // Handle Stripe checkout return (?success=1 | ?canceled=1)
  useEffect(() => {
    const success  = params.get('success')
    const canceled = params.get('canceled')
    if (success)  toast.success('Suscripción activada correctamente')
    if (canceled) toast.info('Proceso de pago cancelado')
    if (success || canceled) {
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      url.searchParams.delete('canceled')
      window.history.replaceState(null, '', url.toString())
    }
  }, [params])

  const { data: billing, isLoading: loadingSub } = useQuery<BillingSubscription>({
    queryKey: ['billing-subscription'],
    queryFn:  () => getBillingSubscription(token!),
    enabled:  isReady,
  })

  const currentPlan = billing?.plan ?? 'starter'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header — matches gestionClinica layout */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
          <CreditCard className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-500">
            Administra tu método de pago e historial de facturas
          </p>
        </div>
      </div>

      {/* 1. Subscription banner */}
      {!loadingSub && billing && <SubscriptionBanner billing={billing} />}

      {/* 2. Card section */}
      {isReady && token && <CardSection token={token} isReady={isReady} />}

      {/* 3. Plan upgrade */}
      {isReady && token && <PlanCards currentPlan={currentPlan} isReady={isReady} token={token} />}

      {/* 4. Invoice history */}
      {isReady && token && <InvoicesSection token={token} isReady={isReady} />}
    </div>
  )
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <BillingPageInner />
    </Suspense>
  )
}

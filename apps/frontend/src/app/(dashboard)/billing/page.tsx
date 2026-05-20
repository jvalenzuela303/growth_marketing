'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getBillingSubscription,
  getBillingInvoices,
  createCheckoutSession,
  createPortalSession,
  BillingSubscription,
  BillingInvoice,
} from '@/lib/api'
import { CheckCircle, Zap, Building2, Rocket, ExternalLink, Loader2, CreditCard } from 'lucide-react'

// ── Plan definitions ────────────────────────────────────────────────────────

const PLANS = [
  {
    key:   'starter' as const,
    label: 'Starter',
    price: 'Gratis',
    color: 'gray',
    icon:  Zap,
    features: ['1 funnel', '500 leads/mes', '500 mensajes WhatsApp'],
  },
  {
    key:   'growth' as const,
    label: 'Growth',
    price: '$49/mes',
    color: 'blue',
    icon:  Rocket,
    features: ['5 funnels', '2,000 leads/mes', '2,000 mensajes WhatsApp', 'Agente AI proactivo'],
    highlight: false,
  },
  {
    key:   'scale' as const,
    label: 'Scale',
    price: '$149/mes',
    color: 'purple',
    icon:  Zap,
    features: ['20 funnels', '10,000 leads/mes', '10,000 mensajes WhatsApp', 'Reportes exportables'],
    highlight: true,
  },
  {
    key:   'agency' as const,
    label: 'Agency',
    price: '$399/mes',
    color: 'orange',
    icon:  Building2,
    features: ['100 funnels', '50,000 leads/mes', '50,000 mensajes WhatsApp', 'Multi-cuenta'],
    highlight: false,
  },
]

const colorMap: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  gray:   { border: 'border-gray-200', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', btn: 'bg-gray-600 hover:bg-gray-700' },
  blue:   { border: 'border-blue-200', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', btn: 'bg-blue-600 hover:bg-blue-700' },
  purple: { border: 'border-purple-300', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency.toUpperCase(),
  }).format(amount)
}

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active:     'bg-green-100 text-green-700',
    trialing:   'bg-blue-100 text-blue-700',
    past_due:   'bg-yellow-100 text-yellow-700',
    canceled:   'bg-red-100 text-red-700',
    free:       'bg-gray-100 text-gray-600',
    paid:       'bg-green-100 text-green-700',
    open:       'bg-yellow-100 text-yellow-700',
    draft:      'bg-gray-100 text-gray-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [upgrading, setUpgrading] = useState<string | null>(null)

  const { data: billing, isLoading: loadingSub } = useQuery<BillingSubscription>({
    queryKey: ['billing-subscription'],
    queryFn:  () => getBillingSubscription(token!),
    enabled:  !!token,
  })

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<BillingInvoice[]>({
    queryKey: ['billing-invoices'],
    queryFn:  () => getBillingInvoices(token!),
    enabled:  !!token,
  })

  const checkoutMutation = useMutation({
    mutationFn: (plan: 'growth' | 'scale' | 'agency') =>
      createCheckoutSession(plan, token!),
    onSuccess: ({ url }) => {
      if (url) window.location.href = url
    },
    onSettled: () => setUpgrading(null),
  })

  const portalMutation = useMutation({
    mutationFn: () => createPortalSession(token!),
    onSuccess:  ({ url }) => {
      if (url) window.location.href = url
    },
  })

  const currentPlan = billing?.plan ?? 'starter'
  const subStatus   = billing?.status ?? 'free'
  const limits      = billing?.limits

  const handleUpgrade = (plan: 'growth' | 'scale' | 'agency') => {
    setUpgrading(plan)
    checkoutMutation.mutate(plan)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
        <p className="text-gray-500 mt-1">Gestiona tu suscripción y revisa tu historial de pagos.</p>
      </div>

      {/* Current plan banner */}
      {!loadingSub && billing && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Plan actual</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{currentPlan}</p>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${statusBadge(subStatus)}`}>
                {subStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-600">
            {limits && (
              <>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{limits.maxFunnels}</p>
                  <p>Funnels</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{limits.maxLeadsPerMonth.toLocaleString()}</p>
                  <p>Leads/mes</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{limits.maxWhatsappMessages.toLocaleString()}</p>
                  <p>WhatsApp/mes</p>
                </div>
              </>
            )}
          </div>

          {billing.sub?.stripeCustomerId && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {portalMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <ExternalLink className="w-4 h-4" />}
              Gestionar en Stripe
            </button>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Planes disponibles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const colors    = colorMap[plan.color]
            const isCurrent = plan.key === currentPlan
            const isStarter = plan.key === 'starter'

            return (
              <div
                key={plan.key}
                className={`relative rounded-xl border-2 p-5 flex flex-col gap-4 ${
                  isCurrent
                    ? `${colors.border} ${colors.bg}`
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${plan.highlight ? 'ring-2 ring-purple-400' : ''}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                    Popular
                  </span>
                )}

                <div>
                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge} mb-2`}>
                    <plan.icon className="w-3.5 h-3.5" />
                    {plan.label}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{plan.price}</p>
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className={`text-center text-sm font-medium py-2 rounded-lg ${colors.badge}`}>
                    Plan actual
                  </div>
                ) : isStarter ? (
                  <div className="text-center text-sm text-gray-400 py-2">
                    Plan gratuito
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key as 'growth' | 'scale' | 'agency')}
                    disabled={!!upgrading}
                    className={`w-full py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${colors.btn}`}
                  >
                    {upgrading === plan.key
                      ? <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      : `Cambiar a ${plan.label}`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Invoice history */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de pagos</h2>
        {loadingInvoices ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-xl">
            <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Sin facturas aún.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {inv.stripeInvoiceId.slice(0, 18)}…
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(inv.amountPaid > 0 ? inv.amountPaid : inv.amountDue, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {inv.hostedInvoiceUrl && (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Ver factura"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {inv.invoicePdfUrl && (
                          <a
                            href={inv.invoicePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-700 text-xs underline"
                          >
                            PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

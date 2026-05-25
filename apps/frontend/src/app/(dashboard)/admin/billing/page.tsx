'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  getAdminBillingStats,
  getAdminBillingInvoices,
  AdminBillingStats,
  AdminInvoicesResponse,
} from '@/lib/api'
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  ReceiptText,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS_INVOICE: Record<string, string> = {
  paid:     'bg-green-100 text-green-700',
  open:     'bg-yellow-100 text-yellow-700',
  draft:    'bg-gray-100 text-gray-500',
  void:     'bg-gray-100 text-gray-400',
  uncollectible: 'bg-red-100 text-red-500',
}

function fmtCurrency(amount: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', {
    style:    'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
  }).format(amount)
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── component ─────────────────────────────────────────────────────────────────

const INVOICE_STATUSES = ['paid', 'open', 'draft', 'void', 'uncollectible'] as const

export default function AdminBillingPage() {
  const { data: session, status } = useSession()
  const token   = (session as any)?.accessToken as string | undefined
  const isReady = status === 'authenticated' && !!token

  const [page,         setPage]         = useState(1)
  const [filterStatus, setFilterStatus] = useState('')

  const { data: stats, isLoading: loadingStats } = useQuery<AdminBillingStats>({
    queryKey: ['admin-billing-stats'],
    queryFn:  () => getAdminBillingStats(token!),
    enabled:  isReady,
  })

  const { data, isLoading: loadingInvoices } = useQuery<AdminInvoicesResponse>({
    queryKey: ['admin-billing-invoices', page, filterStatus],
    queryFn:  () => getAdminBillingInvoices(token!, page, 25, undefined, filterStatus || undefined),
    enabled:  isReady,
  })

  const invoices = data?.data  ?? []
  const total    = data?.total ?? 0
  const pages    = data?.pages ?? 1

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Facturación consolidada de todos los workspaces.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="MRR"
          value={loadingStats ? '…' : fmtCurrency(stats?.mrr ?? 0)}
          icon={TrendingUp}
          color="green"
          sub={`${stats?.paidTenants ?? 0} de pago`}
        />
        <StatCard
          label="Total facturado"
          value={loadingStats ? '…' : fmtCurrency(stats?.totalInvoiced ?? 0)}
          icon={ReceiptText}
          color="indigo"
        />
        <StatCard
          label="Total cobrado"
          value={loadingStats ? '…' : fmtCurrency(stats?.totalPaid ?? 0)}
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          label="Facturas fallidas"
          value={loadingStats ? '…' : (stats?.failedInvoices ?? 0)}
          icon={AlertCircle}
          color="red"
          sub="estado: open"
        />
      </div>

      {/* Plan distribution */}
      {stats && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribución por plan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats.planDistribution).map(([plan, count]) => (
              <div key={plan} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{plan}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invoices table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Historial de facturas
            {total > 0 && <span className="text-sm font-normal text-gray-400 ml-2">({total})</span>}
          </h2>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loadingInvoices ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ReceiptText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Sin facturas aún.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3 text-left">Workspace</th>
                  <th className="px-4 py-3 text-left">Factura</th>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-right">Monto</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.tenantName}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {inv.stripeInvoiceId.slice(0, 18)}…
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {fmtCurrency(inv.amountPaid > 0 ? inv.amountPaid : inv.amountDue, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_INVOICE[inv.status] ?? STATUS_INVOICE.draft}`}>
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
                            title="Ver en Stripe"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {inv.invoicePdfUrl && (
                          <a
                            href={inv.invoicePdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
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
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">Página {page} de {pages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string
  value: string | number
  icon:  React.ComponentType<{ className?: string }>
  color: 'green' | 'indigo' | 'purple' | 'red'
  sub?:  string
}) {
  const bg: Record<string, string> = {
    green:  'bg-green-50 text-green-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

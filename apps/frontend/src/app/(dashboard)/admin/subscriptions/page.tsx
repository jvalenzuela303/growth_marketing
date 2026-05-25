'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAdminBillingSubscriptions,
  updateAdminSubscriptionPlan,
  updateAdminSubscriptionStatus,
  AdminSubscriptionRow,
  AdminSubscriptionsResponse,
} from '@/lib/api'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react'

// ── constants ──────────────────────────────────────────────────────────────────

const PLANS    = ['starter', 'growth', 'scale', 'agency'] as const
const STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'suspended'] as const

const planBadge: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  growth:  'bg-blue-100 text-blue-700',
  scale:   'bg-purple-100 text-purple-700',
  agency:  'bg-orange-100 text-orange-700',
}

const statusBadge: Record<string, string> = {
  active:          'bg-green-100 text-green-700',
  trialing:        'bg-blue-100 text-blue-700',
  past_due:        'bg-red-100 text-red-700',
  canceled:        'bg-gray-100 text-gray-400',
  suspended:       'bg-amber-100 text-amber-700',
  no_subscription: 'bg-gray-100 text-gray-400',
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── component ─────────────────────────────────────────────────────────────────

export default function AdminSubscriptionsPage() {
  const { data: session, status } = useSession()
  const token   = (session as any)?.accessToken as string | undefined
  const isReady = status === 'authenticated' && !!token
  const qc      = useQueryClient()

  const [page,         setPage]         = useState(1)
  const [filterPlan,   setFilterPlan]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Dialog state
  const [planDialog,   setPlanDialog]   = useState<AdminSubscriptionRow | null>(null)
  const [statusDialog, setStatusDialog] = useState<AdminSubscriptionRow | null>(null)
  const [newPlan,      setNewPlan]      = useState('')
  const [newStatus,    setNewStatus]    = useState('')

  const { data, isLoading, isFetching } = useQuery<AdminSubscriptionsResponse>({
    queryKey: ['admin-billing-subscriptions', page, filterPlan, filterStatus],
    queryFn:  () => getAdminBillingSubscriptions(token!, page, 20, filterPlan || undefined, filterStatus || undefined),
    enabled:  isReady,
  })

  const planMutation = useMutation({
    mutationFn: ({ tenantId, plan }: { tenantId: string; plan: string }) =>
      updateAdminSubscriptionPlan(tenantId, plan, token!),
    onSuccess: () => {
      toast.success('Plan actualizado correctamente')
      setPlanDialog(null)
      qc.invalidateQueries({ queryKey: ['admin-billing-subscriptions'] })
    },
    onError: () => toast.error('Error al cambiar el plan'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ tenantId, status: s }: { tenantId: string; status: string }) =>
      updateAdminSubscriptionStatus(tenantId, s, token!),
    onSuccess: () => {
      toast.success('Estado actualizado correctamente')
      setStatusDialog(null)
      qc.invalidateQueries({ queryKey: ['admin-billing-subscriptions'] })
    },
    onError: () => toast.error('Error al cambiar el estado'),
  })

  const rows  = data?.data  ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 1

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Suscripciones</h1>
          <p className="text-gray-500 mt-1">
            {total} workspace{total !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin-billing-subscriptions'] })}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterPlan}
          onChange={(e) => { setFilterPlan(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los planes</option>
          {PLANS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
          <option value="no_subscription">Sin suscripción</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>Sin resultados para los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left">Workspace</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-center">Plan</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-center">Vence</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.tenantId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.tenantName}</p>
                    <p className="text-xs text-gray-400">{row.tenantSlug}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{row.ownerEmail}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${planBadge[row.plan] ?? planBadge.starter}`}>
                      {row.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[row.subStatus ?? 'no_subscription']}`}>
                      {row.subStatus ?? 'sin suscripción'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {fmtDate(row.currentPeriodEnd)}
                    {row.cancelAtPeriodEnd && (
                      <span className="block text-red-500 text-[10px]">cancela al vencer</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => { setPlanDialog(row); setNewPlan(row.plan) }}
                        className="text-xs px-2 py-1 rounded border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition-colors"
                      >
                        Plan
                      </button>
                      {row.subStatus && (
                        <button
                          onClick={() => { setStatusDialog(row); setNewStatus(row.subStatus!) }}
                          className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Estado
                        </button>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Página {page} de {pages} &mdash; {total} workspaces
          </p>
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

      {/* ── Change Plan Dialog ─────────────────────────────────────────────── */}
      {planDialog && (
        <Dialog title={`Cambiar plan — ${planDialog.tenantName}`} onClose={() => setPlanDialog(null)}>
          <p className="text-sm text-gray-600 mb-1">
            Plan actual:{' '}
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${planBadge[planDialog.plan] ?? planBadge.starter}`}>
              {planDialog.plan}
            </span>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Esto actualiza los límites del workspace inmediatamente.
          </p>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nuevo plan</label>
          <select
            value={newPlan}
            onChange={(e) => setNewPlan(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-5"
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setPlanDialog(null)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => planMutation.mutate({ tenantId: planDialog.tenantId, plan: newPlan })}
              disabled={planMutation.isPending || newPlan === planDialog.plan}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {planMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar
            </button>
          </div>
        </Dialog>
      )}

      {/* ── Change Status Dialog ───────────────────────────────────────────── */}
      {statusDialog && (
        <Dialog title={`Cambiar estado — ${statusDialog.tenantName}`} onClose={() => setStatusDialog(null)}>
          <p className="text-sm text-gray-600 mb-1">
            Estado actual:{' '}
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge[statusDialog.subStatus ?? 'no_subscription']}`}>
              {statusDialog.subStatus}
            </span>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Cambiar el estado no cancela ni crea cargos en Stripe.
          </p>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Nuevo estado</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-5"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setStatusDialog(null)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => statusMutation.mutate({ tenantId: statusDialog.tenantId, status: newStatus })}
              disabled={statusMutation.isPending || newStatus === statusDialog.subStatus}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {statusMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmar
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

// ── Dialog helper ─────────────────────────────────────────────────────────────

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

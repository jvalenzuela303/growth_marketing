'use client'

/**
 * ManageAdAccountsModal — full CRUD UI for ads accounts.
 * Lists connected accounts, allows adding new ones, setting default,
 * and deleting existing ones.
 */

import { useState } from 'react'
import { X, Plus, Trash2, Star, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AdsAccount, CreateAdsAccountInput } from '@/lib/api'

const PLATFORM_OPTIONS = [
  { value: 'meta',     label: 'Meta Ads (Facebook / Instagram)' },
  { value: 'google',   label: 'Google Ads' },
  { value: 'tiktok',   label: 'TikTok Ads' },
  { value: 'linkedin', label: 'LinkedIn Ads' },
] as const

type Platform = 'meta' | 'google' | 'tiktok' | 'linkedin'

interface Props {
  accounts:      AdsAccount[]
  onClose:       () => void
  onCreate:      (data: CreateAdsAccountInput) => Promise<void>
  onDelete:      (id: string) => Promise<void>
  onSetDefault:  (id: string) => Promise<void>
}

const emptyForm: CreateAdsAccountInput = {
  name:              '',
  platform:          'meta',
  externalAccountId: '',
  accessToken:       '',
}

export function ManageAdAccountsModal({ accounts, onClose, onCreate, onDelete, onSetDefault }: Props) {
  const [showForm, setShowForm]         = useState(accounts.length === 0)
  const [form, setForm]                 = useState<CreateAdsAccountInput>(emptyForm)
  const [saving, setSaving]             = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name || !form.externalAccountId) {
      setError('Nombre e ID de cuenta son requeridos.')
      return
    }
    setSaving(true)
    try {
      await onCreate({
        ...form,
        accessToken: form.accessToken || undefined,
      })
      setForm(emptyForm)
      setShowForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id)
    try {
      await onSetDefault(id)
    } finally {
      setSettingDefaultId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Cuentas de Ads</h2>
            <p className="text-xs text-slate-500 mt-0.5">Conecta y administra múltiples cuentas por plataforma</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {/* Account list */}
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border',
                acc.status === 'error' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50',
              )}
            >
              {/* Platform badge */}
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                acc.platform === 'meta'     && 'bg-blue-600 text-white',
                acc.platform === 'google'   && 'bg-white border border-slate-300 text-blue-500',
                acc.platform === 'tiktok'   && 'bg-black text-white',
                acc.platform === 'linkedin' && 'bg-blue-700 text-white',
              )}>
                {acc.platform[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-bold text-slate-900 truncate">{acc.name}</span>
                  {acc.isDefault && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-100 text-brand-700 leading-none">
                      default
                    </span>
                  )}
                  {acc.status === 'active'  && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" aria-label="Activa" />}
                  {acc.status === 'error'   && <AlertCircle  className="w-3.5 h-3.5 text-red-500 flex-shrink-0"   aria-label="Error" />}
                </div>
                <p className="text-xs text-slate-400 truncate">ID: {acc.externalAccountId} · {acc.campaignCount} campañas</p>
                {acc.syncErrorMessage && (
                  <p className="text-xs text-red-500 mt-0.5 truncate">{acc.syncErrorMessage}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!acc.isDefault && (
                  <button
                    onClick={() => handleSetDefault(acc.id)}
                    disabled={settingDefaultId === acc.id}
                    title="Establecer como default"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    {settingDefaultId === acc.id
                      ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      : <Star className="w-4 h-4" aria-hidden />
                    }
                  </button>
                )}
                <button
                  onClick={() => handleDelete(acc.id)}
                  disabled={deletingId === acc.id}
                  title="Eliminar cuenta"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === acc.id
                    ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    : <Trash2 className="w-4 h-4" aria-hidden />
                  }
                </button>
              </div>
            </div>
          ))}

          {accounts.length === 0 && !showForm && (
            <p className="text-center text-sm text-slate-400 py-6">No hay cuentas conectadas.</p>
          )}

          {/* Add form */}
          {showForm ? (
            <form onSubmit={handleCreate} className="border border-brand-200 rounded-xl p-4 space-y-3 bg-brand-50">
              <p className="text-sm font-bold text-slate-800">Nueva cuenta</p>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Plataforma</label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value as Platform }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Nombre de la cuenta</label>
                <input
                  type="text"
                  placeholder="ej. TrueTech — Meta Principal"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">ID de cuenta externa</label>
                <input
                  type="text"
                  placeholder="ej. act_1234567890"
                  value={form.externalAccountId}
                  onChange={(e) => setForm((p) => ({ ...p, externalAccountId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">
                  Access Token <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="password"
                  placeholder="EAAxxxxx..."
                  value={form.accessToken ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, accessToken: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoComplete="off"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl',
                    'bg-gradient-brand text-white text-sm font-semibold',
                    'hover:opacity-90 transition-all shadow-card',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                  Conectar cuenta
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className={cn(
                'w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl',
                'border border-dashed border-slate-300 text-sm font-semibold text-slate-500',
                'hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors',
              )}
            >
              <Plus className="w-4 h-4" aria-hidden />
              Agregar cuenta
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

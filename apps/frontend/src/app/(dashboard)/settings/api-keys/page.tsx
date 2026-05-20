'use client'

/**
 * /settings/api-keys — API Keys management page.
 * Allows creating, listing and revoking API keys for external integrations.
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Key, Plus, Trash2, Copy, CheckCircle2, AlertCircle, Loader2, ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiKeys, createApiKey, revokeApiKey } from '@/lib/api'
import type { ApiKeyRecord, CreatedApiKey } from '@/lib/api'

// ── Scopes available ──────────────────────────────────────────────────────────

const AVAILABLE_SCOPES = [
  { value: 'leads:read',    label: 'Leads — Lectura'    },
  { value: 'leads:write',   label: 'Leads — Escritura'  },
  { value: 'funnels:read',  label: 'Funnels — Lectura'  },
  { value: 'analytics:read',label: 'Analytics — Lectura'},
  { value: 'sms:send',      label: 'SMS — Enviar'       },
]

// ── Newly created key banner ──────────────────────────────────────────────────

function NewKeyBanner({ keyData, onDismiss }: { keyData: CreatedApiKey; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(keyData.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-bold text-emerald-800">API key creada — guárdala ahora</p>
        </div>
        <button onClick={onDismiss} className="text-emerald-500 hover:text-emerald-700 text-xs font-medium">
          Entendido
        </button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 break-all">
          {keyData.key}
        </code>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-emerald-300 bg-white text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors whitespace-nowrap"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="text-xs text-emerald-700">
        Este valor no se volverá a mostrar. Úsalo en el header <code className="bg-white px-1 rounded">X-API-Key</code> de tus peticiones.
      </p>
    </div>
  )
}

// ── Key row ───────────────────────────────────────────────────────────────────

function KeyRow({
  apiKey,
  onRevoke,
}: {
  apiKey: ApiKeyRecord
  onRevoke: () => void
}) {
  const [revoking, setRevoking] = useState(false)

  async function handleRevoke() {
    if (!confirm(`¿Revocar la key "${apiKey.name}"? Esta acción no se puede deshacer.`)) return
    setRevoking(true)
    try { await onRevoke() } finally { setRevoking(false) }
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800 text-sm">{apiKey.name}</p>
        <p className="text-xs text-slate-400 font-mono mt-0.5">{apiKey.keyPrefix}••••••••</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {apiKey.scopes.length === 0
            ? <span className="text-xs text-slate-400">Sin scopes</span>
            : apiKey.scopes.map((s) => (
                <span key={s} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-lg font-mono">{s}</span>
              ))
          }
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
        {apiKey.lastUsedAt
          ? new Date(apiKey.lastUsedAt).toLocaleDateString('es-CL')
          : 'Nunca usada'}
      </td>
      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
        {new Date(apiKey.createdAt).toLocaleDateString('es-CL')}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleRevoke}
          disabled={revoking}
          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Revocar
        </button>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''

  const [keys, setKeys]         = useState<ApiKeyRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey]     = useState<CreatedApiKey | null>(null)
  const [error, setError]       = useState('')

  // Form
  const [name, setName]           = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])

  useEffect(() => {
    if (!token) return
    getApiKeys(token)
      .then(setKeys)
      .catch(() => setError('No se pudieron cargar las API keys.'))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !name.trim()) return
    setCreating(true)
    setError('')
    try {
      const created = await createApiKey(token, name.trim(), selectedScopes)
      setNewKey(created)
      setKeys((prev) => [...prev])  // will refresh on next load
      setName('')
      setSelectedScopes([])
      // Reload list
      getApiKeys(token).then(setKeys).catch(() => {})
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear la API key.')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!token) return
    await revokeApiKey(id, token)
    setKeys((prev) => prev.filter((k) => k.id !== id))
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-600" />
            API Keys
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Integra sistemas externos usando API keys en el header <code className="bg-slate-100 px-1 rounded text-xs">X-API-Key</code>.
          </p>
        </div>
        <a
          href="http://localhost:4001/api/docs"
          target="_blank"
          rel="noopener"
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Ver documentación API
        </a>
      </div>

      {/* New key banner */}
      {newKey && <NewKeyBanner keyData={newKey} onDismiss={() => setNewKey(null)} />}

      {/* Create form */}
      <div className="kpi-card">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Crear nueva API key</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nombre</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Integración HubSpot"
              className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Scopes de acceso</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <button
                  key={scope.value}
                  type="button"
                  onClick={() => toggleScope(scope.value)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-xl border font-medium transition-colors',
                    selectedScopes.includes(scope.value)
                      ? 'bg-brand-600 border-brand-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300',
                  )}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="btn-cta"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Generar API key
          </button>
        </form>
      </div>

      {/* Keys table */}
      <div className="kpi-card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">
            Keys activas — {keys.length}
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No tienes API keys activas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                {['Nombre / Prefix', 'Scopes', 'Último uso', 'Creada', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <KeyRow key={k.id} apiKey={k} onRevoke={() => handleRevoke(k.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage example */}
      <div className="rounded-2xl bg-slate-900 p-4 text-xs font-mono text-slate-300 space-y-1.5">
        <p className="text-slate-500 font-sans text-xs font-semibold uppercase tracking-wide mb-2">Ejemplo de uso</p>
        <p><span className="text-amber-400">curl</span> https://api.thegrowthengine.com/api/v1/leads <span className="text-slate-500">\</span></p>
        <p className="pl-4"><span className="text-amber-400">-H</span> <span className="text-emerald-400">&quot;X-API-Key: ge_xxxxxxxxxxxxxxxx&quot;</span></p>
      </div>
    </div>
  )
}

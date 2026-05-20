'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createFunnelVariant } from '@/lib/api'

interface NewVariantModalProps {
  isOpen:      boolean
  onClose:     () => void
  onCreated:   () => void
  funnelId:    string
  accessToken: string
  usedSplit:   number
}

export function NewVariantModal({
  isOpen, onClose, onCreated, funnelId, accessToken, usedSplit,
}: NewVariantModalProps) {
  const remaining = Math.max(0, 100 - usedSplit)
  const [name, setName]          = useState('')
  const [trafficSplit, setSplit] = useState(Math.min(50, remaining))
  const [loading, setLoading]    = useState(false)
  const [error, setError]        = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    if (trafficSplit < 1 || trafficSplit > 100) { setError('El porcentaje debe ser entre 1 y 100.'); return }
    setLoading(true)
    try {
      await createFunnelVariant(funnelId, { name: name.trim(), trafficSplit }, accessToken)
      onCreated()
      onClose()
      setName('')
      setSplit(50)
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear la variante.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 z-10">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Nueva variante</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors" aria-label="Cerrar">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="vname" className="block text-sm font-semibold text-slate-700">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="vname"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Versión con video"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl border-2 border-slate-200 text-sm focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="split" className="block text-sm font-semibold text-slate-700">
              Tráfico: <span className="text-brand-600 font-bold">{trafficSplit}%</span>
              <span className="text-slate-400 font-normal ml-2">(disponible: {remaining}%)</span>
            </label>
            <input
              id="split"
              type="range"
              min={1}
              max={100}
              value={trafficSplit}
              onChange={(e) => setSplit(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1%</span><span>100%</span>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 min-h-[44px] rounded-2xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-cta">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Creando…</> : 'Crear variante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

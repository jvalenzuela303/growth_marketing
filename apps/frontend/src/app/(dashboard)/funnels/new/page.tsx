'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function NewFunnelPage() {
  const router = useRouter()
  const { data: session } = useSession()

  const [name,        setName]        = useState('')
  const [slug,        setSlug]        = useState('')
  const [description, setDescription] = useState('')
  const [slugEdited,  setSlugEdited]  = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(slugify(e.target.value))
    setSlugEdited(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.accessToken) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/v1/funnels`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ name, slug, description }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message ?? 'Error al crear el embudo.')
        setLoading(false)
        return
      }

      router.push('/funnels')
      router.refresh()
    } catch {
      setError('No se pudo conectar con el servidor.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/funnels"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          aria-label="Volver a embudos"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Nuevo embudo</h1>
          <p className="text-sm text-slate-500">Configura los datos básicos del embudo</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-slate-100 shadow-card p-6">
        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-semibold text-slate-700">
            Nombre del embudo <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={handleNameChange}
            placeholder="Ej: Diagnóstico de Marketing Digital"
            className="w-full min-h-[48px] px-4 py-3 rounded-xl border-2 border-slate-200 text-base bg-white focus:border-brand-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <label htmlFor="slug" className="block text-sm font-semibold text-slate-700">
            URL del embudo <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-0 rounded-xl border-2 border-slate-200 focus-within:border-brand-500 transition-colors overflow-hidden">
            <span className="px-3 py-3 text-sm text-slate-400 bg-slate-50 border-r border-slate-200 whitespace-nowrap">
              /demo/
            </span>
            <input
              id="slug"
              type="text"
              required
              value={slug}
              onChange={handleSlugChange}
              placeholder="diagnostico-marketing"
              className="flex-1 min-h-[44px] px-3 py-3 text-base bg-white focus:outline-none"
            />
          </div>
          <p className="text-xs text-slate-400">Solo letras minúsculas, números y guiones.</p>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="description" className="block text-sm font-semibold text-slate-700">
            Descripción <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe el objetivo del embudo…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-base bg-white focus:border-brand-500 focus:outline-none transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/funnels"
            className={cn(
              'flex-1 flex items-center justify-center min-h-[48px] rounded-2xl',
              'border-2 border-slate-200 text-sm font-semibold text-slate-600',
              'hover:bg-slate-50 transition-colors',
            )}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || !name || !slug}
            className="btn-cta flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Creando…
              </>
            ) : (
              'Crear embudo'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

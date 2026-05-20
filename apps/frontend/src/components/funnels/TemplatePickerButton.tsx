'use client'

/**
 * TemplatePickerButton — opens a modal showing pre-built funnel templates
 * grouped by industry. Selecting one creates a funnel and redirects to edit.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { LayoutTemplate, X, Loader2, ChevronRight, TrendingUp } from 'lucide-react'
import { getFunnelTemplates, createFunnelFromTemplate } from '@/lib/api'
import type { FunnelTemplate } from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

function TemplateCard({
  tpl,
  selected,
  onClick,
}: {
  tpl: FunnelTemplate
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border-2 p-4 transition-all',
        selected
          ? 'border-brand-500 bg-brand-50'
          : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{tpl.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 text-sm">{tpl.name}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {tpl.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3" />
              {tpl.estimatedConversion} conv. estimada
            </span>
            <span className="text-xs text-slate-400">{tpl.questions} preguntas</span>
          </div>
        </div>
        {selected && (
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function TemplateModal({ onClose }: { onClose: () => void }) {
  const router           = useRouter()
  const { data: session } = useSession()

  const [templates, setTemplates]   = useState<FunnelTemplate[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<FunnelTemplate | null>(null)
  const [customName, setCustomName] = useState('')
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState('')

  // Fetch templates on mount
  useEffect(() => {
    if (!session?.accessToken) return
    getFunnelTemplates(session.accessToken)
      .then(setTemplates)
      .catch(() => setError('No se pudieron cargar las plantillas.'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  function handleSelect(tpl: FunnelTemplate) {
    setSelected(tpl)
    setCustomName(tpl.name)
    setError('')
  }

  async function handleCreate() {
    if (!selected || !session?.accessToken) return
    setCreating(true)
    setError('')
    try {
      const funnel = await createFunnelFromTemplate(
        session.accessToken,
        selected.id,
        customName.trim() || selected.name,
      )
      router.push(`/funnels/${funnel.id}/edit`)
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear el funnel.')
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <LayoutTemplate className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-extrabold text-slate-900">Plantillas por industria</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          )}
          {!loading && templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              selected={selected?.id === tpl.id}
              onClick={() => handleSelect(tpl)}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          {selected && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Nombre del funnel
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={selected.name}
                className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={!selected || creating}
              className="flex-1 h-10 rounded-xl bg-brand-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Usar plantilla
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Exported button
// ---------------------------------------------------------------------------

export function TemplatePickerButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <LayoutTemplate className="w-4 h-4" aria-hidden />
        Usar plantilla
      </button>
      {open && <TemplateModal onClose={() => setOpen(false)} />}
    </>
  )
}

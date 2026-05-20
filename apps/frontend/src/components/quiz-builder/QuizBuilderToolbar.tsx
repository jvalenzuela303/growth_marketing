'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Loader2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQuizBuilderStore } from '@/stores/quiz-builder-store'

interface QuizBuilderToolbarProps {
  accessToken: string
}

type TabKey = 'quiz' | 'landing' | 'results'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'quiz',    label: 'Quiz' },
  { key: 'landing', label: 'Landing' },
  { key: 'results', label: 'Resultados' },
]

export function QuizBuilderToolbar({ accessToken }: QuizBuilderToolbarProps) {
  const funnelId       = useQuizBuilderStore((s) => s.funnelId)
  const funnelName     = useQuizBuilderStore((s) => s.funnelName)
  const setFunnelName  = useQuizBuilderStore((s) => s.setFunnelName)
  const isDirty        = useQuizBuilderStore((s) => s.isDirty)
  const isSaving       = useQuizBuilderStore((s) => s.isSaving)
  const saveQuizConfig = useQuizBuilderStore((s) => s.saveQuizConfig)

  const [activeTab, setActiveTab]   = useState<TabKey>('quiz')
  const [editingName, setEditingName] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  function handleTabClick(key: TabKey) {
    if (key !== 'quiz') {
      toast.info('Proximamente', {
        description: `El editor de ${key === 'landing' ? 'Landing' : 'Resultados'} estará disponible pronto.`,
      })
      return
    }
    setActiveTab(key)
  }

  async function handleSave() {
    try {
      await saveQuizConfig(accessToken)
      toast.success('Cambios guardados')
    } catch {
      toast.error('Error al guardar', { description: 'Verifica tu conexión e intenta de nuevo.' })
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingName(false)
    }
  }

  return (
    <header className="h-14 flex items-center gap-3 px-4 border-b border-slate-200 bg-white flex-shrink-0 z-10">
      {/* Back link */}
      <Link
        href="/funnels"
        className={cn(
          'flex items-center justify-center w-9 h-9 rounded-xl',
          'border border-slate-200 text-slate-500',
          'hover:bg-slate-50 transition-colors flex-shrink-0',
        )}
        aria-label="Volver a embudos"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
      </Link>

      {/* Breadcrumb + editable name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-xs text-slate-400 flex-shrink-0">Embudos</span>
        <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" aria-hidden />

        {editingName ? (
          <input
            ref={nameRef}
            autoFocus
            value={funnelName}
            onChange={(e) => setFunnelName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={handleNameKeyDown}
            className={cn(
              'text-sm font-semibold text-slate-900 bg-transparent',
              'border-b-2 border-brand-500 outline-none min-w-0 flex-1 max-w-[240px]',
            )}
            aria-label="Nombre del embudo"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className={cn(
              'text-sm font-semibold text-slate-900 truncate max-w-[240px]',
              'hover:text-brand-600 transition-colors text-left',
            )}
            title="Haz clic para editar el nombre"
            aria-label="Editar nombre del embudo"
          >
            {funnelName}
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <nav
        className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1"
        aria-label="Secciones del editor"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTabClick(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              activeTab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
            aria-current={activeTab === key ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isSaving || !isDirty}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150',
          'min-h-[36px] flex-shrink-0',
          isDirty && !isSaving
            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
            : 'bg-slate-100 text-slate-400 cursor-default',
        )}
        aria-label={isSaving ? 'Guardando…' : isDirty ? 'Guardar cambios' : 'Sin cambios pendientes'}
      >
        {isSaving ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            Guardando…
          </>
        ) : isDirty ? (
          'Guardar'
        ) : (
          <>
            <Check className="w-3.5 h-3.5" aria-hidden />
            Guardado
          </>
        )}
      </button>
    </header>
  )
}

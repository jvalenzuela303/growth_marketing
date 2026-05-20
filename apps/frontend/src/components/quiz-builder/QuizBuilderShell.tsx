'use client'

import { useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useQuizBuilderStore } from '@/stores/quiz-builder-store'
import { QuizBuilderToolbar } from './QuizBuilderToolbar'
import { QuizBuilderCanvas } from './QuizBuilderCanvas'
import { QuestionEditor } from './QuestionEditor'
import { ScoringPanel } from './ScoringPanel'
import { BranchingPanel } from './BranchingPanel'

interface QuizBuilderShellProps {
  funnelId: string
  accessToken: string
}

/**
 * Client entry point for the quiz builder.
 * Loads the funnel on mount, then renders the 3-panel layout.
 */
export function QuizBuilderShell({ funnelId, accessToken }: QuizBuilderShellProps) {
  const loadFunnel = useQuizBuilderStore((s) => s.loadFunnel)
  const loadError = useQuizBuilderStore((s) => s.loadError)
  const funnelName = useQuizBuilderStore((s) => s.funnelName)

  useEffect(() => {
    loadFunnel(funnelId, accessToken)
  }, [funnelId, accessToken, loadFunnel])

  // Loading state — funnelName empty means not yet hydrated
  if (!funnelName && !loadError) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 border-b border-slate-200 bg-white" />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
            <p className="text-sm font-medium">Cargando editor…</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (loadError) {
    return (
      <div className="flex flex-col h-full">
        <div className="h-14 border-b border-slate-200 bg-white" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-slate-800">Error al cargar el embudo</p>
              <p className="text-sm text-slate-500 mt-1">{loadError}</p>
            </div>
            <button
              onClick={() => loadFunnel(funnelId, accessToken)}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 underline"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <QuizBuilderToolbar accessToken={accessToken} />

      {/* 3-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LEFT — question list */}
        <aside
          className="w-[280px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden"
          aria-label="Lista de preguntas"
        >
          <QuizBuilderCanvas />
        </aside>

        {/* CENTER — question editor */}
        <main
          className="flex-1 flex flex-col overflow-y-auto bg-surface-subtle min-w-0"
          aria-label="Editor de pregunta"
        >
          <QuestionEditor />
        </main>

        {/* RIGHT — scoring + branching */}
        <aside
          className="w-[320px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-y-auto"
          aria-label="Configuracion de scoring"
        >
          <ScoringPanel />
          <BranchingPanel />
        </aside>
      </div>
    </div>
  )
}

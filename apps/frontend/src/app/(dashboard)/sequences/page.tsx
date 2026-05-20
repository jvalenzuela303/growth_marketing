'use client'

/**
 * Sequences list page — overview of all email automation sequences.
 *
 * CRO Impact: Automated email sequences are the highest-leverage tool for
 * nurturing quiz leads. This page gives operators visibility and control
 * over what's running, preventing revenue leaks from broken sequences.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Plus, Mail, Zap, Users, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { cn, formatRelativeDate } from '@/lib/utils'
import { getSequences, updateSequence } from '@/lib/api'
import type { EmailSequence } from '@/lib/api'

// ---------------------------------------------------------------------------
// Trigger label map
// ---------------------------------------------------------------------------

const TRIGGER_LABELS: Record<string, string> = {
  quiz_complete:    'Quiz completado',
  segment_assigned: 'Segmento asignado',
  manual:           'Manual',
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SequenceSkeleton() {
  return (
    <div className="kpi-card space-y-3">
      <div className="skeleton h-5 w-40 rounded-full" />
      <div className="skeleton h-3.5 w-28 rounded-full" />
      <div className="flex gap-6 mt-1">
        <div className="skeleton h-3 w-16 rounded-full" />
        <div className="skeleton h-3 w-16 rounded-full" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sequence card
// ---------------------------------------------------------------------------

interface SequenceCardProps {
  sequence: EmailSequence
  onToggle: (id: string, active: boolean) => void
  toggling: string | null
}

function SequenceCard({ sequence, onToggle, toggling }: SequenceCardProps) {
  const isToggling = toggling === sequence.id

  return (
    <div className="kpi-card flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 p-2 rounded-xl bg-brand-50 mt-0.5">
            <Mail className="w-4 h-4 text-brand-600" aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 truncate">{sequence.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Zap className="w-3 h-3 flex-shrink-0" aria-hidden />
              {TRIGGER_LABELS[sequence.trigger] ?? sequence.trigger}
            </p>
          </div>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => onToggle(sequence.id, sequence.isActive)}
          disabled={isToggling}
          aria-label={sequence.isActive ? 'Pausar secuencia' : 'Activar secuencia'}
          aria-pressed={sequence.isActive}
          className="flex-shrink-0 transition-colors disabled:opacity-50"
        >
          {isToggling ? (
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" aria-hidden />
          ) : sequence.isActive ? (
            <ToggleRight className="w-7 h-7 text-emerald-500" aria-hidden />
          ) : (
            <ToggleLeft className="w-7 h-7 text-slate-300" aria-hidden />
          )}
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Mail className="w-3.5 h-3.5 text-slate-400" aria-hidden />
          {sequence.stepCount} pasos
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-slate-400" aria-hidden />
          {sequence.enrolledCount.toLocaleString('es-CL')} inscritos
        </span>
        {sequence.updatedAt && (
          <span className="ml-auto text-slate-400">
            Editado {formatRelativeDate(sequence.updatedAt)}
          </span>
        )}
      </div>

      {/* Trigger segments chips */}
      {sequence.triggerSegments && sequence.triggerSegments.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sequence.triggerSegments.map((seg) => (
            <span
              key={seg}
              className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize"
            >
              {seg}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SequencesPage() {
  const { data: session } = useSession()
  const [sequences, setSequences] = useState<EmailSequence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toggling, setToggling]   = useState<string | null>(null)

  useEffect(() => {
    if (!session?.accessToken) return
    setIsLoading(true)
    getSequences(session.accessToken)
      .then(setSequences)
      .finally(() => setIsLoading(false))
  }, [session?.accessToken])

  async function handleToggle(id: string, currentlyActive: boolean) {
    if (!session?.accessToken) return
    setToggling(id)
    try {
      await updateSequence(id, { isActive: !currentlyActive }, session.accessToken)
      setSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: !currentlyActive } : s)),
      )
    } finally {
      setToggling(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Secuencias de email</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automatiza el seguimiento post-quiz para maximizar conversiones
          </p>
        </div>
        <Link
          href="/sequences/new"
          className={cn(
            'flex items-center gap-1.5 min-h-[44px] px-5 rounded-2xl',
            'bg-gradient-brand text-white text-sm font-bold',
            'hover:opacity-90 active:scale-[0.98] transition-all shadow-card',
            'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          )}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Nueva secuencia
        </Link>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <SequenceSkeleton key={i} />)}
        </div>
      ) : sequences.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4 rounded-2xl border-2 border-dashed border-slate-200">
          <span className="text-4xl" aria-hidden>✉️</span>
          <div>
            <p className="text-base font-bold text-slate-700">Sin secuencias aún</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
              Crea tu primera secuencia para automatizar el seguimiento de leads del quiz
            </p>
          </div>
          <Link
            href="/sequences/new"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-brand text-white text-sm font-bold shadow-card hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Crear primera secuencia
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              sequence={seq}
              onToggle={handleToggle}
              toggling={toggling}
            />
          ))}
        </div>
      )}
    </div>
  )
}

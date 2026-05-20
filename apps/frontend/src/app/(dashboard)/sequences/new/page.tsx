'use client'

/**
 * New sequence page — form to create an email automation sequence.
 *
 * CRO Impact: Trigger + segment targeting means the right message goes to
 * the right lead at the right moment — the core principle of high-converting
 * email automation.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createSequence } from '@/lib/api'
import { SequenceEditor } from '@/components/sequences/SequenceEditor'
import type { CreateSequenceInput, SequenceStep } from '@/lib/api'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

type TriggerType = CreateSequenceInput['trigger']

const TRIGGERS: { value: TriggerType; label: string; description: string }[] = [
  {
    value:       'quiz_complete',
    label:       'Quiz completado',
    description: 'Se activa cuando un lead completa el quiz y deja su email',
  },
  {
    value:       'segment_assigned',
    label:       'Segmento asignado',
    description: 'Se activa cuando un lead es clasificado en un segmento específico',
  },
  {
    value:       'manual',
    label:       'Manual',
    description: 'El operador activa la secuencia manualmente para cada lead',
  },
]

const SEGMENTS = [
  { value: 'fuego',    label: 'Fuego',    emoji: '🔥' },
  { value: 'caliente', label: 'Caliente', emoji: '⚡' },
  { value: 'tibio',    label: 'Tibio',    emoji: '🌡️' },
  { value: 'frio',     label: 'Frío',     emoji: '🧊' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NewSequencePage() {
  const router         = useRouter()
  const { data: session } = useSession()

  const [name, setName]                     = useState('')
  const [trigger, setTrigger]               = useState<TriggerType>('quiz_complete')
  const [triggerSegments, setTriggerSegments] = useState<string[]>([])
  const [scoreMin, setScoreMin]             = useState<number | ''>('')
  const [scoreMax, setScoreMax]             = useState<number | ''>('')
  const [steps, setSteps]                   = useState<SequenceStep[]>([])
  const [isSubmitting, setIsSubmitting]     = useState(false)
  const [errors, setErrors]                 = useState<Record<string, string>>({})

  function toggleSegment(seg: string) {
    setTriggerSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg],
    )
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'El nombre es requerido'
    if (steps.length === 0) errs.steps = 'Agrega al menos un paso'
    steps.forEach((step, i) => {
      if (!step.subject.trim()) errs[`step-${i}-subject`] = `Paso ${i + 1}: el asunto es requerido`
      if (!step.body.trim())    errs[`step-${i}-body`]    = `Paso ${i + 1}: el cuerpo es requerido`
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || !session?.accessToken) return

    setIsSubmitting(true)
    try {
      await createSequence(
        {
          name,
          trigger,
          triggerSegments: triggerSegments.length > 0 ? triggerSegments : undefined,
          scoreMin:        scoreMin !== '' ? Number(scoreMin) : undefined,
          scoreMax:        scoreMax !== '' ? Number(scoreMax) : undefined,
          steps,
        },
        session.accessToken,
      )
      router.push('/sequences')
    } catch {
      setErrors({ form: 'Error al crear la secuencia. Intenta de nuevo.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/sequences"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Volver a secuencias"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Nueva secuencia</h1>
          <p className="text-sm text-slate-500">Configura la automatización de email para tus leads</p>
        </div>
      </div>

      {/* Form error */}
      {errors.form && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Sequence name */}
        <div className="kpi-card space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Información básica</h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="seq-name">
              Nombre de la secuencia <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="seq-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })) }}
              placeholder="Ej: Follow-up leads fuego quiz diagnóstico"
              className={cn(
                'w-full min-h-[44px] px-3 py-2.5 rounded-xl border text-sm text-slate-800',
                'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
                errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200',
              )}
            />
            {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
          </div>
        </div>

        {/* Trigger */}
        <div className="kpi-card space-y-4">
          <h2 className="text-sm font-bold text-slate-700">Disparador (trigger)</h2>
          <div className="space-y-2">
            {TRIGGERS.map(({ value, label, description }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTrigger(value)}
                aria-pressed={trigger === value}
                className={cn(
                  'flex items-start gap-3 w-full text-left p-4 rounded-xl border-2 transition-all duration-150',
                  trigger === value
                    ? 'bg-brand-50 border-brand-300 text-brand-900'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300',
                )}
              >
                <div
                  className={cn(
                    'flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5',
                    trigger === value
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-slate-300',
                  )}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Segment filter — show for segment_assigned trigger */}
          {(trigger === 'segment_assigned' || trigger === 'quiz_complete') && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Filtrar por segmento (opcional)
              </p>
              <p className="text-xs text-slate-400">
                Deja vacío para aplicar a todos los segmentos
              </p>
              <div className="flex flex-wrap gap-2">
                {SEGMENTS.map(({ value: seg, label, emoji }) => (
                  <button
                    key={seg}
                    type="button"
                    onClick={() => toggleSegment(seg)}
                    aria-pressed={triggerSegments.includes(seg)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all duration-150',
                      triggerSegments.includes(seg)
                        ? 'bg-brand-100 border-brand-400 text-brand-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                    )}
                  >
                    <span aria-hidden>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Score range */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Rango de puntuación (opcional)
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Mín (0)"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
              <span className="text-slate-400 text-sm">–</span>
              <div className="flex-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Máx (100)"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Pasos del email</h2>
            <span className="text-xs text-slate-400">{steps.length} pasos</span>
          </div>
          {errors.steps && <p className="text-xs text-red-600">{errors.steps}</p>}
          <SequenceEditor steps={steps} onChange={setSteps} />
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/sequences"
            className={cn(
              'flex-1 flex items-center justify-center min-h-[48px] px-4 rounded-2xl',
              'border border-slate-200 text-sm font-semibold text-slate-600',
              'hover:bg-slate-50 transition-colors',
            )}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-2xl',
              'bg-gradient-brand text-white text-sm font-bold',
              'hover:opacity-90 active:scale-[0.98] transition-all shadow-card',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            )}
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Creando…</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" aria-hidden /> Crear secuencia</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

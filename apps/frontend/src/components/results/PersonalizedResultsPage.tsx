'use client'

/**
 * PersonalizedResultsPage — polls the backend until AI analysis is ready,
 * then renders the full personalized results experience.
 *
 * CRO Impact:
 * - Animated "analyzing" state builds anticipation (Zeigarnik effect) — leads
 *   who wait for results are 3× more likely to read them fully.
 * - Polling-reveal pattern vs. instant results increases perceived value.
 * - Segment identity badge + score gauge create emotional anchor before CTA.
 * - Video embed increases time-on-page and trust (shown to lift CVR 20–30%).
 * - Calendly embed removes scheduling friction — one-click appointment booking.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle2, Clock, Flame, Target, TrendingUp, Zap, AlertTriangle } from 'lucide-react'
import { cn, SEGMENT_COLORS, SEGMENT_NAMES, type SegmentKey } from '@/lib/utils'
import { getPublicQuizResult } from '@/lib/api'
import { ScoreGauge } from './ScoreGauge'
import { SegmentBadgeLarge } from './SegmentBadgeLarge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResultConfig {
  headline:        string
  subheadline?:    string
  cta:             string
  ctaUrl?:         string
  urgency?:        string
  recommendations?: string[]
  videoUrl?:       string
  calendlyUrl?:    string
}

interface QuizResultPayload {
  segment:      string | null
  score:        number | null
  status:       'processing' | 'ready'
  leadName?:    string
  resultConfig: ResultConfig | null
}

// ---------------------------------------------------------------------------
// Loading animation
// ---------------------------------------------------------------------------

function AnalyzingLoader() {
  const steps = [
    'Procesando tus respuestas…',
    'Calculando puntuación de crecimiento…',
    'Generando recomendaciones con IA…',
    'Preparando tu plan personalizado…',
  ]
  const [stepIdx, setStepIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length)
    }, 1800)
    return () => clearInterval(id)
  }, [steps.length])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-16 text-center">
      {/* Pulsing gradient orb */}
      <div className="relative w-28 h-28 mb-8">
        <div className="absolute inset-0 rounded-full bg-gradient-brand opacity-20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-gradient-brand opacity-30 animate-pulse-slow" />
        <div className="absolute inset-4 rounded-full bg-gradient-brand flex items-center justify-center shadow-quiz">
          <Zap className="w-7 h-7 text-white" aria-hidden />
        </div>
      </div>

      <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
        Analizando tus respuestas con IA…
      </h2>

      <AnimatePresence mode="wait">
        <motion.p
          key={stepIdx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="text-slate-500 text-base"
        >
          {steps[stepIdx]}
        </motion.p>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="flex gap-2 mt-8" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-brand-300 animate-bounce-sm"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recommendation icons cycle
// ---------------------------------------------------------------------------

const REC_ICONS = [Target, TrendingUp, Zap, CheckCircle2]

const SEGMENT_ICONS: Record<SegmentKey, React.ComponentType<{ className?: string }>> = {
  fuego:          Flame,
  caliente:       Zap,
  tibio:          TrendingUp,
  frio:           Clock,
  motor_detenido: AlertTriangle,
  sin_clasificar: Target,
}

// ---------------------------------------------------------------------------
// YouTube helpers
// ---------------------------------------------------------------------------

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    let id: string | null = null
    if (u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1)
    } else if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v')
    }
    if (!id) return null
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Results view
// ---------------------------------------------------------------------------

interface ResultsViewProps {
  data: QuizResultPayload
}

function ResultsView({ data }: ResultsViewProps) {
  const segment = (data.segment ?? 'sin_clasificar') as SegmentKey
  const score   = data.score ?? 0
  const config  = data.resultConfig
  const name    = data.leadName ?? 'tú'

  const colors   = SEGMENT_COLORS[segment]
  const SegIcon  = SEGMENT_ICONS[segment]
  const recs     = config?.recommendations ?? []
  const videoEmbed = config?.videoUrl ? getYouTubeEmbedUrl(config.videoUrl) : null

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-8">

      {/* Segment badge pill */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn('segment-badge text-sm px-4 py-1.5', colors.badge)}
      >
        <SegIcon className="w-4 h-4" aria-hidden />
        Diagnóstico: {SEGMENT_NAMES[segment]}
      </motion.div>

      {/* Score gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={cn(
          'flex flex-col items-center gap-2 w-full p-6 rounded-3xl border-2 bg-white shadow-card-hover',
          colors.border,
        )}
      >
        <ScoreGauge score={score} segment={segment} size={200} />
        <p className="text-sm font-semibold text-slate-500">Tu puntuación de crecimiento</p>
      </motion.div>

      {/* Segment badge large */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full"
      >
        <SegmentBadgeLarge segment={segment} />
      </motion.div>

      {/* Headline + subheadline */}
      {config && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center space-y-3 w-full"
        >
          <h1 className="text-2xl xs:text-3xl font-extrabold text-slate-900 leading-tight">
            {config.headline.replace('{nombre}', name)}
          </h1>
          {config.subheadline && (
            <p className="text-base text-slate-600 leading-relaxed">
              {config.subheadline.replace('{nombre}', name)}
            </p>
          )}
        </motion.div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="w-full space-y-3"
        >
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Tus próximos pasos
          </h2>
          <ul className="space-y-2.5" aria-label="Recomendaciones personalizadas">
            {recs.slice(0, 4).map((rec, idx) => {
              const Icon = REC_ICONS[idx % REC_ICONS.length]
              return (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 + idx * 0.09 }}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-2xl border bg-white shadow-card',
                    colors.border,
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl',
                      colors.bg,
                    )}
                    aria-hidden
                  >
                    <Icon className={cn('w-4 h-4', colors.text)} />
                  </span>
                  <p className="text-sm text-slate-700 font-medium leading-snug pt-0.5">{rec}</p>
                </motion.li>
              )
            })}
          </ul>
        </motion.div>
      )}

      {/* Video embed */}
      {videoEmbed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card aspect-video"
        >
          <iframe
            src={videoEmbed}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Video personalizado"
            loading="lazy"
          />
        </motion.div>
      )}

      {/* Urgency badge */}
      {config?.urgency && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="w-full flex items-center gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200"
        >
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden />
          <p className="text-sm font-semibold text-amber-800">{config.urgency}</p>
        </motion.div>
      )}

      {/* Primary CTA */}
      {config && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
          className="w-full"
        >
          <a
            href={config.ctaUrl ?? '#'}
            className="btn-cta w-full"
            aria-label={config.cta}
          >
            {config.cta}
            <ArrowRight className="w-5 h-5 flex-shrink-0" aria-hidden />
          </a>
        </motion.div>
      )}

      {/* Calendly embed button */}
      {config?.calendlyUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
          className="w-full"
        >
          <a
            href={config.calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center justify-center gap-2 w-full min-h-[52px] px-6 py-3',
              'rounded-2xl border-2 font-semibold text-base transition-all duration-200',
              'hover:shadow-card-hover active:scale-[0.98]',
              colors.border,
              colors.text,
              colors.bg,
            )}
          >
            <Clock className="w-4 h-4" aria-hidden />
            Agendar una llamada gratuita
          </a>
        </motion.div>
      )}

      {/* Social proof micro-copy */}
      <p className="text-xs text-slate-400 text-center pb-4">
        Más de 1,200 negocios LATAM ya optimizaron su embudo con este diagnóstico
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component — polling logic
// ---------------------------------------------------------------------------

interface PersonalizedResultsPageProps {
  leadId:     string
  tenantSlug: string
}

const POLL_INTERVAL_MS  = 2000
const MAX_POLL_ATTEMPTS = 30   // 60 seconds max

export function PersonalizedResultsPage({ leadId, tenantSlug }: PersonalizedResultsPageProps) {
  const [result, setResult]   = useState<QuizResultPayload | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const attemptsRef            = useRef(0)
  const timerRef               = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = useCallback(async () => {
    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      setError('El análisis está tardando más de lo esperado. Por favor recarga la página.')
      return
    }

    attemptsRef.current += 1

    try {
      const data = await getPublicQuizResult(leadId)
      setResult(data)

      if (data.status === 'ready') {
        setIsReady(true)
      } else {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      }
    } catch {
      // Retry on transient errors, give up after max attempts
      timerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
    }
  }, [leadId])

  useEffect(() => {
    poll()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [poll])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-500" aria-hidden />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Algo salió mal</h2>
        <p className="text-slate-600 text-sm max-w-xs">{error}</p>
        <button
          onClick={() => { attemptsRef.current = 0; setError(null); poll() }}
          className="btn-cta px-6 text-base"
        >
          Intentar de nuevo
        </button>
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {!isReady ? (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnalyzingLoader />
        </motion.div>
      ) : (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {result && <ResultsView data={result} />}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  CheckCircle2,
  ArrowRight,
  Flame,
  Zap,
  TrendingUp,
  Clock,
  AlertTriangle,
  Target,
} from 'lucide-react'
import { cn, SEGMENT_COLORS, SEGMENT_NAMES, type SegmentKey } from '@/lib/utils'
import type { SegmentResultConfig } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Animated SVG score gauge
// ---------------------------------------------------------------------------

interface ScoreGaugeProps {
  score:       number   // 0–100
  segmentHex:  string
  size?:       number
}

function ScoreGauge({ score, segmentHex, size = 160 }: ScoreGaugeProps) {
  const [animated, setAnimated] = useState(0)
  const ref    = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true })

  const radius      = (size - 20) / 2
  const circumference = 2 * Math.PI * radius
  // Arc covers 270° (from 135° to 405°) — standard gauge style
  const arcLength   = circumference * 0.75
  const offset      = arcLength - (animated / 100) * arcLength

  useEffect(() => {
    if (!inView) return
    let start: number | null = null
    const duration = 1500

    function step(timestamp: number) {
      if (!start) start = timestamp
      const elapsed  = timestamp - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3)
      setAnimated(eased * score)
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [inView, score])

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label={`Score: ${score} de 100`}
      role="img"
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="14"
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(135 ${size / 2} ${size / 2})`}
      />
      {/* Animated progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={segmentHex}
        strokeWidth="14"
        strokeDasharray={`${arcLength} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(135 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
      />
      {/* Score text */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-extrabold"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        <tspan
          x="50%"
          dy="-6"
          fontSize={size < 140 ? 28 : 36}
          fontWeight={800}
          fill={segmentHex}
        >
          {Math.round(animated)}
        </tspan>
        <tspan
          x="50%"
          dy="22"
          fontSize={12}
          fontWeight={600}
          fill="#94a3b8"
        >
          / 100
        </tspan>
      </text>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Recommendation icons
// ---------------------------------------------------------------------------
const RECOMMENDATION_ICONS = [Target, TrendingUp, Zap]

// ---------------------------------------------------------------------------
// Segment urgency icons
// ---------------------------------------------------------------------------
const SEGMENT_ICONS: Record<SegmentKey, React.ComponentType<{ className?: string }>> = {
  fuego:          Flame,
  caliente:       Zap,
  tibio:          TrendingUp,
  frio:           Clock,
  motor_detenido: AlertTriangle,
  sin_clasificar: Target,
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface LeadScoreCardProps {
  score:       number
  segment:     SegmentKey
  leadName:    string
  config:      SegmentResultConfig
  className?:  string
}

export function LeadScoreCard({
  score,
  segment,
  leadName,
  config,
  className,
}: LeadScoreCardProps) {
  const colors    = SEGMENT_COLORS[segment]
  const SegIcon   = SEGMENT_ICONS[segment]
  const recommendations = config.recommendations ?? []

  return (
    <div
      className={cn(
        'w-full max-w-lg mx-auto px-4 py-8 flex flex-col items-center gap-8',
        className,
      )}
    >
      {/* Top badge */}
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
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={cn(
          'flex flex-col items-center gap-3 p-6 rounded-3xl border-2',
          'bg-white shadow-card-hover w-full',
          colors.border,
        )}
      >
        <ScoreGauge score={score} segmentHex={colors.hex} />
        <p className="text-sm font-semibold text-slate-500">
          Tu puntuación de crecimiento
        </p>
      </motion.div>

      {/* Headline — personalized with lead name */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="text-center space-y-3"
      >
        <h1 className="text-2xl xs:text-3xl font-extrabold text-slate-900 leading-tight">
          {config.headline.replace('{nombre}', leadName)}
        </h1>
        {config.subheadline && (
          <p className="text-base text-slate-600 leading-relaxed">
            {config.subheadline.replace('{nombre}', leadName)}
          </p>
        )}
      </motion.div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
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
            {recommendations.slice(0, 3).map((rec, idx) => {
              const Icon = RECOMMENDATION_ICONS[idx] ?? CheckCircle2
              return (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.45 + idx * 0.08 }}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-2xl border',
                    'bg-white shadow-card',
                    colors.border,
                  )}
                >
                  <span
                    className={cn(
                      'flex-shrink-0 flex items-center justify-center',
                      'w-8 h-8 rounded-xl',
                      colors.bg,
                    )}
                    aria-hidden
                  >
                    <Icon className={cn('w-4 h-4', colors.text)} />
                  </span>
                  <p className="text-sm text-slate-700 font-medium leading-snug">{rec}</p>
                </motion.li>
              )
            })}
          </ul>
        </motion.div>
      )}

      {/* Urgency text */}
      {config.urgency && (
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

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="w-full"
      >
        <a
          href={config.ctaUrl ?? '#'}
          className={cn(
            'btn-cta w-full flex items-center justify-center gap-2',
          )}
          aria-label={config.cta}
        >
          {config.cta}
          <ArrowRight className="w-5 h-5 flex-shrink-0" aria-hidden />
        </a>
      </motion.div>

      {/* Social proof micro-copy */}
      <p className="text-xs text-slate-400 text-center">
        Más de 1,200 negocios LATAM ya optimizaron su embudo con este diagnóstico
      </p>
    </div>
  )
}

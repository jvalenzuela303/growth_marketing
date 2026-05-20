'use client'

/**
 * ScoreGauge — SVG arc gauge (180° half-circle) for the Personalized Results page.
 * Animates in on mount using requestAnimationFrame for smooth, jank-free fill.
 *
 * CRO Impact: Animated score reveal creates a moment of anticipation that
 * keeps leads engaged and increases emotional investment in the result,
 * boosting CTA click-through rates.
 */

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type { SegmentKey } from '@/lib/utils'

const SEGMENT_HEX: Record<SegmentKey, string> = {
  fuego:          '#10b981', // emerald-500
  caliente:       '#3b82f6', // blue-500
  tibio:          '#f59e0b', // amber-500
  frio:           '#64748b', // slate-500
  motor_detenido: '#6b7280', // gray-500
  sin_clasificar: '#9ca3af', // gray-400
}

interface ScoreGaugeProps {
  score:     number      // 0–100
  segment:   SegmentKey
  size?:     number      // SVG canvas size in px, default 200
  className?: string
}

export function ScoreGauge({ score, segment, size = 200, className }: ScoreGaugeProps) {
  const [animated, setAnimated] = useState(0)
  const rafRef = useRef<number | null>(null)
  const hex = SEGMENT_HEX[segment] ?? '#9ca3af'

  // Half-circle arc: 180° sweep from left to right across the top
  const cx = size / 2
  const cy = size / 2 + size * 0.05   // shift center down slightly so arc sits nicely
  const radius = (size * 0.38)
  const strokeWidth = size * 0.075

  // Build the 180° arc path (left → right, top semi-circle)
  function describeArc(pct: number) {
    if (pct <= 0) return ''
    const clampedPct = Math.min(pct, 1)
    // Start: leftmost point (-180°), End: rightmost point (0°)
    // We sweep clockwise for 180° × pct
    const startAngle = Math.PI          // 180° in radians — left
    const endAngle   = Math.PI - Math.PI * clampedPct  // moves counter-clockwise toward right

    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)

    const largeArc = clampedPct > 0.5 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`
  }

  // Full 180° track path
  const trackPath = describeArc(1)

  useEffect(() => {
    const duration = 1400
    let start: number | null = null

    function step(ts: number) {
      if (!start) start = ts
      const elapsed  = ts - start
      const progress = Math.min(elapsed / duration, 1)
      // Cubic ease-out
      const eased    = 1 - Math.pow(1 - progress, 3)
      setAnimated(eased * score)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [score])

  const progressPath = describeArc(animated / 100)

  return (
    <div
      className={cn('relative flex flex-col items-center', className)}
      role="img"
      aria-label={`Puntuación: ${score} de 100`}
    >
      <svg
        width={size}
        height={size * 0.6}
        viewBox={`0 0 ${size} ${size * 0.6}`}
        overflow="visible"
      >
        {/* Background track */}
        <path
          d={trackPath}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Colored progress arc */}
        {progressPath && (
          <path
            d={progressPath}
            fill="none"
            stroke={hex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.1s linear' }}
          />
        )}
        {/* Score number centered below arc apex */}
        <text
          x={cx}
          y={cy - radius * 0.15}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 800, fontSize: size * 0.2, fill: hex }}
        >
          {Math.round(animated)}
        </text>
        <text
          x={cx}
          y={cy + size * 0.1}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, fontSize: size * 0.065, fill: '#94a3b8' }}
        >
          / 100
        </text>
      </svg>

      {/* Min / Max labels */}
      <div
        className="flex justify-between w-full px-1"
        aria-hidden
        style={{ marginTop: `-${size * 0.08}px` }}
      >
        <span className="text-xs text-slate-400 font-medium">0</span>
        <span className="text-xs text-slate-400 font-medium">100</span>
      </div>
    </div>
  )
}

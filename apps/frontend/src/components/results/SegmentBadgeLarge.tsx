'use client'

/**
 * SegmentBadgeLarge — Hero-sized segment identity card for the results page.
 * Displays segment name, emoji icon, and marketing description.
 *
 * CRO Impact: Large visual segment identity ("Listo para comprar") creates a
 * strong identity affirmation that mirrors the lead's self-image, building
 * emotional commitment before the CTA is shown — proven to lift click rates.
 */

import { cn, type SegmentKey } from '@/lib/utils'

interface SegmentMeta {
  label:       string
  description: string
  emoji:       string
  colorClasses: {
    bg:     string
    border: string
    text:   string
    label:  string
    badge:  string
  }
}

const SEGMENT_META: Record<SegmentKey, SegmentMeta> = {
  fuego: {
    label:       'Listo para comprar',
    description: 'Tu embudo está optimizado y tu mercado está caliente. Es el momento ideal para escalar con estrategia.',
    emoji:       '🔥',
    colorClasses: {
      bg:     'bg-emerald-50',
      border: 'border-emerald-200',
      text:   'text-emerald-700',
      label:  'text-emerald-900',
      badge:  'bg-emerald-100 text-emerald-800',
    },
  },
  caliente: {
    label:       'Alto potencial',
    description: 'Tienes bases sólidas y el potencial de crecimiento es claro. Pequeñas optimizaciones producirán grandes resultados.',
    emoji:       '⚡',
    colorClasses: {
      bg:     'bg-blue-50',
      border: 'border-blue-200',
      text:   'text-blue-700',
      label:  'text-blue-900',
      badge:  'bg-blue-100 text-blue-800',
    },
  },
  tibio: {
    label:       'En evaluación',
    description: 'Tu embudo tiene tracción pero existen puntos de fuga claros. Con el plan correcto puedes duplicar resultados.',
    emoji:       '🌡️',
    colorClasses: {
      bg:     'bg-amber-50',
      border: 'border-amber-200',
      text:   'text-amber-700',
      label:  'text-amber-900',
      badge:  'bg-amber-100 text-amber-800',
    },
  },
  frio: {
    label:       'Explorando opciones',
    description: 'Estás en la fase de construcción. Cada acción correcta ahora construirá la base de un embudo rentable.',
    emoji:       '🧊',
    colorClasses: {
      bg:     'bg-slate-50',
      border: 'border-slate-200',
      text:   'text-slate-600',
      label:  'text-slate-800',
      badge:  'bg-slate-100 text-slate-700',
    },
  },
  motor_detenido: {
    label:       'Motor detenido',
    description: 'El punto de partida es el momento más importante. Con la estrategia correcta, arrancar bien lo cambia todo.',
    emoji:       '🛑',
    colorClasses: {
      bg:     'bg-gray-50',
      border: 'border-gray-200',
      text:   'text-gray-600',
      label:  'text-gray-800',
      badge:  'bg-gray-100 text-gray-700',
    },
  },
  sin_clasificar: {
    label:       'Diagnóstico listo',
    description: 'Hemos analizado tus respuestas y tenemos recomendaciones específicas para tu negocio.',
    emoji:       '📊',
    colorClasses: {
      bg:     'bg-gray-50',
      border: 'border-gray-200',
      text:   'text-gray-500',
      label:  'text-gray-800',
      badge:  'bg-gray-100 text-gray-600',
    },
  },
}

interface SegmentBadgeLargeProps {
  segment:   SegmentKey
  className?: string
}

export function SegmentBadgeLarge({ segment, className }: SegmentBadgeLargeProps) {
  const meta = SEGMENT_META[segment] ?? SEGMENT_META.sin_clasificar

  return (
    <div
      className={cn(
        'flex items-center gap-4 w-full p-5 rounded-2xl border-2',
        meta.colorClasses.bg,
        meta.colorClasses.border,
        className,
      )}
      role="status"
      aria-label={`Segmento: ${meta.label}`}
    >
      {/* Emoji icon circle */}
      <span
        className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-card text-3xl"
        aria-hidden
      >
        {meta.emoji}
      </span>

      {/* Text */}
      <div className="min-w-0 flex flex-col gap-1">
        <span
          className={cn(
            'inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide w-fit',
            meta.colorClasses.badge,
          )}
        >
          Tu segmento
        </span>
        <p className={cn('text-xl font-extrabold leading-tight', meta.colorClasses.label)}>
          {meta.label}
        </p>
        <p className={cn('text-sm leading-relaxed', meta.colorClasses.text)}>
          {meta.description}
        </p>
      </div>
    </div>
  )
}

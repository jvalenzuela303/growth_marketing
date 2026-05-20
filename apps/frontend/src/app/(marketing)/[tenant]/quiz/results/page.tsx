import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFunnelConfig } from '@/lib/api'
import { LeadScoreCard } from '@/components/results/LeadScoreCard'
import { PersonalizedResultsPage } from '@/components/results/PersonalizedResultsPage'
import type { SegmentKey } from '@/lib/utils'
import type { SegmentResultConfig } from '@growth-engine/shared-types'

// Opt out of static generation — results are always dynamic
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu diagnóstico de embudo — The Growth Engine',
  description: 'Tus resultados personalizados están listos.',
  robots: { index: false },
}

// ---------------------------------------------------------------------------
// Default results config — shown when backend config is unavailable
// ---------------------------------------------------------------------------

const DEFAULT_RESULTS: Record<SegmentKey, SegmentResultConfig> = {
  fuego: {
    headline:        '{nombre}, tu embudo está listo para escalar al siguiente nivel',
    subheadline:     'Tienes una base sólida. Ahora es momento de multiplicar resultados con la estrategia correcta.',
    cta:             'Hablar con un estratega ahora',
    ctaUrl:          '#agenda',
    urgency:         'Solo 3 cupos disponibles esta semana para consultoría personalizada.',
    recommendations: [
      'Implementa un sistema de lead scoring automático para priorizar contactos',
      'Escala tu presupuesto de ads en un 30% manteniendo el ROAS actual',
      'Agrega una secuencia de 5 mensajes de WhatsApp post-captura',
    ],
  },
  caliente: {
    headline:        '{nombre}, estás a solo 2 pasos de un embudo de alta conversión',
    subheadline:     'Tus fundamentos son buenos. Estas optimizaciones específicas cambiarán tus números esta semana.',
    cta:             'Ver mi plan de optimización',
    ctaUrl:          '#plan',
    urgency:         'Esta oferta de revisión gratuita vence en 48 horas.',
    recommendations: [
      'Reduce el tiempo de respuesta a leads a menos de 5 minutos con automatización',
      'Añade testimonios en video a tu landing page para aumentar conversión',
      'Configura retargeting con audiencias lookalike de tus mejores clientes',
    ],
  },
  tibio: {
    headline:        '{nombre}, encontramos 3 fugas claras en tu embudo',
    subheadline:     'Hay oportunidades de mejora significativas. Aquí está exactamente qué hacer primero.',
    cta:             'Descargar mi plan de acción gratuito',
    ctaUrl:          '#descarga',
    urgency:         '',
    recommendations: [
      'Define y documenta tu proceso de ventas antes de invertir más en publicidad',
      'Implementa un formulario de calificación en tu landing page',
      'Crea una secuencia automática de seguimiento de al menos 3 mensajes',
    ],
  },
  frio: {
    headline:        '{nombre}, tu embudo necesita una base sólida antes de escalar',
    subheadline:     'La buena noticia: los problemas son identificables y corregibles. Empecemos por lo más importante.',
    cta:             'Ver recursos gratuitos para empezar',
    ctaUrl:          '#recursos',
    urgency:         '',
    recommendations: [
      'Establece métricas básicas: CPL, tasa de conversión y tiempo de respuesta',
      'Crea una landing page dedicada con un único CTA claro',
      'Define tu cliente ideal (ICP) antes de invertir en publicidad',
    ],
  },
  motor_detenido: {
    headline:        '{nombre}, el primer paso es construir la base correcta',
    subheadline:     'No te preocupes — todos empiezan desde algún punto. Aquí tienes un plan claro para arrancar.',
    cta:             'Ver la guía gratuita de inicio',
    ctaUrl:          '#guia',
    urgency:         '',
    recommendations: [
      'Comienza con un embudo simple: anuncio → landing page → formulario → seguimiento',
      'Define tu propuesta de valor única antes de crear cualquier anuncio',
      'Aprende los 5 KPIs que todo embudo debe medir desde el día 1',
    ],
  },
  sin_clasificar: {
    headline:        '{nombre}, aquí están tus resultados',
    subheadline:     'Basado en tus respuestas, tenemos recomendaciones personalizadas para ti.',
    cta:             'Contactar a un especialista',
    ctaUrl:          '#contacto',
    urgency:         '',
    recommendations: [
      'Analiza tu funnel actual con métricas reales',
      'Identifica los principales puntos de fuga',
      'Implementa cambios uno a la vez para medir el impacto',
    ],
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface ResultsPageProps {
  params:      { tenant: string }
  searchParams: {
    score?:   string
    segment?: string
    leadId?:  string
    name?:    string
  }
}

export default async function ResultsPage({
  params,
  searchParams,
}: ResultsPageProps) {
  const rawScore   = parseInt(searchParams.score   ?? '0', 10)
  const rawSegment = (searchParams.segment ?? 'sin_clasificar') as SegmentKey
  const leadName   = searchParams.name ?? 'tú'

  // Validate score range
  const score   = Math.min(100, Math.max(0, isNaN(rawScore) ? 0 : rawScore))
  const segment: SegmentKey = [
    'fuego', 'caliente', 'tibio', 'frio', 'motor_detenido', 'sin_clasificar',
  ].includes(rawSegment)
    ? rawSegment
    : 'sin_clasificar'

  // Try to load tenant-specific results config
  let segmentConfig: SegmentResultConfig = DEFAULT_RESULTS[segment]

  try {
    const funnel = await getFunnelConfig(params.tenant, 'default', true)
    const funnelSegmentConfig = funnel.resultsConfig.segments[segment as keyof typeof funnel.resultsConfig.segments]
    if (funnelSegmentConfig) segmentConfig = funnelSegmentConfig
  } catch {
    // Use defaults
  }

  // If a leadId is present, delegate to PersonalizedResultsPage which polls
  // the backend for AI-generated results rather than using URL params.
  if (searchParams.leadId) {
    return (
      <main className="min-h-screen bg-white">
        <PersonalizedResultsPage
          leadId={searchParams.leadId}
          tenantSlug={params.tenant}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white py-8">
      <LeadScoreCard
        score={score}
        segment={segment}
        leadName={leadName}
        config={segmentConfig}
      />
    </main>
  )
}

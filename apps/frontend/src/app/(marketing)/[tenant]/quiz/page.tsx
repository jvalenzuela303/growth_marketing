import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getFunnelConfig } from '@/lib/api'
import { QuizFunnel } from '@/components/quiz/QuizFunnel'

export const metadata: Metadata = {
  title: 'Diagnóstico de tu embudo — The Growth Engine',
  description: 'Responde estas preguntas para obtener tu diagnóstico personalizado de crecimiento.',
  robots: { index: false }, // quiz page should not be indexed
}

interface QuizPageProps {
  params: { tenant: string }
}

/**
 * Server Component — fetches funnel config at request time (no caching so
 * config changes publish immediately without a redeploy).
 *
 * If the funnel is not found or the backend is unavailable, renders a
 * graceful fallback demo config so the funnel always works during development.
 */
export default async function QuizPage({ params }: QuizPageProps) {
  let funnel

  try {
    funnel = await getFunnelConfig(params.tenant, 'default', true)
  } catch {
    // Use a demo quiz config so the UI works even without backend
    funnel = getDemoFunnelConfig()
  }

  if (!funnel) notFound()

  return (
    <QuizFunnel
      config={funnel.quizConfig}
      tenantSlug={params.tenant}
      funnelSlug={funnel.slug}
    />
  )
}

// ---------------------------------------------------------------------------
// Demo config — used in development when backend is not running
// ---------------------------------------------------------------------------

function getDemoFunnelConfig() {
  return {
    id:       'demo',
    tenantId: 'demo',
    slug:     'default',
    name:     'Diagnóstico de Embudo',
    status:   'active' as const,
    totalViews:       0,
    totalStarts:      0,
    totalCompletions: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    landingConfig: {
      headline:   '¿Sabes por qué tu embudo pierde dinero cada mes?',
      ctaText:    'Hacer mi diagnóstico gratis',
      theme:      'dark',
    },
    resultsConfig: {
      segments: {
        fuego:          { headline: '{nombre}, tu embudo está listo para escalar 🔥', cta: 'Hablar con un estratega ahora', urgency: 'Cupos limitados esta semana' },
        caliente:       { headline: '{nombre}, estás muy cerca del siguiente nivel', cta: 'Ver mi plan de optimización', urgency: 'Esta oferta vence en 48h' },
        tibio:          { headline: '{nombre}, hay 3 fugas claras en tu embudo', cta: 'Descargar mi plan gratuito', urgency: '' },
        frio:           { headline: '{nombre}, tu embudo necesita una base sólida', cta: 'Ver recursos gratuitos', urgency: '' },
        motor_detenido: { headline: '{nombre}, empecemos desde cero juntos', cta: 'Ver la guía de inicio', urgency: '' },
      },
    },
    quizConfig: {
      title:            'Diagnóstico de Embudo',
      leadGatePosition: 5,
      questions: [
        {
          id: 'q1', index: 0, type: 'single_choice' as const,
          text: '¿Cuánto inviertes mensualmente en publicidad digital?',
          maxPoints: 10, weight: 1.5, required: true, scoringCategory: 'demographic' as const,
          options: [
            { id: 'q1a', text: 'Menos de $100.000 CLP',      points: 2, skipToStep: undefined, metadata: {} },
            { id: 'q1b', text: '$100.000 – $500.000 CLP',    points: 5, skipToStep: undefined, metadata: {} },
            { id: 'q1c', text: '$500.000 – $2.000.000 CLP',  points: 8, skipToStep: undefined, metadata: {} },
            { id: 'q1d', text: 'Más de $2.000.000 CLP',      points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q2', index: 1, type: 'single_choice' as const,
          text: '¿Cuál es tu tasa de conversión actual en la página de captura?',
          maxPoints: 10, weight: 2.0, required: true, scoringCategory: 'quiz' as const,
          options: [
            { id: 'q2a', text: 'No la sé / no la mido',       points: 1, skipToStep: undefined, metadata: {} },
            { id: 'q2b', text: 'Menos del 5%',                 points: 3, skipToStep: undefined, metadata: {} },
            { id: 'q2c', text: 'Entre 5% y 15%',               points: 6, skipToStep: undefined, metadata: {} },
            { id: 'q2d', text: 'Más del 15%',                  points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q3', index: 2, type: 'single_choice' as const,
          text: '¿Tienes un sistema automatizado de seguimiento post-captura?',
          maxPoints: 10, weight: 1.5, required: true, scoringCategory: 'quiz' as const,
          options: [
            { id: 'q3a', text: 'No tengo ningún sistema',                        points: 1, skipToStep: undefined, metadata: {} },
            { id: 'q3b', text: 'Sigo a mano cuando tengo tiempo',                points: 3, skipToStep: undefined, metadata: {} },
            { id: 'q3c', text: 'Tengo algunas automatizaciones básicas',         points: 7, skipToStep: undefined, metadata: {} },
            { id: 'q3d', text: 'Tengo secuencias completas de WhatsApp/email',   points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q4', index: 3, type: 'single_choice' as const,
          text: '¿Cuántos leads calificados genera tu embudo cada mes?',
          maxPoints: 10, weight: 1.0, required: true, scoringCategory: 'quiz' as const,
          options: [
            { id: 'q4a', text: 'Menos de 10',    points: 2, skipToStep: undefined, metadata: {} },
            { id: 'q4b', text: '10 – 50',         points: 4, skipToStep: undefined, metadata: {} },
            { id: 'q4c', text: '50 – 200',        points: 7, skipToStep: undefined, metadata: {} },
            { id: 'q4d', text: 'Más de 200',      points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q5', index: 4, type: 'single_choice' as const,
          text: '¿Mides el ROAS (retorno sobre inversión publicitaria) de tus campañas?',
          maxPoints: 10, weight: 1.5, required: true, scoringCategory: 'behavior' as const,
          options: [
            { id: 'q5a', text: 'No sé qué es el ROAS',                    points: 1, skipToStep: undefined, metadata: {} },
            { id: 'q5b', text: 'Lo sé pero no lo mido activamente',        points: 3, skipToStep: undefined, metadata: {} },
            { id: 'q5c', text: 'Lo mido pero no actúo sobre él',           points: 6, skipToStep: undefined, metadata: {} },
            { id: 'q5d', text: 'Lo optimizo semanalmente por campaña',     points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q6', index: 5, type: 'single_choice' as const,
          text: '¿Tu equipo de ventas tiene un proceso definido para contactar leads?',
          maxPoints: 10, weight: 1.0, required: true, scoringCategory: 'behavior' as const,
          options: [
            { id: 'q6a', text: 'No hay proceso, cada quien hace lo suyo',     points: 1, skipToStep: undefined, metadata: {} },
            { id: 'q6b', text: 'Hay un proceso pero nadie lo sigue',           points: 3, skipToStep: undefined, metadata: {} },
            { id: 'q6c', text: 'Tenemos un proceso y se sigue parcialmente',   points: 6, skipToStep: undefined, metadata: {} },
            { id: 'q6d', text: 'Proceso documentado y seguido al 100%',        points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q7', index: 6, type: 'single_choice' as const,
          text: '¿Qué tan rápido contactas a un lead nuevo?',
          maxPoints: 10, weight: 2.0, required: true, scoringCategory: 'engagement' as const,
          options: [
            { id: 'q7a', text: 'Días después o no los contactamos',   points: 1, skipToStep: undefined, metadata: {} },
            { id: 'q7b', text: 'Dentro de 24 horas',                  points: 4, skipToStep: undefined, metadata: {} },
            { id: 'q7c', text: 'En menos de 1 hora',                  points: 7, skipToStep: undefined, metadata: {} },
            { id: 'q7d', text: 'En menos de 5 minutos (automatizado)',points: 10, skipToStep: undefined, metadata: {} },
          ],
        },
        {
          id: 'q8', index: 7, type: 'single_choice' as const,
          text: '¿Cuál es tu mayor obstáculo para escalar tus ventas ahora mismo?',
          maxPoints: 10, weight: 1.0, required: true, scoringCategory: 'demographic' as const,
          options: [
            { id: 'q8a', text: 'Generar más tráfico',                         points: 5, skipToStep: undefined, metadata: {} },
            { id: 'q8b', text: 'Convertir mejor los leads que ya tengo',      points: 7, skipToStep: undefined, metadata: {} },
            { id: 'q8c', text: 'Automatizar y escalar sin perder calidad',    points: 8, skipToStep: undefined, metadata: {} },
            { id: 'q8d', text: 'Reducir el costo de adquisición',             points: 6, skipToStep: undefined, metadata: {} },
          ],
        },
      ],
    },
  }
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Star, TrendingUp, Users, Zap } from 'lucide-react'
import { getFunnelConfig } from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: { tenant: string }
}): Promise<Metadata> {
  return {
    title: '¿Sabes por qué tu embudo pierde dinero cada mes?',
    description:
      'Toma el diagnóstico gratuito de 2 minutos y descubre exactamente qué está frenando el crecimiento de tu negocio.',
    openGraph: {
      title: '¿Sabes por qué tu embudo pierde dinero cada mes?',
      description: 'Diagnóstico gratuito para negocios LATAM. Resultados personalizados en 2 minutos.',
      type: 'website',
    },
  }
}

// ---------------------------------------------------------------------------
// Static data fallback — shown when backend is unavailable
// ---------------------------------------------------------------------------

const DEFAULT_LANDING = {
  headline:     '¿Sabes por qué tu embudo pierde dinero cada mes?',
  subheadline:  'Responde 8 preguntas y descubre exactamente qué está frenando tu crecimiento — con un plan de acción personalizado.',
  ctaText:      'Hacer mi diagnóstico gratis',
  socialProof:  { count: 1247, label: 'negocios LATAM ya lo hicieron' },
  trustSignals: ['Sin tarjeta de crédito', 'Resultados en 2 minutos', '100% gratis'],
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrustBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden />
      {text}
    </span>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
}
function StatCard({ icon: Icon, value, label }: StatCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 p-4 rounded-2xl bg-white/5 border border-white/10">
      <Icon className="w-5 h-5 text-accent-400 mb-1" aria-hidden />
      <span className="text-2xl font-extrabold text-white">{value}</span>
      <span className="text-xs text-white/60 text-center">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TenantLandingPage({
  params,
}: {
  params: { tenant: string }
}) {
  // Try to load funnel config — gracefully fall back to defaults
  let landing = DEFAULT_LANDING
  let funnelSlug = 'default'

  try {
    // Most tenants have a 'default' funnel; adjust slug convention as needed
    const funnel = await getFunnelConfig(params.tenant, 'default', true)
    landing = {
      headline:     funnel.landingConfig.headline,
      subheadline:  funnel.landingConfig.subheadline ?? DEFAULT_LANDING.subheadline,
      ctaText:      funnel.landingConfig.ctaText,
      socialProof:  funnel.landingConfig.socialProof ?? DEFAULT_LANDING.socialProof,
      trustSignals: funnel.landingConfig.trustSignals ?? DEFAULT_LANDING.trustSignals,
    }
    funnelSlug = funnel.slug
  } catch {
    // Backend not available during build or funnel not found — use defaults
  }

  const quizUrl = `/${params.tenant}/quiz`

  return (
    <main className="min-h-screen bg-gradient-hero overflow-x-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* ATTENTION — Hero section (above the fold, LCP target: headline)    */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-label="Hero"
        className="relative flex flex-col items-center justify-center min-h-[100svh] px-4 py-16 text-center"
      >
        {/* Gradient orb — decorative */}
        <div
          aria-hidden
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-brand-600/20 blur-[120px]" />
          <div className="absolute bottom-[5%] right-[-10%] w-[300px] h-[300px] rounded-full bg-accent-500/15 blur-[80px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center gap-6">
          {/* Social proof pill — ATTENTION builder */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm text-white/80">
            <span className="flex gap-0.5" aria-hidden>
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </span>
            <span>
              {landing.socialProof.count.toLocaleString('es-CL')}+ {landing.socialProof.label}
            </span>
          </div>

          {/* Headline — primary LCP element, pre-rendered server-side */}
          <h1 className="text-3xl xs:text-4xl md:text-5xl font-extrabold text-white leading-tight">
            {landing.headline}
          </h1>

          {/* Subheadline */}
          <p className="text-base xs:text-lg text-white/75 leading-relaxed max-w-xl">
            {landing.subheadline}
          </p>

          {/* Primary CTA — minimum 56px, full-width on mobile */}
          <Link
            href={quizUrl}
            className={cn(
              'btn-cta w-full xs:w-auto px-10',
              'text-lg font-extrabold tracking-tight',
            )}
            aria-label={landing.ctaText}
          >
            {landing.ctaText}
            <ArrowRight className="w-5 h-5" aria-hidden />
          </Link>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {landing.trustSignals.map((signal) => (
              <TrustBadge key={signal} text={signal} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* INTEREST — Stats strip                                              */}
      {/* ------------------------------------------------------------------ */}
      <section aria-label="Resultados de la plataforma" className="px-4 py-12">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-3">
          <StatCard icon={Users}      value="1,247+"  label="Negocios diagnosticados" />
          <StatCard icon={TrendingUp} value="3.4×"    label="Mejora promedio en conversión" />
          <StatCard icon={Zap}        value="2 min"   label="Para obtener tu diagnóstico" />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* DESIRE — Pain points + What you'll get                             */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-label="Qué descubrirás"
        className="px-4 py-12"
      >
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl xs:text-3xl font-bold text-white text-center leading-tight">
            La mayoría de los embudos pierden dinero por las mismas 3 razones
          </h2>

          <div className="grid gap-4">
            {[
              {
                emoji: '💸',
                title: 'Tráfico sin calificar',
                desc:  'Pagas por clics de personas que nunca van a comprar. Tu costo por lead sube y tu ROAS cae.',
              },
              {
                emoji: '🚫',
                title: 'Fricción en el proceso',
                desc:  'Cada paso de más en tu embudo mata un porcentaje de tus conversiones. ¿Sabes cuántos pasos tiene el tuyo?',
              },
              {
                emoji: '🤐',
                title: 'Sin seguimiento inteligente',
                desc:  'El 80% de las ventas ocurren después del 5to contacto. La mayoría abandona en el primero.',
              },
            ].map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/10"
              >
                <span className="text-3xl flex-shrink-0" aria-hidden>{emoji}</span>
                <div className="space-y-1">
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="text-sm text-white/65 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* ACTION — Bottom CTA with urgency                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        aria-label="Llamada a la acción final"
        className="px-4 py-16 text-center"
      >
        <div className="max-w-lg mx-auto space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-400">
              Diagnóstico gratuito
            </p>
            <h2 className="text-2xl xs:text-3xl font-extrabold text-white leading-tight">
              Descubre exactamente qué está frenando tu crecimiento
            </h2>
            <p className="text-white/65 text-base">
              8 preguntas · 2 minutos · Plan de acción personalizado
            </p>
          </div>

          <Link
            href={quizUrl}
            className="btn-cta w-full text-lg font-extrabold"
            aria-label={landing.ctaText}
          >
            {landing.ctaText}
            <ArrowRight className="w-5 h-5" aria-hidden />
          </Link>

          <p className="text-xs text-white/40">
            Sin spam. Sin tarjeta de crédito. Resultados reales.
          </p>
        </div>
      </section>
    </main>
  )
}

'use client'

/**
 * HeroSectionEditor — edits the hero section fields inline.
 */

import { useLandingBuilderStore } from '@/stores/landing-builder-store'
import type { HeroContent, LandingSection } from '@/stores/landing-builder-store'

interface HeroSectionEditorProps {
  section: LandingSection
}

export function HeroSectionEditor({ section }: HeroSectionEditorProps) {
  const updateSection = useLandingBuilderStore((s) => s.updateSection)
  const content = section.content as unknown as HeroContent

  function update(field: keyof HeroContent, value: string) {
    updateSection(section.id, { [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="hero-headline">
          Titular principal
        </label>
        <textarea
          id="hero-headline"
          rows={2}
          value={content.headline}
          onChange={(e) => update('headline', e.target.value)}
          placeholder="¿Listo para escalar tu negocio?"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="hero-sub">
          Subtítulo
        </label>
        <textarea
          id="hero-sub"
          rows={3}
          value={content.subheadline}
          onChange={(e) => update('subheadline', e.target.value)}
          placeholder="Describe el beneficio principal…"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="hero-cta">
          Texto del botón CTA
        </label>
        <input
          id="hero-cta"
          type="text"
          value={content.ctaText}
          onChange={(e) => update('ctaText', e.target.value)}
          placeholder="Hacer mi diagnóstico gratis"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="hero-bg">
          URL imagen de fondo (opcional)
        </label>
        <input
          id="hero-bg"
          type="url"
          value={content.bgImageUrl}
          onChange={(e) => update('bgImageUrl', e.target.value)}
          placeholder="https://…"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
        {content.bgImageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={content.bgImageUrl}
            alt="Vista previa de fondo"
            className="w-full h-20 object-cover rounded-xl border border-slate-200 mt-1"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
      </div>
    </div>
  )
}

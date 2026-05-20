'use client'

/**
 * CTASectionEditor — edits the bottom CTA section fields.
 */

import { useLandingBuilderStore } from '@/stores/landing-builder-store'
import type { CTABottomContent, LandingSection } from '@/stores/landing-builder-store'

interface CTASectionEditorProps {
  section: LandingSection
}

const PRESET_COLORS = [
  { label: 'Oscuro',   value: '#1a0629' },
  { label: 'Brand',    value: '#8b24b0' },
  { label: 'Acento',   value: '#ea580c' },
  { label: 'Emerald',  value: '#059669' },
  { label: 'Slate',    value: '#0f172a' },
]

export function CTASectionEditor({ section }: CTASectionEditorProps) {
  const updateSection = useLandingBuilderStore((s) => s.updateSection)
  const content = section.content as unknown as CTABottomContent

  function update(field: keyof CTABottomContent, value: string) {
    updateSection(section.id, { [field]: value })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="cta-headline">
          Titular del CTA
        </label>
        <textarea
          id="cta-headline"
          rows={2}
          value={content.headline}
          onChange={(e) => update('headline', e.target.value)}
          placeholder="¿Listo para transformar tu embudo?"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="cta-btn-text">
          Texto del botón
        </label>
        <input
          id="cta-btn-text"
          type="text"
          value={content.buttonText}
          onChange={(e) => update('buttonText', e.target.value)}
          placeholder="Empezar ahora gratis"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="cta-btn-url">
          URL del botón
        </label>
        <input
          id="cta-btn-url"
          type="text"
          value={content.buttonUrl}
          onChange={(e) => update('buttonUrl', e.target.value)}
          placeholder="#quiz o https://…"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Color de fondo
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => update('backgroundColor', value)}
              title={label}
              aria-label={`Color ${label}`}
              aria-pressed={content.backgroundColor === value}
              className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-400"
              style={{
                backgroundColor: value,
                borderColor: content.backgroundColor === value ? '#c44df0' : '#e2e8f0',
              }}
            />
          ))}
          {/* Custom color picker */}
          <label
            className="w-8 h-8 rounded-lg border-2 border-slate-200 overflow-hidden cursor-pointer hover:border-brand-300 transition-colors"
            aria-label="Color personalizado"
            title="Color personalizado"
          >
            <input
              type="color"
              value={content.backgroundColor}
              onChange={(e) => update('backgroundColor', e.target.value)}
              className="w-full h-full opacity-0 absolute"
              aria-hidden
            />
            <div
              className="w-full h-full"
              style={{ backgroundColor: content.backgroundColor }}
            />
          </label>
        </div>

        {/* Live preview strip */}
        <div
          className="w-full h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: content.backgroundColor }}
        >
          <span className="text-xs text-white font-semibold opacity-80">
            {content.buttonText || 'Vista previa'}
          </span>
        </div>
      </div>
    </div>
  )
}

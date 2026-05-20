'use client'

/**
 * SocialProofSectionEditor — manage testimonials and logo list.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useLandingBuilderStore } from '@/stores/landing-builder-store'
import type { SocialProofContent, Testimonial, LandingSection } from '@/stores/landing-builder-store'
import { generateSessionId, cn } from '@/lib/utils'

interface SocialProofSectionEditorProps {
  section: LandingSection
}

export function SocialProofSectionEditor({ section }: SocialProofSectionEditorProps) {
  const updateSection = useLandingBuilderStore((s) => s.updateSection)
  const content = section.content as unknown as SocialProofContent

  function updateTestimonial(id: string, field: keyof Testimonial, value: string) {
    const testimonials = content.testimonials.map((t) =>
      t.id === id ? { ...t, [field]: value } : t,
    )
    updateSection(section.id, { ...content, testimonials })
  }

  function addTestimonial() {
    const testimonials = [
      ...content.testimonials,
      { id: generateSessionId(), name: 'Nombre', role: 'Cargo, Empresa', text: 'Testimonio aquí…', avatarUrl: '' },
    ]
    updateSection(section.id, { ...content, testimonials })
  }

  function removeTestimonial(id: string) {
    const testimonials = content.testimonials.filter((t) => t.id !== id)
    updateSection(section.id, { ...content, testimonials })
  }

  function addLogo() {
    const logos = [...content.logos, { id: generateSessionId(), url: '', alt: '' }]
    updateSection(section.id, { ...content, logos })
  }

  function updateLogo(id: string, field: 'url' | 'alt', value: string) {
    const logos = content.logos.map((l) => l.id === id ? { ...l, [field]: value } : l)
    updateSection(section.id, { ...content, logos })
  }

  function removeLogo(id: string) {
    const logos = content.logos.filter((l) => l.id !== id)
    updateSection(section.id, { ...content, logos })
  }

  return (
    <div className="space-y-5">
      {/* Testimonials */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Testimonios ({content.testimonials.length})
        </p>

        {content.testimonials.map((t, idx) => (
          <div key={t.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
              <button
                onClick={() => removeTestimonial(t.id)}
                aria-label="Eliminar testimonio"
                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
            {(['name', 'role', 'avatarUrl'] as const).map((field) => (
              <input
                key={field}
                type={field === 'avatarUrl' ? 'url' : 'text'}
                value={t[field]}
                onChange={(e) => updateTestimonial(t.id, field, e.target.value)}
                placeholder={
                  field === 'name' ? 'Nombre' :
                  field === 'role' ? 'Cargo, Empresa' :
                  'URL avatar (opcional)'
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            ))}
            <textarea
              rows={3}
              value={t.text}
              onChange={(e) => updateTestimonial(t.id, 'text', e.target.value)}
              placeholder="Texto del testimonio…"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
        ))}

        <button
          onClick={addTestimonial}
          className={cn(
            'flex items-center gap-1.5 w-full px-3 py-2.5 rounded-xl',
            'border-2 border-dashed border-slate-200 text-sm text-slate-500',
            'hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50',
            'transition-colors duration-150',
          )}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Agregar testimonio
        </button>
      </div>

      {/* Logos */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Logos de clientes ({content.logos.length})
        </p>

        {content.logos.map((logo) => (
          <div key={logo.id} className="flex gap-2 items-center p-2.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex-1 space-y-1.5">
              <input
                type="url"
                value={logo.url}
                onChange={(e) => updateLogo(logo.id, 'url', e.target.value)}
                placeholder="URL del logo"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              <input
                type="text"
                value={logo.alt}
                onChange={(e) => updateLogo(logo.id, 'alt', e.target.value)}
                placeholder="Nombre de la empresa"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <button
              onClick={() => removeLogo(logo.id)}
              aria-label="Eliminar logo"
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
        ))}

        <button
          onClick={addLogo}
          className={cn(
            'flex items-center gap-1.5 w-full px-3 py-2.5 rounded-xl',
            'border-2 border-dashed border-slate-200 text-sm text-slate-500',
            'hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50',
            'transition-colors duration-150',
          )}
        >
          <Plus className="w-4 h-4" aria-hidden />
          Agregar logo
        </button>
      </div>
    </div>
  )
}

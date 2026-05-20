'use client'

/**
 * LandingBuilderSidebar — right panel.
 * When a section is selected: renders the appropriate section editor.
 * When nothing selected: shows "Add section" options.
 *
 * CRO Impact: Contextual editor eliminates cognitive overload — operators
 * see only the controls relevant to the selected section, reducing errors
 * and speeding up iteration cycles.
 */

import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useLandingBuilderStore,
  type LandingSectionType,
} from '@/stores/landing-builder-store'
import { HeroSectionEditor } from './sections/HeroSectionEditor'
import { BenefitsSectionEditor } from './sections/BenefitsSectionEditor'
import { SocialProofSectionEditor } from './sections/SocialProofSectionEditor'
import { CTASectionEditor } from './sections/CTASectionEditor'

// ---------------------------------------------------------------------------
// Section type add buttons config
// ---------------------------------------------------------------------------

const ADDABLE_SECTIONS: { type: LandingSectionType; label: string; emoji: string; description: string }[] = [
  { type: 'hero',         label: 'Hero',            emoji: '🏠', description: 'Titular, subtítulo y botón principal' },
  { type: 'benefits',     label: 'Beneficios',      emoji: '✅', description: 'Lista de hasta 6 beneficios con iconos' },
  { type: 'social_proof', label: 'Prueba social',   emoji: '⭐', description: 'Testimonios y logos de clientes' },
  { type: 'faq',          label: 'FAQ',             emoji: '❓', description: 'Preguntas y respuestas frecuentes' },
  { type: 'cta_bottom',   label: 'CTA final',       emoji: '🎯', description: 'Llamada a la acción de cierre' },
]

const SECTION_TITLES: Record<LandingSectionType, string> = {
  hero:         'Editar Hero',
  benefits:     'Editar Beneficios',
  social_proof: 'Editar Prueba Social',
  faq:          'Editar FAQ',
  cta_bottom:   'Editar CTA Final',
}

// ---------------------------------------------------------------------------
// Section editor router
// ---------------------------------------------------------------------------

function SectionEditorRouter({ sectionId }: { sectionId: string }) {
  const section = useLandingBuilderStore((s) =>
    s.sections.find((sec) => sec.id === sectionId),
  )

  if (!section) return null

  switch (section.type) {
    case 'hero':         return <HeroSectionEditor section={section} />
    case 'benefits':     return <BenefitsSectionEditor section={section} />
    case 'social_proof': return <SocialProofSectionEditor section={section} />
    case 'cta_bottom':   return <CTASectionEditor section={section} />
    case 'faq':
      return (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-500 text-center">
          Editor de FAQ — próximamente
        </div>
      )
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function LandingBuilderSidebar() {
  const selectedSectionId = useLandingBuilderStore((s) => s.selectedSectionId)
  const addSection        = useLandingBuilderStore((s) => s.addSection)
  const selectSection     = useLandingBuilderStore((s) => s.selectSection)
  const sections          = useLandingBuilderStore((s) => s.sections)
  const selectedSection   = sections.find((s) => s.id === selectedSectionId)

  return (
    <div className="flex flex-col h-full">
      {selectedSectionId && selectedSection ? (
        <>
          {/* Editor header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">
              {SECTION_TITLES[selectedSection.type]}
            </h2>
            <button
              onClick={() => selectSection(null)}
              aria-label="Cerrar editor"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>

          {/* Editor body */}
          <div className="flex-1 overflow-y-auto p-4">
            <SectionEditorRouter sectionId={selectedSectionId} />
          </div>
        </>
      ) : (
        <>
          {/* Add section header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-700">Agregar sección</h2>
            <p className="text-xs text-slate-400 mt-0.5">Selecciona un tipo para añadirlo</p>
          </div>

          {/* Section type buttons */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {ADDABLE_SECTIONS.map(({ type, label, emoji, description }) => (
              <button
                key={type}
                onClick={() => addSection(type)}
                className={cn(
                  'flex items-center gap-3 w-full text-left p-3 rounded-2xl border transition-all duration-150',
                  'bg-white border-slate-100 hover:border-brand-200 hover:bg-brand-50 hover:shadow-card',
                  'focus-visible:ring-2 focus-visible:ring-brand-400',
                )}
              >
                <span className="text-2xl flex-shrink-0 w-9 text-center" aria-hidden>{emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 truncate">{description}</p>
                </div>
                <Plus className="w-4 h-4 text-slate-300 flex-shrink-0 ml-auto" aria-hidden />
              </button>
            ))}
          </div>

          {/* Color picker */}
          <PrimaryColorPicker />
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Primary color picker
// ---------------------------------------------------------------------------

const COLOR_PRESETS = [
  { label: 'Brand Purple', value: '#c44df0' },
  { label: 'Ocean Blue',   value: '#3b82f6' },
  { label: 'Emerald',      value: '#10b981' },
  { label: 'Coral',        value: '#f97316' },
  { label: 'Rose',         value: '#f43f5e' },
]

function PrimaryColorPicker() {
  const primaryColor   = useLandingBuilderStore((s) => s.primaryColor)
  const setPrimaryColor = useLandingBuilderStore((s) => s.setPrimaryColor)

  return (
    <div className="p-4 border-t border-slate-100 space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Color principal</p>
      <div className="flex items-center gap-2">
        {COLOR_PRESETS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setPrimaryColor(value)}
            aria-label={label}
            aria-pressed={primaryColor === value}
            className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-400"
            style={{
              backgroundColor: value,
              borderColor: primaryColor === value ? '#1e293b' : 'transparent',
            }}
          />
        ))}
        <label className="w-7 h-7 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-brand-300 transition-colors relative">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
          <div className="w-full h-full" style={{ backgroundColor: primaryColor }} />
        </label>
      </div>
    </div>
  )
}

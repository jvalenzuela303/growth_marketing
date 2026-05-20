'use client'

/**
 * LandingBuilderCanvas — left panel showing the ordered section list.
 * Each row has: drag handle, toggle (eye icon), section type label, edit button.
 *
 * CRO Impact: Visual section ordering gives operators instant control over
 * page structure, enabling rapid A/B testing of section sequence — a proven
 * lever for landing page CVR improvement.
 */

import { Eye, EyeOff, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useLandingBuilderStore,
  type LandingSection,
  type LandingSectionType,
} from '@/stores/landing-builder-store'

// ---------------------------------------------------------------------------
// Section type display map
// ---------------------------------------------------------------------------

const SECTION_LABELS: Record<LandingSectionType, string> = {
  hero:         'Hero principal',
  benefits:     'Beneficios',
  social_proof: 'Prueba social',
  faq:          'Preguntas frecuentes',
  cta_bottom:   'CTA final',
}

const SECTION_EMOJI: Record<LandingSectionType, string> = {
  hero:         '🏠',
  benefits:     '✅',
  social_proof: '⭐',
  faq:          '❓',
  cta_bottom:   '🎯',
}

// ---------------------------------------------------------------------------
// Section row
// ---------------------------------------------------------------------------

interface SectionRowProps {
  section:    LandingSection
  isSelected: boolean
  index:      number
  total:      number
}

function SectionRow({ section, isSelected, index, total }: SectionRowProps) {
  const { selectSection, toggleSection, removeSection, reorderSections } = useLandingBuilderStore()

  function handleMoveUp() {
    if (index === 0) return
    const store = useLandingBuilderStore.getState()
    const prev = store.sections.find((s) => s.order === index - 1)
    if (prev) reorderSections(section.id, prev.id)
  }

  function handleMoveDown() {
    if (index === total - 1) return
    const store = useLandingBuilderStore.getState()
    const next = store.sections.find((s) => s.order === index + 1)
    if (next) reorderSections(section.id, next.id)
  }

  return (
    <div
      className={cn(
        'group flex items-center gap-2 px-3 py-3 rounded-2xl border transition-all duration-150 cursor-pointer',
        isSelected
          ? 'bg-brand-50 border-brand-200 shadow-quiz'
          : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-card',
        !section.enabled && 'opacity-50',
      )}
      onClick={() => selectSection(isSelected ? null : section.id)}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`Sección: ${SECTION_LABELS[section.type]}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectSection(isSelected ? null : section.id) }}
    >
      {/* Drag handle / move controls */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); handleMoveUp() }}
          disabled={index === 0}
          aria-label="Mover arriba"
          className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
        >
          <GripVertical className="w-3 h-3 rotate-90" aria-hidden />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleMoveDown() }}
          disabled={index === total - 1}
          aria-label="Mover abajo"
          className="p-0.5 rounded text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors"
        >
          <GripVertical className="w-3 h-3 -rotate-90" aria-hidden />
        </button>
      </div>

      {/* Emoji icon */}
      <span className="text-lg flex-shrink-0 w-7 text-center" aria-hidden>
        {SECTION_EMOJI[section.type]}
      </span>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold truncate',
          isSelected ? 'text-brand-700' : 'text-slate-700',
        )}>
          {SECTION_LABELS[section.type]}
        </p>
        <p className="text-xs text-slate-400">
          {section.enabled ? 'Visible' : 'Oculto'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Edit */}
        <button
          onClick={(e) => { e.stopPropagation(); selectSection(section.id) }}
          aria-label="Editar sección"
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden />
        </button>

        {/* Toggle visibility */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleSection(section.id) }}
          aria-label={section.enabled ? 'Ocultar sección' : 'Mostrar sección'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          {section.enabled
            ? <Eye className="w-3.5 h-3.5" aria-hidden />
            : <EyeOff className="w-3.5 h-3.5" aria-hidden />
          }
        </button>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); removeSection(section.id) }}
          aria-label="Eliminar sección"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mini section preview
// ---------------------------------------------------------------------------

function SectionPreview({ type }: { type: LandingSectionType }) {
  const bars: Record<LandingSectionType, { widths: string[] }> = {
    hero:         { widths: ['w-2/3', 'w-1/2', 'w-1/3'] },
    benefits:     { widths: ['w-full', 'w-5/6', 'w-4/6'] },
    social_proof: { widths: ['w-1/2', 'w-2/3', 'w-1/2'] },
    faq:          { widths: ['w-full', 'w-5/6', 'w-full'] },
    cta_bottom:   { widths: ['w-1/2', 'w-1/3'] },
  }

  return (
    <div className="w-full h-8 rounded-lg bg-slate-50 border border-slate-100 px-2 flex flex-col justify-center gap-1 overflow-hidden">
      {bars[type].widths.map((w, i) => (
        <div key={i} className={cn('h-1 rounded-full bg-slate-200', w)} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

export function LandingBuilderCanvas() {
  const sections          = useLandingBuilderStore((s) => s.sections)
  const selectedSectionId = useLandingBuilderStore((s) => s.selectedSectionId)

  const sorted = [...sections].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-700">Estructura de la página</h2>
        <p className="text-xs text-slate-400 mt-0.5">{sections.length} sección{sections.length !== 1 ? 'es' : ''}</p>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
            <span className="text-3xl">📄</span>
            <p className="text-sm text-slate-500 font-medium">Sin secciones</p>
            <p className="text-xs text-slate-400">Agrega secciones desde el panel derecho</p>
          </div>
        ) : (
          sorted.map((section, idx) => (
            <div key={section.id} className="space-y-1">
              <SectionRow
                section={section}
                isSelected={selectedSectionId === section.id}
                index={idx}
                total={sorted.length}
              />
              {/* Mini preview */}
              <div className="px-2">
                <SectionPreview type={section.type} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

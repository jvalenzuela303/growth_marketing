'use client'

/**
 * BenefitsSectionEditor — manage up to 6 benefit items.
 */

import { Plus, Trash2 } from 'lucide-react'
import { useLandingBuilderStore } from '@/stores/landing-builder-store'
import type { BenefitsContent, BenefitItem, LandingSection } from '@/stores/landing-builder-store'
import { generateSessionId } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BenefitsSectionEditorProps {
  section: LandingSection
}

export function BenefitsSectionEditor({ section }: BenefitsSectionEditorProps) {
  const updateSection = useLandingBuilderStore((s) => s.updateSection)
  const content = section.content as unknown as BenefitsContent

  function updateTitle(title: string) {
    updateSection(section.id, { title, items: content.items })
  }

  function updateItem(id: string, field: keyof BenefitItem, value: string) {
    const items = content.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item,
    )
    updateSection(section.id, { title: content.title, items })
  }

  function addItem() {
    if (content.items.length >= 6) return
    const items = [
      ...content.items,
      { id: generateSessionId(), iconName: 'Star', text: 'Nuevo beneficio' },
    ]
    updateSection(section.id, { title: content.title, items })
  }

  function removeItem(id: string) {
    const items = content.items.filter((item) => item.id !== id)
    updateSection(section.id, { title: content.title, items })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide" htmlFor="benefits-title">
          Título de la sección
        </label>
        <input
          id="benefits-title"
          type="text"
          value={content.title}
          onChange={(e) => updateTitle(e.target.value)}
          placeholder="Por qué elegirnos"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Beneficios ({content.items.length}/6)
        </p>

        {content.items.map((item, idx) => (
          <div key={item.id} className="flex gap-2 items-start p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-xs text-slate-400 font-bold mt-2.5 w-4 flex-shrink-0">{idx + 1}</span>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={item.iconName}
                onChange={(e) => updateItem(item.id, 'iconName', e.target.value)}
                placeholder="Nombre icono (ej: Zap)"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItem(item.id, 'text', e.target.value)}
                placeholder="Texto del beneficio…"
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            </div>
            <button
              onClick={() => removeItem(item.id)}
              aria-label="Eliminar beneficio"
              className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors mt-1"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </button>
          </div>
        ))}

        {content.items.length < 6 && (
          <button
            onClick={addItem}
            className={cn(
              'flex items-center gap-1.5 w-full px-3 py-2.5 rounded-xl',
              'border-2 border-dashed border-slate-200 text-sm text-slate-500',
              'hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50',
              'transition-colors duration-150',
            )}
          >
            <Plus className="w-4 h-4" aria-hidden />
            Agregar beneficio
          </button>
        )}
      </div>
    </div>
  )
}

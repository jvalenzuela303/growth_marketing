/**
 * Landing Builder Store — Zustand store for the visual landing page editor.
 * Manages section state, selection, reordering, and save lifecycle.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { generateSessionId } from '@/lib/utils'
import { apiFetch } from '@/lib/api'

// ---------------------------------------------------------------------------
// Section types
// ---------------------------------------------------------------------------

export type LandingSectionType = 'hero' | 'benefits' | 'social_proof' | 'faq' | 'cta_bottom'

export interface HeroContent {
  headline:       string
  subheadline:    string
  ctaText:        string
  bgImageUrl:     string
}

export interface BenefitItem {
  id:       string
  iconName: string
  text:     string
}

export interface BenefitsContent {
  title:    string
  items:    BenefitItem[]
}

export interface Testimonial {
  id:        string
  name:      string
  role:      string
  text:      string
  avatarUrl: string
}

export interface SocialProofContent {
  testimonials: Testimonial[]
  logos:        { id: string; url: string; alt: string }[]
}

export interface FAQItem {
  id:       string
  question: string
  answer:   string
}

export interface FAQContent {
  title: string
  items: FAQItem[]
}

export interface CTABottomContent {
  headline:        string
  buttonText:      string
  buttonUrl:       string
  backgroundColor: string
}

export type LandingSectionContent =
  | HeroContent
  | BenefitsContent
  | SocialProofContent
  | FAQContent
  | CTABottomContent

export interface LandingSection {
  id:      string
  type:    LandingSectionType
  enabled: boolean
  order:   number
  content: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Default content per section type
// ---------------------------------------------------------------------------

function defaultContent(type: LandingSectionType): Record<string, unknown> {
  switch (type) {
    case 'hero':
      return {
        headline:    '¿Listo para escalar tu negocio?',
        subheadline: 'Descubre exactamente qué está frenando tu crecimiento.',
        ctaText:     'Hacer mi diagnóstico gratis',
        bgImageUrl:  '',
      } satisfies HeroContent as Record<string, unknown>

    case 'benefits':
      return {
        title: 'Por qué elegir nuestro diagnóstico',
        items: [
          { id: generateSessionId(), iconName: 'Zap',        text: 'Resultados en 2 minutos' },
          { id: generateSessionId(), iconName: 'Target',      text: 'Plan de acción personalizado' },
          { id: generateSessionId(), iconName: 'TrendingUp',  text: 'Basado en datos reales' },
        ],
      } satisfies BenefitsContent as Record<string, unknown>

    case 'social_proof':
      return {
        testimonials: [
          {
            id:        generateSessionId(),
            name:      'María García',
            role:      'CEO, AgenciaX',
            text:      'En 30 días duplicamos nuestra tasa de conversión gracias al plan de acción.',
            avatarUrl: '',
          },
        ],
        logos: [],
      } satisfies SocialProofContent as Record<string, unknown>

    case 'faq':
      return {
        title: 'Preguntas frecuentes',
        items: [
          {
            id:       generateSessionId(),
            question: '¿Cuánto tiempo toma el diagnóstico?',
            answer:   'Menos de 2 minutos. Son 8 preguntas de opción múltiple.',
          },
        ],
      } satisfies FAQContent as Record<string, unknown>

    case 'cta_bottom':
      return {
        headline:        '¿Listo para transformar tu embudo?',
        buttonText:      'Empezar ahora gratis',
        buttonUrl:       '#quiz',
        backgroundColor: '#1a0629',
      } satisfies CTABottomContent as Record<string, unknown>
  }
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface LandingBuilderState {
  sections:          LandingSection[]
  selectedSectionId: string | null
  primaryColor:      string
  isDirty:           boolean
  isSaving:          boolean

  // Actions
  addSection:      (type: LandingSectionType) => void
  removeSection:   (id: string) => void
  reorderSections: (activeId: string, overId: string) => void
  updateSection:   (id: string, content: Record<string, unknown>) => void
  toggleSection:   (id: string) => void
  selectSection:   (id: string | null) => void
  setPrimaryColor: (color: string) => void
  save:            (funnelId: string, accessToken: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Default sections for a fresh funnel
// ---------------------------------------------------------------------------

const DEFAULT_SECTIONS: LandingSection[] = [
  { id: 'section-hero',         type: 'hero',         enabled: true, order: 0, content: defaultContent('hero') },
  { id: 'section-social_proof', type: 'social_proof', enabled: true, order: 1, content: defaultContent('social_proof') },
  { id: 'section-cta_bottom',   type: 'cta_bottom',   enabled: true, order: 2, content: defaultContent('cta_bottom') },
]

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useLandingBuilderStore = create<LandingBuilderState>()(
  devtools(
    (set, get) => ({
      sections:          DEFAULT_SECTIONS,
      selectedSectionId: null,
      primaryColor:      '#c44df0',
      isDirty:           false,
      isSaving:          false,

      addSection: (type) =>
        set(
          (state) => {
            const newSection: LandingSection = {
              id:      `section-${type}-${Date.now()}`,
              type,
              enabled: true,
              order:   state.sections.length,
              content: defaultContent(type),
            }
            return {
              sections:          [...state.sections, newSection],
              selectedSectionId: newSection.id,
              isDirty:           true,
            }
          },
          false,
          'builder/addSection',
        ),

      removeSection: (id) =>
        set(
          (state) => ({
            sections: state.sections
              .filter((s) => s.id !== id)
              .map((s, i) => ({ ...s, order: i })),
            selectedSectionId:
              state.selectedSectionId === id ? null : state.selectedSectionId,
            isDirty: true,
          }),
          false,
          'builder/removeSection',
        ),

      reorderSections: (activeId, overId) =>
        set(
          (state) => {
            const sections = [...state.sections]
            const fromIdx  = sections.findIndex((s) => s.id === activeId)
            const toIdx    = sections.findIndex((s) => s.id === overId)
            if (fromIdx === -1 || toIdx === -1) return {}
            const [moved] = sections.splice(fromIdx, 1)
            sections.splice(toIdx, 0, moved)
            return {
              sections: sections.map((s, i) => ({ ...s, order: i })),
              isDirty:  true,
            }
          },
          false,
          'builder/reorderSections',
        ),

      updateSection: (id, content) =>
        set(
          (state) => ({
            sections: state.sections.map((s) =>
              s.id === id ? { ...s, content: { ...s.content, ...content } } : s,
            ),
            isDirty: true,
          }),
          false,
          'builder/updateSection',
        ),

      toggleSection: (id) =>
        set(
          (state) => ({
            sections: state.sections.map((s) =>
              s.id === id ? { ...s, enabled: !s.enabled } : s,
            ),
            isDirty: true,
          }),
          false,
          'builder/toggleSection',
        ),

      selectSection: (id) =>
        set({ selectedSectionId: id }, false, 'builder/selectSection'),

      setPrimaryColor: (color) =>
        set({ primaryColor: color, isDirty: true }, false, 'builder/setPrimaryColor'),

      save: async (funnelId, accessToken) => {
        set({ isSaving: true }, false, 'builder/saveStart')
        try {
          const { sections, primaryColor } = get()
          await apiFetch(
            `/api/v1/funnels/${funnelId}`,
            {
              method:  'PUT',
              headers: { Authorization: `Bearer ${accessToken}` },
              body:    JSON.stringify({ landingConfig: { sections, primaryColor } }),
            },
          )
          set({ isDirty: false, isSaving: false }, false, 'builder/saveSuccess')
        } catch (err) {
          set({ isSaving: false }, false, 'builder/saveError')
          throw err
        }
      },
    }),
    { name: 'LandingBuilderStore' },
  ),
)

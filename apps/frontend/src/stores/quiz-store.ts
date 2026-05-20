import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { QuizAnswer, LeadGateData } from '@growth-engine/shared-types'
import { generateSessionId } from '@/lib/utils'

interface QuizState {
  // Navigation
  currentStep: number
  direction: number       // +1 = forward, -1 = backward (drives Framer Motion)
  totalSteps: number
  isLeadGate: boolean     // true when the lead capture form is displayed

  // Data
  answers: Record<number, QuizAnswer>
  leadData: LeadGateData | null
  sessionId: string

  // UI state
  isSubmitting: boolean
  isComplete: boolean

  // Computed (derived on the fly, no need to persist)
  getProgress: () => number
  getAnsweredCount: () => number

  // Actions
  init: (totalSteps: number) => void
  setAnswer: (stepIndex: number, answer: QuizAnswer) => void
  goNext: (skipTo?: number) => void
  goBack: () => void
  showLeadGate: () => void
  hideLeadGate: () => void
  setLeadData: (data: LeadGateData) => void
  setSubmitting: (loading: boolean) => void
  setComplete: () => void
  reset: () => void
}

const INITIAL_STATE = {
  currentStep:  0,
  direction:    1,
  totalSteps:   0,
  isLeadGate:   false,
  answers:      {} as Record<number, QuizAnswer>,
  leadData:     null,
  sessionId:    generateSessionId(),
  isSubmitting: false,
  isComplete:   false,
}

export const useQuizStore = create<QuizState>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      /**
       * getProgress returns a value in [0, 85].
       * We cap at 85 intentionally — the remaining 15% is revealed only after
       * the user submits the lead gate form. This psychological trick increases
       * lead gate completions by creating an "almost done" effect.
       */
      getProgress: () => {
        const { currentStep, totalSteps, isLeadGate } = get()
        if (totalSteps === 0) return 0
        if (isLeadGate) return 90
        const raw = (currentStep / totalSteps) * 85
        return Math.min(raw, 85)
      },

      getAnsweredCount: () => Object.keys(get().answers).length,

      init: (totalSteps: number) =>
        set(
          { ...INITIAL_STATE, totalSteps, sessionId: generateSessionId() },
          false,
          'quiz/init',
        ),

      setAnswer: (stepIndex, answer) =>
        set(
          (state) => ({
            answers: { ...state.answers, [stepIndex]: answer },
          }),
          false,
          'quiz/setAnswer',
        ),

      goNext: (skipTo?: number) =>
        set(
          (state) => {
            const next =
              skipTo !== undefined
                ? skipTo
                : Math.min(state.currentStep + 1, state.totalSteps - 1)
            return { currentStep: next, direction: 1 }
          },
          false,
          'quiz/goNext',
        ),

      goBack: () =>
        set(
          (state) => ({
            currentStep: Math.max(state.currentStep - 1, 0),
            direction:   -1,
            isLeadGate:  false, // pressing back from lead gate returns to last question
          }),
          false,
          'quiz/goBack',
        ),

      showLeadGate: () => set({ isLeadGate: true }, false, 'quiz/showLeadGate'),
      hideLeadGate: () => set({ isLeadGate: false }, false, 'quiz/hideLeadGate'),

      setLeadData: (data) => set({ leadData: data }, false, 'quiz/setLeadData'),

      setSubmitting: (loading) =>
        set({ isSubmitting: loading }, false, 'quiz/setSubmitting'),

      setComplete: () => set({ isComplete: true }, false, 'quiz/setComplete'),

      reset: () =>
        set(
          { ...INITIAL_STATE, sessionId: generateSessionId() },
          false,
          'quiz/reset',
        ),
    }),
    { name: 'QuizStore' },
  ),
)

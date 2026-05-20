'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { QuizQuestion, QuizOption, QuizConfig } from '@growth-engine/shared-types'
import { getFunnelById, updateFunnelQuizConfig } from '@/lib/api'

// ---------------------------------------------------------------------------
// BranchingRule — local type (not in shared-types)
// ---------------------------------------------------------------------------

export interface BranchingRule {
  id: string
  questionId: string       // the question this rule belongs to
  ifOptionId: string       // the option that triggers the jump
  thenJumpToId: string     // the question to jump to
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface QuizBuilderState {
  funnelId: string | null
  funnelName: string
  questions: QuizQuestion[]
  branchingRules: BranchingRule[]
  selectedQuestionId: string | null
  isDirty: boolean
  isSaving: boolean
  loadError: string | null

  // actions
  loadFunnel: (funnelId: string, accessToken: string) => Promise<void>
  setFunnelName: (name: string) => void
  addQuestion: (type: 'single_choice' | 'multiple_choice' | 'scale' | 'text') => void
  removeQuestion: (id: string) => void
  reorderQuestions: (activeId: string, overId: string) => void
  updateQuestion: (id: string, patch: Partial<QuizQuestion>) => void
  selectQuestion: (id: string | null) => void
  addOption: (questionId: string) => void
  updateOption: (questionId: string, optionId: string, patch: Partial<QuizOption>) => void
  removeOption: (questionId: string, optionId: string) => void
  addBranchingRule: (rule: Omit<BranchingRule, 'id'>) => void
  removeBranchingRule: (ruleId: string) => void
  saveQuizConfig: (accessToken: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Default question factory
// ---------------------------------------------------------------------------

function makeDefaultQuestion(
  type: 'single_choice' | 'multiple_choice' | 'scale' | 'text',
  index: number,
): QuizQuestion {
  const id = crypto.randomUUID()
  const base: QuizQuestion = {
    id,
    index,
    type,
    text: '',
    subtitle: '',
    options: [],
    maxPoints: 10,
    weight: 1.0,
    required: true,
    scoringCategory: 'quiz',
  }

  if (type === 'single_choice' || type === 'multiple_choice') {
    base.options = [
      { id: crypto.randomUUID(), text: '', points: 10 },
      { id: crypto.randomUUID(), text: '', points: 5 },
    ]
  }

  return base
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useQuizBuilderStore = create<QuizBuilderState>()(
  devtools(
    (set, get) => ({
      funnelId: null,
      funnelName: '',
      questions: [],
      branchingRules: [],
      selectedQuestionId: null,
      isDirty: false,
      isSaving: false,
      loadError: null,

      // -----------------------------------------------------------------------
      // loadFunnel — fetch from backend and hydrate store
      // -----------------------------------------------------------------------
      loadFunnel: async (funnelId, accessToken) => {
        set({ loadError: null }, false, 'builder/loadFunnel:start')
        try {
          const funnel = await getFunnelById(funnelId, accessToken)
          const questions = funnel.quizConfig?.questions ?? []

          // Reconstruct branching rules from skipToStep on options
          const rules: BranchingRule[] = []
          questions.forEach((q) => {
            if (q.options) {
              q.options.forEach((opt) => {
                if (opt.skipToStep !== undefined) {
                  const targetQuestion = questions.find((tq) => tq.index === opt.skipToStep)
                  if (targetQuestion) {
                    rules.push({
                      id: crypto.randomUUID(),
                      questionId: q.id,
                      ifOptionId: opt.id,
                      thenJumpToId: targetQuestion.id,
                    })
                  }
                }
              })
            }
          })

          set(
            {
              funnelId,
              funnelName: funnel.name,
              questions,
              branchingRules: rules,
              selectedQuestionId: questions[0]?.id ?? null,
              isDirty: false,
            },
            false,
            'builder/loadFunnel:done',
          )
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error al cargar el embudo'
          set({ loadError: message }, false, 'builder/loadFunnel:error')
        }
      },

      // -----------------------------------------------------------------------
      setFunnelName: (name) =>
        set({ funnelName: name, isDirty: true }, false, 'builder/setFunnelName'),

      // -----------------------------------------------------------------------
      addQuestion: (type) => {
        const { questions } = get()
        const newQuestion = makeDefaultQuestion(type, questions.length)
        set(
          {
            questions: [...questions, newQuestion],
            selectedQuestionId: newQuestion.id,
            isDirty: true,
          },
          false,
          'builder/addQuestion',
        )
      },

      // -----------------------------------------------------------------------
      removeQuestion: (id) => {
        const { questions, selectedQuestionId, branchingRules } = get()
        const filtered = questions
          .filter((q) => q.id !== id)
          .map((q, i) => ({ ...q, index: i }))

        const nextSelected =
          selectedQuestionId === id
            ? (filtered[0]?.id ?? null)
            : selectedQuestionId

        // Remove branching rules that reference this question
        const cleanedRules = branchingRules.filter(
          (r) => r.questionId !== id && r.thenJumpToId !== id,
        )

        set(
          {
            questions: filtered,
            selectedQuestionId: nextSelected,
            branchingRules: cleanedRules,
            isDirty: true,
          },
          false,
          'builder/removeQuestion',
        )
      },

      // -----------------------------------------------------------------------
      reorderQuestions: (activeId, overId) => {
        const { questions } = get()
        const oldIndex = questions.findIndex((q) => q.id === activeId)
        const newIndex = questions.findIndex((q) => q.id === overId)
        if (oldIndex === -1 || newIndex === -1) return

        const reordered = [...questions]
        const [moved] = reordered.splice(oldIndex, 1)
        reordered.splice(newIndex, 0, moved)

        const reindexed = reordered.map((q, i) => ({ ...q, index: i }))
        set({ questions: reindexed, isDirty: true }, false, 'builder/reorderQuestions')
      },

      // -----------------------------------------------------------------------
      updateQuestion: (id, patch) =>
        set(
          (state) => ({
            questions: state.questions.map((q) =>
              q.id === id ? { ...q, ...patch } : q,
            ),
            isDirty: true,
          }),
          false,
          'builder/updateQuestion',
        ),

      // -----------------------------------------------------------------------
      selectQuestion: (id) =>
        set({ selectedQuestionId: id }, false, 'builder/selectQuestion'),

      // -----------------------------------------------------------------------
      addOption: (questionId) =>
        set(
          (state) => ({
            questions: state.questions.map((q) => {
              if (q.id !== questionId) return q
              const newOption: QuizOption = {
                id: crypto.randomUUID(),
                text: '',
                points: 5,
              }
              return { ...q, options: [...(q.options ?? []), newOption] }
            }),
            isDirty: true,
          }),
          false,
          'builder/addOption',
        ),

      // -----------------------------------------------------------------------
      updateOption: (questionId, optionId, patch) =>
        set(
          (state) => ({
            questions: state.questions.map((q) => {
              if (q.id !== questionId) return q
              return {
                ...q,
                options: (q.options ?? []).map((opt) =>
                  opt.id === optionId ? { ...opt, ...patch } : opt,
                ),
              }
            }),
            isDirty: true,
          }),
          false,
          'builder/updateOption',
        ),

      // -----------------------------------------------------------------------
      removeOption: (questionId, optionId) =>
        set(
          (state) => ({
            questions: state.questions.map((q) => {
              if (q.id !== questionId) return q
              return {
                ...q,
                options: (q.options ?? []).filter((opt) => opt.id !== optionId),
              }
            }),
            isDirty: true,
          }),
          false,
          'builder/removeOption',
        ),

      // -----------------------------------------------------------------------
      addBranchingRule: (rule) =>
        set(
          (state) => ({
            branchingRules: [
              ...state.branchingRules,
              { ...rule, id: crypto.randomUUID() },
            ],
            isDirty: true,
          }),
          false,
          'builder/addBranchingRule',
        ),

      // -----------------------------------------------------------------------
      removeBranchingRule: (ruleId) =>
        set(
          (state) => ({
            branchingRules: state.branchingRules.filter((r) => r.id !== ruleId),
            isDirty: true,
          }),
          false,
          'builder/removeBranchingRule',
        ),

      // -----------------------------------------------------------------------
      saveQuizConfig: async (accessToken) => {
        const { funnelId, questions, branchingRules, funnelName } = get()
        if (!funnelId) return

        set({ isSaving: true }, false, 'builder/save:start')

        // Encode branching rules back into skipToStep on options
        const questionsWithBranching = questions.map((q) => ({
          ...q,
          options: (q.options ?? []).map((opt) => {
            const rule = branchingRules.find(
              (r) => r.questionId === q.id && r.ifOptionId === opt.id,
            )
            if (!rule) return opt
            const targetQuestion = questions.find((tq) => tq.id === rule.thenJumpToId)
            return { ...opt, skipToStep: targetQuestion?.index }
          }),
        }))

        const quizConfig: QuizConfig = {
          title: funnelName,
          questions: questionsWithBranching,
          leadGatePosition: Math.floor(questionsWithBranching.length / 2),
        }

        try {
          await updateFunnelQuizConfig(funnelId, quizConfig, accessToken)
          set({ isSaving: false, isDirty: false }, false, 'builder/save:done')
        } catch (err) {
          set({ isSaving: false }, false, 'builder/save:error')
          throw err
        }
      },
    }),
    { name: 'QuizBuilderStore' },
  ),
)

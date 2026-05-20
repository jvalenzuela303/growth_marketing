'use client'

import { useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useQuizStore } from '@/stores/quiz-store'
import { QuizStep } from './QuizStep'
import { QuizProgress } from './QuizProgress'
import { LeadGateForm } from './LeadGateForm'
import type { QuizConfig, LeadGateData, QuizAnswer } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// Animation variants — horizontal slide between steps
// ---------------------------------------------------------------------------
const SLIDE_VARIANTS = {
  enter: (direction: number) => ({
    x:       direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: {
    x:       0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x:       direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

const SLIDE_TRANSITION = {
  type:      'tween',
  ease:      'easeInOut',
  duration:  0.28,
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuizFunnelProps {
  config:      QuizConfig
  tenantSlug:  string
  funnelSlug:  string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuizFunnel({ config, tenantSlug, funnelSlug }: QuizFunnelProps) {
  const router = useRouter()

  const {
    currentStep,
    direction,
    answers,
    isLeadGate,
    isSubmitting,
    sessionId,
    init,
    setAnswer,
    goNext,
    goBack,
    showLeadGate,
    setLeadData,
    setSubmitting,
    setComplete,
    getProgress,
  } = useQuizStore()

  const questions    = config.questions
  const totalSteps   = questions.length
  const leadGatePos  = config.leadGatePosition ?? 5
  const currentQ     = questions[currentStep]

  // Initialize store on mount
  useEffect(() => {
    init(totalSteps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSteps])

  // ---------------------------------------------------------------------------
  // Answer handler — auto-advances for single_choice after 350ms
  // ---------------------------------------------------------------------------
  const handleAnswer = useCallback(
    (answer: QuizAnswer) => {
      setAnswer(currentStep, answer)

      const isMultiple = currentQ.type === 'multiple_choice'
      if (isMultiple) return // multiple_choice has explicit Continue button

      // Determine next navigation
      const skipTo = (() => {
        const option = currentQ.options?.find((o) => o.id === answer.optionId)
        return option?.skipToStep
      })()

      // Auto-advance after 350ms (allows selected state animation to play)
      setTimeout(() => {
        const nextStep = skipTo !== undefined ? skipTo : currentStep + 1

        if (nextStep >= totalSteps || currentStep + 1 >= leadGatePos) {
          // Reached or passed the lead gate position
          showLeadGate()
        } else {
          goNext(skipTo)
        }
      }, 350)
    },
    [currentStep, currentQ, totalSteps, leadGatePos, setAnswer, goNext, showLeadGate],
  )

  // Multiple choice explicitly triggers goNext
  const handleMultipleChoiceContinue = useCallback(
    (answer: QuizAnswer) => {
      setAnswer(currentStep, answer)
      if (currentStep + 1 >= leadGatePos) {
        showLeadGate()
      } else {
        goNext()
      }
    },
    [currentStep, leadGatePos, setAnswer, goNext, showLeadGate],
  )

  // ---------------------------------------------------------------------------
  // Lead gate submit
  // ---------------------------------------------------------------------------
  const handleLeadGateSubmit = useCallback(
    async (leadData: LeadGateData) => {
      setLeadData(leadData)
      setSubmitting(true)

      // Get UTM params from URL
      const urlParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams()

      const submission = {
        funnelId:   funnelSlug,
        tenantSlug,
        funnelSlug,
        answers:    Object.values(answers),
        leadData,
        completionPercentage: Math.round((Object.keys(answers).length / totalSteps) * 100),
        sessionId,
        metadata: {
          utmSource:   urlParams.get('utm_source')   ?? undefined,
          utmMedium:   urlParams.get('utm_medium')   ?? undefined,
          utmCampaign: urlParams.get('utm_campaign') ?? undefined,
          fbclid:      urlParams.get('fbclid')       ?? undefined,
          userAgent:   navigator.userAgent,
        },
      }

      try {
        const res = await fetch('/api/quiz/submit', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(submission),
        })

        if (!res.ok) {
          throw new Error('Error al procesar el quiz')
        }

        const result = await res.json()
        setComplete()

        // Redirect to results page
        router.push(
          `/${tenantSlug}/quiz/results?score=${result.totalScore}&segment=${result.segment}&leadId=${result.leadId}`,
        )
      } catch (err) {
        console.error('[QuizFunnel] submit error:', err)
        toast.error('Hubo un problema al guardar tus respuestas. Por favor intenta de nuevo.')
        setSubmitting(false)
      }
    },
    [
      answers,
      funnelSlug,
      tenantSlug,
      totalSteps,
      sessionId,
      setLeadData,
      setSubmitting,
      setComplete,
      router,
    ],
  )

  // ---------------------------------------------------------------------------
  // Computed values for current answers
  // ---------------------------------------------------------------------------
  const currentAnswer    = answers[currentStep]
  const selectedOptionIds: string[] = currentAnswer
    ? currentAnswer.optionIds ?? (currentAnswer.optionId ? [currentAnswer.optionId] : [])
    : []

  const progress   = getProgress()
  const answeredCount = Object.keys(answers).length

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Sticky progress bar */}
      <QuizProgress
        progress={progress}
        currentStep={currentStep}
        onBack={goBack}
      />

      {/* Main content area */}
      <main className="flex-1 flex flex-col items-center justify-start overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {isLeadGate ? (
            <motion.div
              key="lead-gate"
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SLIDE_TRANSITION}
              className="w-full"
            >
              <LeadGateForm
                onSubmit={handleLeadGateSubmit}
                isLoading={isSubmitting}
              />
            </motion.div>
          ) : currentQ ? (
            <motion.div
              key={`step-${currentStep}`}
              custom={direction}
              variants={SLIDE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SLIDE_TRANSITION}
              className="w-full"
            >
              <QuizStep
                question={currentQ}
                stepNumber={currentStep + 1}
                totalSteps={totalSteps}
                selectedOptionIds={selectedOptionIds}
                onAnswer={
                  currentQ.type === 'multiple_choice'
                    ? handleMultipleChoiceContinue
                    : handleAnswer
                }
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Live score indicator — shown after first answer to build engagement */}
      {answeredCount > 0 && !isLeadGate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-4 xs:right-6 z-40"
        >
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-white border-2 border-brand-200 shadow-quiz">
            <span className="text-xs font-semibold text-slate-400 leading-none">Score</span>
            <span className="text-base font-extrabold text-brand-600 leading-none tabular-nums">
              {/* Rough live score estimate based on answered questions */}
              {Math.round(
                (Object.values(answers).reduce((sum, a) => {
                  return sum + 0 // scores come from backend; show answered count instead
                }, 0) /
                  totalSteps) *
                  100,
              )}
              <span className="text-[10px] font-bold">%</span>
            </span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuizQuestion, QuizAnswer } from '@growth-engine/shared-types'

interface QuizStepProps {
  question: QuizQuestion
  stepNumber: number
  totalSteps: number
  selectedOptionIds: string[]
  onAnswer: (answer: QuizAnswer) => void
}

export function QuizStep({
  question,
  stepNumber,
  totalSteps,
  selectedOptionIds,
  onAnswer,
}: QuizStepProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  const isMultiple = question.type === 'multiple_choice'

  const handleSingleChoice = useCallback(
    (optionId: string, skipToStep?: number) => {
      // Prevent double-tap
      if (pendingId) return

      setPendingId(optionId)

      const answer: QuizAnswer = {
        questionId:    question.id,
        questionIndex: question.index,
        optionId,
      }

      // Delay auto-advance to let the selection animation play (350ms)
      setTimeout(() => {
        onAnswer(answer)
        setPendingId(null)
      }, 350)
    },
    [pendingId, question, onAnswer],
  )

  const handleMultipleChoice = useCallback(
    (optionId: string) => {
      const current = new Set(selectedOptionIds)
      if (current.has(optionId)) {
        current.delete(optionId)
      } else {
        current.add(optionId)
      }
      onAnswer({
        questionId:    question.id,
        questionIndex: question.index,
        optionIds:     Array.from(current),
      })
    },
    [selectedOptionIds, question, onAnswer],
  )

  const options = question.options ?? []

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-4 py-6">
      {/* Question header */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
          Pregunta {stepNumber} de {totalSteps}
        </p>
        <h2 className="text-xl xs:text-2xl font-bold text-slate-900 leading-snug">
          {question.text}
        </h2>
        {question.subtitle && (
          <p className="text-base text-slate-500">{question.subtitle}</p>
        )}
        {isMultiple && (
          <p className="text-sm font-medium text-brand-500">
            Puedes seleccionar varias opciones
          </p>
        )}
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3" role="group" aria-label={question.text}>
        {options.map((option, idx) => {
          const isSelected = selectedOptionIds.includes(option.id)
          const isPending  = pendingId === option.id

          return (
            <motion.button
              key={option.id}
              onClick={() =>
                isMultiple
                  ? handleMultipleChoice(option.id)
                  : handleSingleChoice(option.id, option.skipToStep)
              }
              aria-pressed={isSelected}
              aria-label={option.text}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.06 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'quiz-option',
                isSelected && 'quiz-option--selected',
                isPending && 'scale-[0.97]',
              )}
            >
              {/* Option letter badge */}
              <span
                aria-hidden
                className={cn(
                  'flex-shrink-0 flex items-center justify-center',
                  'w-8 h-8 rounded-full border-2 text-sm font-bold',
                  'transition-colors duration-150',
                  isSelected
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-300 bg-white text-slate-500',
                )}
              >
                {isSelected && isMultiple ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  String.fromCharCode(65 + idx) // A, B, C, D…
                )}
              </span>

              <span className="flex-1 text-left">{option.text}</span>

              {/* Points hint — shown only when selected, as social proof of progress */}
              {isSelected && option.points > 0 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-shrink-0 text-xs font-semibold text-brand-500 bg-brand-50 px-2 py-0.5 rounded-full"
                >
                  +{option.points}
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Continue button for multiple choice — single choice auto-advances */}
      {isMultiple && selectedOptionIds.length > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            onAnswer({
              questionId:    question.id,
              questionIndex: question.index,
              optionIds:     selectedOptionIds,
            })
          }}
          className="btn-cta w-full"
        >
          Continuar ({selectedOptionIds.length} seleccionada{selectedOptionIds.length > 1 ? 's' : ''})
        </motion.button>
      )}
    </div>
  )
}

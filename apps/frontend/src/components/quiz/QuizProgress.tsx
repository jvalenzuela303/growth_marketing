'use client'

import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuizProgressProps {
  /** Psychological progress — capped at 85 before lead gate */
  progress: number
  currentStep: number
  onBack: () => void
  className?: string
}

export function QuizProgress({
  progress,
  currentStep,
  onBack,
  className,
}: QuizProgressProps) {
  const displayPercent = Math.round(progress)

  return (
    <div
      className={cn(
        'sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-slate-100 safe-top',
        className,
      )}
    >
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Back button — only when not on first question */}
        {currentStep > 0 ? (
          <button
            onClick={onBack}
            aria-label="Volver a la pregunta anterior"
            className={cn(
              'flex items-center justify-center min-w-[44px] min-h-[44px]',
              'rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50',
              'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand-500',
            )}
          >
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </button>
        ) : (
          // Spacer to keep progress bar centered
          <div className="min-w-[44px]" aria-hidden />
        )}

        {/* Progress track */}
        <div className="flex-1 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={displayPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso del diagnóstico: ${displayPercent}%`}
            className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-500 ease-out"
              style={{ width: `${displayPercent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-600 tabular-nums w-10 text-right">
            {displayPercent}%
          </span>
        </div>
      </div>
    </div>
  )
}

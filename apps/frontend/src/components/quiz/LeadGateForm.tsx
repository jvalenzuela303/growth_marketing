'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Lock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadGateData } from '@growth-engine/shared-types'

interface LeadGateFormProps {
  onSubmit: (data: LeadGateData) => Promise<void>
  isLoading: boolean
  className?: string
}

interface FormErrors {
  firstName?: string
  email?: string
  phone?: string
}

function validate(values: Partial<LeadGateData>): FormErrors {
  const errors: FormErrors = {}

  if (!values.firstName?.trim()) {
    errors.firstName = 'Ingresa tu nombre'
  }

  if (!values.email?.trim()) {
    errors.email = 'El email es requerido'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Ingresa un email válido'
  }

  if (values.phone && !/^[\d\s\+\-\(\)]{7,15}$/.test(values.phone.trim())) {
    errors.phone = 'Ingresa un teléfono válido'
  }

  return errors
}

export function LeadGateForm({ onSubmit, isLoading, className }: LeadGateFormProps) {
  const [values, setValues] = useState<Partial<LeadGateData>>({
    firstName: '',
    email:     '',
    phone:     '',
  })
  const [errors, setErrors]     = useState<FormErrors>({})
  const [touched, setTouched]   = useState<Record<string, boolean>>({})

  function handleChange(field: keyof LeadGateData, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    if (touched[field]) {
      setErrors(validate({ ...values, [field]: value }))
    }
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors(validate(values))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const allTouched = { firstName: true, email: true, phone: true }
    setTouched(allTouched)
    const errs = validate(values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    await onSubmit({
      firstName: values.firstName!.trim(),
      email:     values.email!.trim().toLowerCase(),
      phone:     values.phone?.trim() || undefined,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('w-full max-w-lg mx-auto px-4 py-6', className)}
    >
      {/* Header */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 mb-2">
          <Sparkles className="w-7 h-7 text-brand-600" aria-hidden />
        </div>
        <h2 className="text-2xl xs:text-3xl font-bold text-slate-900">
          ¡Casi listo!
        </h2>
        <p className="text-base text-slate-600 leading-relaxed">
          Ingresa tus datos para ver tu{' '}
          <strong className="text-brand-700">diagnóstico personalizado</strong> y
          las recomendaciones exactas para tu negocio.
        </p>
      </div>

      {/* Loading overlay — shown while computing score */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4 py-8 text-center"
        >
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin" aria-hidden />
          <div>
            <p className="font-bold text-lg text-slate-800">
              Calculando tu diagnóstico…
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Estamos analizando tus respuestas con IA
            </p>
          </div>
        </motion.div>
      )}

      {/* Form */}
      {!isLoading && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
          aria-label="Formulario de registro para obtener resultados"
        >
          {/* Nombre */}
          <div className="space-y-1.5">
            <label
              htmlFor="lg-firstName"
              className="block text-sm font-semibold text-slate-700"
            >
              Tu nombre <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="lg-firstName"
              type="text"
              autoComplete="given-name"
              placeholder="Ej: María"
              value={values.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              onBlur={() => handleBlur('firstName')}
              aria-required
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'lg-firstName-error' : undefined}
              className={cn(
                'w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-base bg-white',
                'placeholder:text-slate-400 transition-colors duration-150',
                'focus:outline-none focus:ring-0',
                errors.firstName && touched.firstName
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 focus:border-brand-500',
              )}
            />
            {errors.firstName && touched.firstName && (
              <p id="lg-firstName-error" role="alert" className="text-sm text-red-500">
                {errors.firstName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="lg-email"
              className="block text-sm font-semibold text-slate-700"
            >
              Email <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="lg-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@empresa.com"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              aria-required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'lg-email-error' : undefined}
              className={cn(
                'w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-base bg-white',
                'placeholder:text-slate-400 transition-colors duration-150',
                'focus:outline-none focus:ring-0',
                errors.email && touched.email
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 focus:border-brand-500',
              )}
            />
            {errors.email && touched.email && (
              <p id="lg-email-error" role="alert" className="text-sm text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* Teléfono — opcional */}
          <div className="space-y-1.5">
            <label
              htmlFor="lg-phone"
              className="block text-sm font-semibold text-slate-700"
            >
              WhatsApp{' '}
              <span className="text-slate-400 font-normal">(opcional, para enviarte tu plan)</span>
            </label>
            <input
              id="lg-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+52 55 1234 5678"
              value={values.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'lg-phone-error' : undefined}
              className={cn(
                'w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-base bg-white',
                'placeholder:text-slate-400 transition-colors duration-150',
                'focus:outline-none focus:ring-0',
                errors.phone && touched.phone
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-slate-200 focus:border-brand-500',
              )}
            />
            {errors.phone && touched.phone && (
              <p id="lg-phone-error" role="alert" className="text-sm text-red-500">
                {errors.phone}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-cta w-full mt-2"
            aria-label="Ver mi diagnóstico personalizado"
          >
            <Sparkles className="w-5 h-5 flex-shrink-0" aria-hidden />
            Ver mi diagnóstico personalizado
          </button>

          {/* Trust signal */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
            <span>Tus datos están protegidos. Sin spam, prometido.</span>
          </div>
        </form>
      )}
    </motion.div>
  )
}

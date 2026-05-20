import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as currency (CLP by default).
 */
export function formatCurrency(
  value: number,
  currency = 'CLP',
  locale = 'es-CL',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format a percentage value with one decimal place.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Returns a human-readable relative date string in Spanish.
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'hace un momento'
  if (diffMins < 60) return `hace ${diffMins} min`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays < 7) return `hace ${diffDays} días`
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

/**
 * Truncate a string to maxLength, appending '…' if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return `${str.slice(0, maxLength - 1)}…`
}

/**
 * Generate a random UUID v4 (browser/edge compatible — no Node crypto).
 */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/**
 * Sleep for n milliseconds — useful for controlled auto-advance delays.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Map a score (0-100) to its segment label in Spanish.
 */
export function scoreToLabel(score: number): string {
  if (score >= 80) return 'Fuego'
  if (score >= 60) return 'Caliente'
  if (score >= 40) return 'Tibio'
  if (score >= 20) return 'Frío'
  return 'Motor Detenido'
}

/**
 * Map a segment key to its Tailwind color classes (bg, text, border).
 */
export type SegmentKey = 'fuego' | 'caliente' | 'tibio' | 'frio' | 'motor_detenido' | 'sin_clasificar'

export const SEGMENT_COLORS: Record<SegmentKey, { bg: string; text: string; border: string; badge: string; hex: string }> = {
  fuego:          { bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', hex: '#10b981' },
  caliente:       { bg: 'bg-blue-50',     text: 'text-blue-700',    border: 'border-blue-200',    badge: 'bg-blue-100 text-blue-700',       hex: '#3b82f6' },
  tibio:          { bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-700',     hex: '#f59e0b' },
  frio:           { bg: 'bg-slate-50',    text: 'text-slate-700',   border: 'border-slate-200',   badge: 'bg-slate-100 text-slate-700',     hex: '#64748b' },
  motor_detenido: { bg: 'bg-gray-50',     text: 'text-gray-600',    border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-600',       hex: '#6b7280' },
  sin_clasificar: { bg: 'bg-gray-50',     text: 'text-gray-500',    border: 'border-gray-200',    badge: 'bg-gray-100 text-gray-500',       hex: '#9ca3af' },
}

/**
 * Map a segment key to its display name in Spanish.
 */
export const SEGMENT_NAMES: Record<SegmentKey, string> = {
  fuego:          'Fuego',
  caliente:       'Caliente',
  tibio:          'Tibio',
  frio:           'Frío',
  motor_detenido: 'Motor Detenido',
  sin_clasificar: 'Sin Clasificar',
}

/**
 * Map a pipeline stage to its display name in Spanish.
 */
export const STAGE_NAMES: Record<string, string> = {
  nuevo:          'Nuevo',
  calificado:     'Calificado',
  contactado:     'Contactado',
  propuesta:      'Propuesta',
  negociacion:    'Negociación',
  cerrado_ganado: 'Cerrado Ganado',
  cerrado_perdido:'Cerrado Perdido',
}

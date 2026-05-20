'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Calendar, Plus, Loader2, Video, Phone, Users, ExternalLink, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAppointments, updateAppointmentStatus } from '@/lib/api'
import type { Appointment } from '@/lib/api'
import { NewAppointmentModal } from '@/components/appointments/NewAppointmentModal'

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<Appointment['status'], { label: string; classes: string }> = {
  scheduled:  { label: 'Programada',  classes: 'bg-blue-100 text-blue-700' },
  completed:  { label: 'Completada',  classes: 'bg-emerald-100 text-emerald-700' },
  cancelled:  { label: 'Cancelada',   classes: 'bg-red-100 text-red-600' },
  no_show:    { label: 'No asistió',  classes: 'bg-gray-100 text-gray-500' },
}

const CHANNEL_ICON: Record<string, React.ElementType> = {
  video_call: Video,
  phone:      Phone,
  in_person:  Users,
}

const CHANNEL_LABEL: Record<string, string> = {
  video_call: 'Videollamada',
  phone:      'Teléfono',
  in_person:  'Presencial',
}

const FILTER_TABS: { key: Appointment['status'] | 'all'; label: string }[] = [
  { key: 'all',       label: 'Todas' },
  { key: 'scheduled', label: 'Programadas' },
  { key: 'completed', label: 'Completadas' },
  { key: 'cancelled', label: 'Canceladas' },
]

// ---------------------------------------------------------------------------
// Appointment card
// ---------------------------------------------------------------------------

function AppointmentCard({
  apt,
  onStatusChange,
}: {
  apt: Appointment
  onStatusChange: (id: string, status: Appointment['status']) => Promise<void>
}) {
  const [updating, setUpdating] = useState(false)
  const cfg       = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG.scheduled
  const ChannelIcon = CHANNEL_ICON[apt.channel] ?? Video
  const scheduledDate = new Date(apt.scheduledAt)

  async function handleStatus(status: Appointment['status']) {
    setUpdating(true)
    await onStatusChange(apt.id, status)
    setUpdating(false)
  }

  return (
    <article className="kpi-card space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-slate-400 font-mono truncate">{apt.leadId.slice(0, 18)}…</p>
          <p className="text-lg font-extrabold text-slate-900 tabular-nums">
            {scheduledDate.toLocaleDateString('es-CL', {
              weekday: 'short', day: 'numeric', month: 'short',
            })}
          </p>
          <p className="text-sm text-slate-500">
            {scheduledDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
            {' · '}{apt.durationMins} min
          </p>
        </div>
        <span className={cn('segment-badge flex-shrink-0', cfg.classes)}>{cfg.label}</span>
      </div>

      {/* Channel + meeting URL */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <ChannelIcon className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden />
        <span>{CHANNEL_LABEL[apt.channel] ?? apt.channel}</span>
        {apt.meetingUrl && (
          <a
            href={apt.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-brand-600 hover:underline text-xs"
            aria-label="Abrir enlace de reunión"
          >
            Unirse <ExternalLink className="w-3 h-3" aria-hidden />
          </a>
        )}
      </div>

      {/* Notes */}
      {apt.notes && (
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 line-clamp-2">
          {apt.notes}
        </p>
      )}

      {/* Actions — only for scheduled */}
      {apt.status === 'scheduled' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => handleStatus('completed')}
            disabled={updating}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 min-h-[36px] rounded-xl text-sm font-semibold',
              'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" aria-hidden />}
            Completar
          </button>
          <button
            onClick={() => handleStatus('cancelled')}
            disabled={updating}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 min-h-[36px] rounded-xl text-sm font-semibold',
              'bg-red-50 text-red-600 hover:bg-red-100 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            Cancelar
          </button>
        </div>
      )}
    </article>
  )
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  return (
    <div className="kpi-card space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-slate-200 rounded" />
          <div className="h-6 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-20 bg-slate-200 rounded" />
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded-full" />
      </div>
      <div className="h-4 w-28 bg-slate-200 rounded" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppointmentsPage() {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [filter, setFilter]             = useState<Appointment['status'] | 'all'>('all')
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const data = await getAppointments({}, token)
      setAppointments(data)
    } catch {
      // show empty state
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(id: string, status: Appointment['status']) {
    try {
      const updated = await updateAppointmentStatus(id, status, token)
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch { /* keep existing */ }
  }

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter((a) => a.status === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" aria-hidden />
            Citas programadas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {appointments.length} cita{appointments.length !== 1 ? 's' : ''} en total
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-cta"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Nueva cita
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-brand-400" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">No hay citas</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              {filter === 'all'
                ? 'Agenda tu primera cita con un lead para hacer seguimiento.'
                : `No hay citas con estado "${FILTER_TABS.find((t) => t.key === filter)?.label}".`}
            </p>
          </div>
          {filter === 'all' && (
            <button onClick={() => setShowModal(true)} className="btn-cta">
              <Plus className="w-4 h-4" aria-hidden />
              Agendar primera cita
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((apt) => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <NewAppointmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreated={load}
        accessToken={token}
      />
    </div>
  )
}

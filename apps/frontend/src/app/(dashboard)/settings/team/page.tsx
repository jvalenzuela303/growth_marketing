'use client'

/**
 * /settings/team — Team management page.
 * Owners and admins can invite members, change roles, and deactivate users.
 */

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Users, UserPlus, X, Loader2, AlertCircle, CheckCircle2,
  ChevronDown, Shield, Eye, User, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TeamUser {
  id: string
  email: string
  name: string | null
  role: 'owner' | 'admin' | 'member' | 'viewer'
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

type InviteRole = 'admin' | 'member' | 'viewer'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'

const ROLE_META: Record<
  TeamUser['role'],
  { label: string; color: string; icon: React.ElementType; description: string }
> = {
  owner:  {
    label: 'Owner',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Crown,
    description: 'Acceso total. No puede ser modificado.',
  },
  admin:  {
    label: 'Admin',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Shield,
    description: 'Puede gestionar leads, funnels y miembros del equipo.',
  },
  member: {
    label: 'Member',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: User,
    description: 'Puede ver y editar leads y funnels asignados.',
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: Eye,
    description: 'Solo lectura. No puede crear ni modificar recursos.',
  },
}

const INVITE_ROLE_OPTIONS: { value: InviteRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Puede gestionar leads, funnels y miembros del equipo.',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Puede ver y editar leads y funnels asignados.',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Solo lectura. No puede crear ni modificar recursos.',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return 'Ahora mismo'
  if (diffMin < 60) return `Hace ${diffMin} min`
  if (diffHour < 24) return `Hace ${diffHour}h`
  if (diffDay < 7) return `Hace ${diffDay}d`
  if (diffMonth < 1) return `Hace ${diffDay}d`
  if (diffMonth < 12) return `Hace ${diffMonth} mes${diffMonth > 1 ? 'es' : ''}`
  return `Hace ${diffYear} año${diffYear > 1 ? 's' : ''}`
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500',
]

function getAvatarColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ---------------------------------------------------------------------------
// canManage — permission check
// ---------------------------------------------------------------------------

function canManage(
  currentRole: TeamUser['role'],
  currentId: string,
  target: TeamUser,
): boolean {
  // Viewer and member cannot manage anyone
  if (currentRole === 'viewer' || currentRole === 'member') return false
  // Cannot modify yourself
  if (currentId === target.id) return false
  // Nobody can modify the owner
  if (target.role === 'owner') return false
  // Admin cannot modify other admins (only owner can)
  if (currentRole === 'admin' && target.role === 'admin') return false
  return true
}

// ---------------------------------------------------------------------------
// RoleBadge
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: TeamUser['role'] }) {
  const meta = ROLE_META[role]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
        meta.color,
      )}
    >
      <Icon className="w-3 h-3" aria-hidden />
      {meta.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// LoadingSkeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-px" aria-busy="true" aria-label="Cargando miembros">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex-shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3.5 bg-slate-200 rounded-full w-40" />
            <div className="h-3 bg-slate-100 rounded-full w-56" />
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded-full hidden sm:block" />
          <div className="h-5 w-14 bg-slate-100 rounded-full hidden md:block" />
          <div className="h-3 w-20 bg-slate-100 rounded-full hidden lg:block" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState({ canInvite, onInvite }: { canInvite: boolean; onInvite: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
        <Users className="w-7 h-7 text-slate-400" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-700">No hay miembros en el equipo</p>
        <p className="text-xs text-slate-400">
          {canInvite
            ? 'Invita a tu primer colaborador para empezar.'
            : 'Contacta al owner para que te agregue colaboradores.'}
        </p>
      </div>
      {canInvite && (
        <button
          type="button"
          onClick={onInvite}
          className="flex items-center gap-2 min-h-[40px] px-5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
        >
          <UserPlus className="w-4 h-4" aria-hidden />
          Invitar miembro
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// InviteModal
// ---------------------------------------------------------------------------

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: TeamUser) => void
  token: string
}

function InviteModal({ isOpen, onClose, onSuccess, token }: InviteModalProps) {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [role,    setRole]    = useState<InviteRole>('member')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')
  const [sentEmail, setSentEmail] = useState('')

  const selectedRoleInfo = INVITE_ROLE_OPTIONS.find((o) => o.value === role)!

  function reset() {
    setName('')
    setEmail('')
    setRole('member')
    setLoading(false)
    setSuccess(false)
    setError('')
    setSentEmail('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/v1/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data?.message ?? `Error al enviar la invitación (${res.status}).`,
        )
      }

      const newUser: TeamUser = await res.json()
      setSentEmail(email)
      setSuccess(true)
      onSuccess(newUser)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo enviar la invitación. Intenta nuevamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-brand-400" aria-hidden />
            </div>
            <div>
              <h2 id="invite-modal-title" className="text-base font-bold text-white">
                Invitar miembro
              </h2>
              <p className="text-xs text-slate-400">
                Se enviará un email con credenciales temporales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" aria-hidden />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-white">Invitacion enviada</p>
                <p className="text-sm text-slate-400">
                  Se envio un email con las credenciales temporales a{' '}
                  <span className="text-white font-semibold">{sentEmail}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
              >
                Entendido
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
                  {error}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label htmlFor="invite-name" className="block text-xs font-semibold text-slate-300">
                  Nombre completo <span className="text-red-400" aria-hidden>*</span>
                </label>
                <input
                  id="invite-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError('') }}
                  placeholder="Ana Perez"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="invite-email" className="block text-xs font-semibold text-slate-300">
                  Email <span className="text-red-400" aria-hidden>*</span>
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError('') }}
                  placeholder="ana@tuempresa.com"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="block text-xs font-semibold text-slate-300">
                  Rol
                </label>
                <div className="relative">
                  <select
                    id="invite-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as InviteRole)}
                    className="w-full min-h-[42px] pl-3 pr-8 py-2 rounded-xl border border-white/10 bg-slate-800 text-sm text-slate-200 focus:border-brand-500 focus:outline-none transition-colors cursor-pointer appearance-none"
                  >
                    {INVITE_ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                    aria-hidden
                  />
                </div>
                <p className="text-xs text-slate-500 px-1">{selectedRoleInfo.description}</p>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim() || !email.trim()}
                className="w-full min-h-[44px] mt-1 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Enviando…
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" aria-hidden />
                    Enviar invitacion
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// UserRow
// ---------------------------------------------------------------------------

interface UserRowProps {
  user: TeamUser
  currentRole: TeamUser['role']
  currentId: string
  token: string
  onUpdated: (updated: TeamUser) => void
}

function UserRow({ user, currentRole, currentId, token, onUpdated }: UserRowProps) {
  const [savingRole,   setSavingRole]   = useState(false)
  const [savingActive, setSavingActive] = useState(false)
  const [roleError,    setRoleError]    = useState('')

  const manageable = canManage(currentRole, currentId, user)

  async function handleRoleChange(newRole: TeamUser['role']) {
    if (!manageable) return
    setSavingRole(true)
    setRoleError('')
    try {
      const res = await fetch(`${API}/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setRoleError(data?.message ?? 'Error al cambiar el rol.')
        return
      }
      const updated: TeamUser = await res.json()
      onUpdated(updated)
    } catch {
      setRoleError('Error de conexion. Intenta nuevamente.')
    } finally {
      setSavingRole(false)
    }
  }

  async function handleToggleActive() {
    if (!manageable) return
    setSavingActive(true)
    try {
      const res = await fetch(`${API}/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (!res.ok) return
      const updated: TeamUser = await res.json()
      onUpdated(updated)
    } finally {
      setSavingActive(false)
    }
  }

  const avatarBg = getAvatarColor(user.id)
  const initials = getInitials(user.name, user.email)

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
      {/* Avatar */}
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
          'text-white text-xs font-bold select-none',
          avatarBg,
        )}
        aria-hidden
      >
        {initials}
      </div>

      {/* Name + Email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {user.name ?? user.email}
        </p>
        {user.name && (
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
        )}
      </div>

      {/* Role */}
      <div className="hidden sm:block flex-shrink-0">
        {manageable ? (
          <div className="relative">
            <select
              value={user.role}
              onChange={(e) => handleRoleChange(e.target.value as TeamUser['role'])}
              disabled={savingRole}
              aria-label={`Cambiar rol de ${user.name ?? user.email}`}
              className={cn(
                'min-h-[32px] pl-2 pr-6 py-1 rounded-lg border text-xs font-semibold',
                'bg-white focus:outline-none cursor-pointer appearance-none',
                'disabled:opacity-60 transition-colors',
                ROLE_META[user.role].color,
              )}
            >
              {(['admin', 'member', 'viewer'] as const).map((r) => (
                <option key={r} value={r}>{ROLE_META[r].label}</option>
              ))}
            </select>
            {savingRole ? (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-slate-400 pointer-events-none" aria-hidden />
            ) : (
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-current opacity-60 pointer-events-none" aria-hidden />
            )}
            {roleError && (
              <p className="absolute top-full mt-1 left-0 text-xs text-red-500 whitespace-nowrap">{roleError}</p>
            )}
          </div>
        ) : (
          <RoleBadge role={user.role} />
        )}
      </div>

      {/* Status badge */}
      <div className="hidden md:block flex-shrink-0">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
            user.isActive
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              user.isActive ? 'bg-green-500' : 'bg-red-400',
            )}
            aria-hidden
          />
          {user.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Last access */}
      <div className="hidden lg:block flex-shrink-0 w-24 text-right">
        <p className="text-xs text-slate-400">{formatRelativeDate(user.lastLoginAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 w-8">
        {manageable && (
          <button
            type="button"
            onClick={handleToggleActive}
            disabled={savingActive}
            aria-label={user.isActive ? `Desactivar a ${user.name ?? user.email}` : `Activar a ${user.name ?? user.email}`}
            className={cn(
              'min-w-[32px] min-h-[32px] rounded-lg border px-1.5 text-xs font-semibold',
              'flex items-center justify-center transition-colors disabled:opacity-50',
              user.isActive
                ? 'border-red-200 text-red-500 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
            )}
          >
            {savingActive ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <span className="leading-none">{user.isActive ? 'Off' : 'On'}</span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamPage() {
  const { data: session, status } = useSession()
  const token       = session?.accessToken ?? ''
  const currentRole = (session?.user?.role as TeamUser['role']) ?? 'viewer'
  const currentId   = session?.user?.id ?? ''

  const [users,     setUsers]     = useState<TeamUser[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  const canInvite = currentRole === 'owner' || currentRole === 'admin'

  useEffect(() => {
    if (status !== 'authenticated' || !token) return
    setLoading(true)
    setLoadError('')

    fetch(`${API}/api/v1/users`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<TeamUser[]>
      })
      .then(setUsers)
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : 'No se pudo cargar el equipo.',
        )
      })
      .finally(() => setLoading(false))
  }, [status, token])

  function handleUserUpdated(updated: TeamUser) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
  }

  function handleInviteSuccess(newUser: TeamUser) {
    setUsers((prev) => {
      const exists = prev.some((u) => u.id === newUser.id)
      return exists ? prev : [...prev, newUser]
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Equipo</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestiona los miembros de tu workspace
          </p>
        </div>
        {canInvite && (
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="btn-cta flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" aria-hidden />
            Invitar miembro
          </button>
        )}
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          {loadError}
        </div>
      )}

      {/* Table */}
      <section
        className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden"
        aria-label="Miembros del equipo"
      >
        {/* Table header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 flex-shrink-0" aria-hidden />
            <p className="flex-1 text-xs font-bold text-slate-500 uppercase tracking-wide">
              Miembro
            </p>
            <p className="hidden sm:block w-20 text-xs font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">
              Rol
            </p>
            <p className="hidden md:block w-20 text-xs font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">
              Estado
            </p>
            <p className="hidden lg:block w-24 text-right text-xs font-bold text-slate-500 uppercase tracking-wide flex-shrink-0">
              Ultimo acceso
            </p>
            <div className="w-8 flex-shrink-0" aria-hidden />
          </div>
        </div>

        {/* Rows */}
        {loading ? (
          <LoadingSkeleton />
        ) : users.length === 0 ? (
          <EmptyState canInvite={canInvite} onInvite={() => setShowInvite(true)} />
        ) : (
          <div role="list" aria-label="Lista de miembros">
            {users.map((user) => (
              <div key={user.id} role="listitem">
                <UserRow
                  user={user}
                  currentRole={currentRole}
                  currentId={currentId}
                  token={token}
                  onUpdated={handleUserUpdated}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Member count */}
      {!loading && users.length > 0 && (
        <p className="text-xs text-slate-400 text-right">
          {users.length} {users.length === 1 ? 'miembro' : 'miembros'} en el workspace
        </p>
      )}

      {/* Invite modal */}
      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={handleInviteSuccess}
        token={token}
      />
    </div>
  )
}

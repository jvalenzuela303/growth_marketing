'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Zap, AlertCircle, FlaskConical, BarChart3, Users, MessageCircle } from 'lucide-react'

// ─── Test users (solo visible en desarrollo) ────────────────────────────────
const IS_DEV = process.env.NODE_ENV === 'development'

const TEST_USERS = [
  {
    label: 'Admin — owner',
    email: 'admin@growthengine.io',
    password: 'admin123',
    role: 'owner',
  },
] as const

// ─── Feature highlights ──────────────────────────────────────────────────────
const FEATURES = [
  { icon: BarChart3,    text: 'Scoring predictivo de leads con IA' },
  { icon: Users,        text: 'CRM multi-empresa con aislamiento de datos' },
  { icon: MessageCircle,text: 'Automatizaciones WhatsApp + SMS' },
]

// ─────────────────────────────────────────────────────────────────────────────

function LoginForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/overview'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Email o contraseña incorrectos. Verifica tus credenciales.')
      setLoading(false)
      return
    }

    router.push(callbackUrl)
  }

  function handleTestUserSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = TEST_USERS.find((u) => u.email === e.target.value)
    if (selected) {
      setEmail(selected.email)
      setPassword(selected.password)
      setError('')
    } else {
      setEmail('')
      setPassword('')
    }
  }

  return (
    <main className="min-h-screen flex bg-slate-950">
      {/* ── Left panel: marketing copy ─────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 px-12 py-12 bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 border-r border-white/5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div>
            <p className="text-base font-extrabold text-white leading-tight">Growth Engine</p>
            <p className="text-xs text-white/40 leading-tight">Plataforma de marketing B2C</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Convierte leads en clientes, a escala.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed">
              La plataforma all-in-one para agencias y equipos de ventas que quieren automatizar la captación y calificación de leads con IA.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-brand-400" aria-hidden />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer copy */}
        <p className="text-xs text-white/20">
          &copy; {new Date().getFullYear()} Growth Engine · Cada empresa accede a su propio espacio de trabajo aislado.
        </p>
      </div>

      {/* ── Right panel: login form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-950">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile-only logo */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" aria-hidden />
            </div>
            <p className="text-base font-extrabold text-white">Growth Engine</p>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-white">Accede a tu workspace</h1>
            <p className="text-sm text-slate-400">
              Ingresa las credenciales de tu cuenta de empresa.
            </p>
          </div>

          {/* ── Dev: selector de usuarios de prueba ───────────────────────── */}
          {IS_DEV && (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-400">
                <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wide">Modo desarrollo</span>
              </div>
              <select
                defaultValue=""
                onChange={handleTestUserSelect}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>Cargar cuenta de prueba…</option>
                {TEST_USERS.map((u) => (
                  <option key={u.email} value={u.email}>{u.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Error alert */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-slate-300">
                Email corporativo
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.cl"
                aria-required
                className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-base focus:border-brand-500 focus:outline-none focus:bg-white/8 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-required
                className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-base focus:border-brand-500 focus:outline-none focus:bg-white/8 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cta w-full mt-2"
              aria-label="Iniciar sesión"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  Verificando…
                </>
              ) : (
                'Ingresar al workspace'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="flex-1 h-px bg-white/5" />
            <span>¿Tu empresa no tiene cuenta?</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <a
            href="mailto:ventas@growthengine.io?subject=Solicitud de acceso"
            className="flex items-center justify-center w-full min-h-[44px] rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:border-white/20 transition-colors"
          >
            Solicitar acceso para tu empresa
          </a>

          <p className="text-center text-xs text-slate-600">
            ¿Problemas para acceder?{' '}
            <a href="mailto:soporte@growthengine.io" className="text-brand-500 hover:underline">
              Contacta soporte
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

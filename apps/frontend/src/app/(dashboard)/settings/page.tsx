'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Eye, EyeOff, Save, CheckCircle2, Loader2,
  Instagram, Calendar, Link2, Unlink, ExternalLink,
  AlertCircle, CheckCircle, Copy, Code2, Key,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getSettings,
  updateSettings,
  getInstagramStatus,
  disconnectInstagram,
  getInstagramOAuthInitUrl,
  type TenantSettings,
  type InstagramStatus,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// SecretInput
// ---------------------------------------------------------------------------

function SecretInput({
  id, label, description, value, onChange, placeholder = '••••••••••••••••', required,
}: {
  id: string; label: string; description: string; value: string
  onChange: (v: string) => void; placeholder?: string; required?: boolean
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700">
        {label}{required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
      </label>
      <p className="text-xs text-slate-400">{description}</p>
      <div className="relative">
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            'w-full min-h-[48px] pr-12 pl-4 py-3 rounded-xl border-2 text-base bg-white',
            'placeholder:text-slate-300 font-mono text-sm',
            'border-slate-200 focus:border-brand-500 focus:outline-none transition-colors',
          )}
        />
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          aria-label={revealed ? 'Ocultar valor' : 'Mostrar valor'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {revealed ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SettingsSection
// ---------------------------------------------------------------------------

function SettingsSection({ title, description, children }: {
  title: string; description: string; children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="px-6 py-5 space-y-5">{children}</div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex w-11 h-6 rounded-full transition-colors duration-200',
        checked ? 'bg-brand-500' : 'bg-slate-200',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow',
          'transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Instagram connect panel
// ---------------------------------------------------------------------------

function InstagramPanel({ accessToken }: { accessToken: string }) {
  const [status,       setStatus]       = useState<InstagramStatus | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const searchParams = useSearchParams()

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const s = await getInstagramStatus(accessToken)
      setStatus(s)
    } catch {
      setStatus({ connected: false, pageId: null, username: null })
    } finally {
      setLoading(false)
    }
  }, [accessToken])

  useEffect(() => { loadStatus() }, [loadStatus])

  // Detectar retorno del flujo OAuth
  const igSuccess = searchParams.get('ig_success')
  const igError   = searchParams.get('ig_error')

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await disconnectInstagram(accessToken)
      setStatus({ connected: false, pageId: null, username: null })
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        Verificando conexión…
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {igSuccess && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          Instagram conectado correctamente.
        </div>
      )}
      {igError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          Error al conectar Instagram: {decodeURIComponent(igError)}
        </div>
      )}

      {status?.connected ? (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {status.username ? `@${status.username}` : 'Instagram conectado'}
              </p>
              <p className="text-xs text-slate-500">Page ID: {status.pageId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
          >
            {disconnecting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              : <Unlink className="w-3.5 h-3.5" aria-hidden />}
            Desconectar
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-slate-400" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No conectado</p>
              <p className="text-xs text-slate-400">
                Conecta tu cuenta para recibir DMs como conversaciones
              </p>
            </div>
          </div>
          <a
            href={getInstagramOAuthInitUrl()}
            className={cn(
              'flex items-center gap-1.5 min-h-[36px] px-4 rounded-xl text-sm font-semibold',
              'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white',
              'hover:opacity-90 transition-opacity shadow-sm',
            )}
          >
            <Link2 className="w-3.5 h-3.5" aria-hidden />
            Conectar
          </a>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Requiere una cuenta de Instagram Business vinculada a una Página de Facebook.
        Necesita permisos: <code className="font-mono bg-slate-100 px-1 rounded">instagram_manage_messages</code>.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Google Calendar / Calendly panel
// ---------------------------------------------------------------------------

function CalendarTab({
  calendlyKey,
  onCalendlyChange,
}: {
  calendlyKey: string
  onCalendlyChange: (v: string) => void
}) {
  const frontendUrl    = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'
  const gcalOAuthUrl   = `${frontendUrl}/api/v1/auth/google-calendar`

  return (
    <div className="space-y-6">
      {/* Google Calendar */}
      <SettingsSection
        title="Google Calendar"
        description="Sincroniza las citas programadas directamente con Google Calendar."
      >
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Google Calendar OAuth</p>
              <p className="text-xs text-slate-400">
                Al conectar, las citas se crearán automáticamente en tu calendario
              </p>
            </div>
          </div>
          <a
            href={gcalOAuthUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1.5 min-h-[36px] px-4 rounded-xl text-sm font-semibold',
              'bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm',
            )}
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
            Conectar Google
          </a>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">
            Variables de entorno requeridas en el backend:
          </p>
          <div className="font-mono text-xs bg-slate-50 rounded-xl px-4 py-3 space-y-1 text-slate-600 border border-slate-100">
            <p>GOOGLE_CLIENT_ID=<span className="text-slate-400">tu-client-id</span></p>
            <p>GOOGLE_CLIENT_SECRET=<span className="text-slate-400">tu-client-secret</span></p>
            <p>GOOGLE_REDIRECT_URI=<span className="text-slate-400">http://localhost:4001/api/v1/auth/google-calendar/callback</span></p>
          </div>
        </div>
      </SettingsSection>

      {/* Calendly */}
      <SettingsSection
        title="Calendly"
        description="Integración con Calendly para agendamiento automático con leads."
      >
        <SecretInput
          id="calendlyApiKey"
          label="Calendly API Key"
          description="Token personal de Calendly. Se usa para obtener disponibilidad y crear eventos."
          value={calendlyKey}
          onChange={onCalendlyChange}
          placeholder="eyJhbGciOiJIUzI1NiJ9.••••"
        />
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500 font-medium">Cómo obtenerlo:</p>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
            <li>Ingresa a <span className="font-mono bg-slate-100 px-1 rounded">calendly.com/integrations/api_webhooks</span></li>
            <li>Genera un nuevo Personal Access Token</li>
            <li>Pégalo aquí y guarda la configuración</li>
          </ol>
        </div>
      </SettingsSection>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = 'integraciones' | 'calendario' | 'notificaciones' | 'widget' | 'sms'

const TABS: { key: Tab; label: string }[] = [
  { key: 'integraciones',  label: 'Integraciones'  },
  { key: 'sms',            label: 'SMS (Twilio)'   },
  { key: 'calendario',     label: 'Calendario'     },
  { key: 'notificaciones', label: 'Notificaciones' },
  { key: 'widget',         label: 'Widget Embed'   },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const searchParams      = useSearchParams()
  const token             = session?.accessToken ?? ''

  const initialTab = (searchParams.get('tab') as Tab) ?? 'integraciones'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const [settings, setSettings] = useState({
    metaPixelId:    '',
    metaCAPIToken:  '',
    waPhoneId:      '',
    waToken:        '',
    sendgridApiKey: '',
    alertEmail:     '',
    hotLeadAlert:   true,
    dailyDigest:    false,
    calendlyApiKey: '',
  })
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loadError, setLoadError] = useState('')

  // Cargar settings desde backend
  useEffect(() => {
    if (!token) return
    getSettings(token).then((s) => {
      setSettings((prev) => ({
        ...prev,
        metaPixelId:    s.metaPixelId    ?? '',
        metaCAPIToken:  s.metaCapiToken  ?? '',
        waPhoneId:      s.metaWhatsappPhoneId ?? '',
        waToken:        s.metaWhatsappToken   ?? '',
        sendgridApiKey: s.sendgridApiKey ?? '',
        alertEmail:     s.alertEmail     ?? '',
        hotLeadAlert:   s.hotLeadAlertEnabled,
        dailyDigest:    s.dailyDigestEnabled,
      }))
    }).catch(() => setLoadError('No se pudieron cargar los ajustes actuales.'))
  }, [token])

  function update<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateSettings(
        {
          metaPixelId:         settings.metaPixelId   || undefined,
          metaCapiToken:       settings.metaCAPIToken || undefined,
          metaWhatsappPhoneId: settings.waPhoneId     || undefined,
          metaWhatsappToken:   settings.waToken       || undefined,
          sendgridApiKey:      settings.sendgridApiKey || undefined,
          alertEmail:          settings.alertEmail    || undefined,
          hotLeadAlertEnabled: settings.hotLeadAlert,
          dailyDigestEnabled:  settings.dailyDigest,
        },
        token,
      )
      setSaved(true)
    } catch {
      setLoadError('Error al guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Configuración</h1>
          <p className="text-sm text-slate-500 mt-0.5">Integraciones y credenciales del sistema</p>
        </div>
        <Link
          href="/settings/api-keys"
          className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-800 font-medium whitespace-nowrap"
        >
          <Key className="w-4 h-4" />
          API Keys
        </Link>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden />
          {loadError}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB: Integraciones ── */}
      {activeTab === 'integraciones' && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Meta / Facebook */}
          <SettingsSection
            title="Meta Ads (Facebook & Instagram)"
            description="Necesario para el tracking de conversiones y CAPI server-side."
          >
            <SecretInput
              id="metaPixelId"
              label="Meta Pixel ID"
              description="ID del Pixel de Meta para tracking en el navegador."
              value={settings.metaPixelId}
              onChange={(v) => update('metaPixelId', v)}
              placeholder="123456789012345"
              required
            />
            <SecretInput
              id="metaCAPIToken"
              label="Meta CAPI Token (Conversions API)"
              description="Token de acceso del sistema para enviar eventos server-side. Aumenta la precisión del tracking hasta un 30%."
              value={settings.metaCAPIToken}
              onChange={(v) => update('metaCAPIToken', v)}
              required
            />
          </SettingsSection>

          {/* WhatsApp */}
          <SettingsSection
            title="WhatsApp Business API"
            description="Para enviar secuencias automatizadas a leads calificados."
          >
            <SecretInput
              id="waPhoneId"
              label="WhatsApp Phone Number ID"
              description="ID del número de teléfono en Meta Business Manager."
              value={settings.waPhoneId}
              onChange={(v) => update('waPhoneId', v)}
            />
            <SecretInput
              id="waToken"
              label="WhatsApp Access Token"
              description="Token de acceso permanente para la API de WhatsApp Business."
              value={settings.waToken}
              onChange={(v) => update('waToken', v)}
            />
          </SettingsSection>

          {/* Instagram DM */}
          <SettingsSection
            title="Instagram DM"
            description="Recibe y responde mensajes directos de Instagram desde el inbox de conversaciones."
          >
            {token && <InstagramPanel accessToken={token} />}
          </SettingsSection>

          {/* Email (SendGrid) */}
          <SettingsSection
            title="Email — SendGrid"
            description="Para enviar emails de bienvenida y secuencias de nurturing."
          >
            <SecretInput
              id="sendgridApiKey"
              label="SendGrid API Key"
              description="Empieza con SG. — Se usa para enviar emails transaccionales y de marketing."
              value={settings.sendgridApiKey}
              onChange={(v) => update('sendgridApiKey', v)}
              placeholder="SG.••••••••••••"
            />
          </SettingsSection>

          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      {/* ── TAB: Calendario ── */}
      {activeTab === 'calendario' && (
        <form onSubmit={handleSave} className="space-y-6">
          <CalendarTab
            calendlyKey={settings.calendlyApiKey}
            onCalendlyChange={(v) => update('calendlyApiKey', v)}
          />
          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      {/* ── TAB: Notificaciones ── */}
      {activeTab === 'notificaciones' && (
        <form onSubmit={handleSave} className="space-y-6">
          <SettingsSection
            title="Notificaciones"
            description="Configura cuándo y cómo recibir alertas."
          >
            <div className="space-y-1.5">
              <label htmlFor="alertEmail" className="block text-sm font-semibold text-slate-700">
                Email para alertas
              </label>
              <p className="text-xs text-slate-400">
                Recibirás notificaciones de leads calientes en esta dirección.
              </p>
              <input
                id="alertEmail"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="alertas@tuempresa.com"
                value={settings.alertEmail}
                onChange={(e) => update('alertEmail', e.target.value)}
                className={cn(
                  'w-full min-h-[48px] px-4 py-3 rounded-xl border-2 text-base bg-white',
                  'border-slate-200 focus:border-brand-500 focus:outline-none transition-colors',
                )}
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Alerta de lead caliente</p>
                <p className="text-xs text-slate-400">
                  Recibe un email inmediato cuando un lead alcanza score &gt; 80
                </p>
              </div>
              <Toggle
                checked={settings.hotLeadAlert}
                onChange={(v) => update('hotLeadAlert', v)}
                label="Alerta de lead caliente"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-3 border-t border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-700">Resumen diario</p>
                <p className="text-xs text-slate-400">
                  Email con KPIs del día anterior, enviado cada mañana a las 8am
                </p>
              </div>
              <Toggle
                checked={settings.dailyDigest}
                onChange={(v) => update('dailyDigest', v)}
                label="Resumen diario"
              />
            </div>
          </SettingsSection>

          <SaveButton saving={saving} saved={saved} />
        </form>
      )}

      {/* ── TAB: SMS Twilio ── */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          <SettingsSection
            title="Twilio SMS — Canal de fallback"
            description="Cuando WhatsApp no está disponible o falla, los mensajes se envían por SMS usando Twilio. Configura tus credenciales en el archivo .env del backend."
          >
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-blue-800">Variables de entorno requeridas</p>
              <ul className="text-xs text-blue-700 space-y-1 font-mono">
                <li><span className="font-bold">TWILIO_ACCOUNT_SID</span> — Account SID de console.twilio.com</li>
                <li><span className="font-bold">TWILIO_AUTH_TOKEN</span> — Auth Token de console.twilio.com</li>
                <li><span className="font-bold">TWILIO_FROM_NUMBER</span> — Número Twilio formato +1XXXXXXXXXX</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Endpoints disponibles</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">POST /api/v1/sms/send</code> — SMS directo</li>
                <li><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">POST /api/v1/sms/send-with-fallback</code> — WhatsApp primero, SMS si falla</li>
                <li><code className="bg-white px-1.5 py-0.5 rounded border border-slate-200">GET /api/v1/sms/status</code> — Verifica si Twilio está configurado</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700">Lógica de fallback</p>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                <li>El worker de messaging intenta WhatsApp (Meta Business API)</li>
                <li>Si WhatsApp no está disponible o retorna error → llama a SMS via Twilio</li>
                <li>Si ninguno está configurado → registra error y continúa</li>
                <li>Todos los intentos se persisten en la tabla <code>conversations</code> con el canal real usado</li>
              </ol>
            </div>
          </SettingsSection>
        </div>
      )}

      {/* ── TAB: Widget Embed ── */}
      {activeTab === 'widget' && (
        <WidgetEmbedTab tenantSlug={session?.user.tenantSlug ?? ''} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Widget embed tab
// ---------------------------------------------------------------------------

function WidgetEmbedTab({ tenantSlug }: { tenantSlug: string }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'
  const [copied, setCopied] = useState(false)

  const snippetJs   = `<script src="${apiBase}/api/v1/widget/${tenantSlug}/widget.js" defer></script>`
  const snippetNpm  = `<!-- Pega este snippet antes de </body> en tu sitio web -->\n${snippetJs}`

  async function copySnippet() {
    await navigator.clipboard.writeText(snippetJs)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Widget de captación embebible"
        description="Añade un chat flotante a cualquier sitio web para capturar leads directamente en tu funnel."
      >
        <div className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl border border-brand-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Widget listo para incrustar</p>
              <p className="text-xs text-slate-500 mt-0.5">
                El widget carga tu primer funnel activo como quiz interactivo.
              </p>
            </div>
          </div>

          {/* Code snippet */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Código para pegar antes de &lt;/body&gt;
            </p>
            <div className="relative">
              <pre className="text-xs bg-slate-900 text-emerald-400 rounded-2xl p-4 overflow-x-auto select-all">
                <code>{snippetNpm}</code>
              </pre>
              <button
                onClick={copySnippet}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Config URL */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Endpoint de configuración (JSON)
            </p>
            <a
              href={`${apiBase}/api/v1/widget/${tenantSlug}/config`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-brand-600 font-mono hover:underline"
            >
              {apiBase}/api/v1/widget/{tenantSlug}/config
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Cómo funciona</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Pega el snippet en cualquier página de tu sitio (WordPress, Webflow, HTML estático).</li>
              <li>El script carga tu funnel activo como quiz flotante en la esquina inferior derecha.</li>
              <li>Cuando un lead completa el quiz, el lead llega automáticamente a tu pipeline.</li>
              <li>Asegúrate de tener al menos un funnel activo en la sección Embudos.</li>
            </ol>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="submit"
        disabled={saving}
        className="btn-cta min-w-[160px]"
        aria-label="Guardar configuración"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Guardando…</>
        ) : saved ? (
          <><CheckCircle2 className="w-4 h-4" aria-hidden />Guardado</>
        ) : (
          <><Save className="w-4 h-4" aria-hidden />Guardar configuración</>
        )}
      </button>
      {saved && (
        <p className="text-sm text-emerald-600 font-medium">
          Los cambios se aplicarán en el próximo ciclo.
        </p>
      )}
    </div>
  )
}

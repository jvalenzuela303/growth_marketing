import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { Plus, Zap, Play, Pause, Trash2, Clock, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { getAutomationFlows } from '@/lib/api'
import type { AutomationFlow } from '@/lib/api'
import { cn } from '@/lib/utils'
import { FlowActions } from '@/components/automations/FlowActions'
import { AutomationsGate } from '@/components/automations/AutomationsGate'

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS = {
  active: { label: 'Activo',   classes: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  draft:  { label: 'Borrador', classes: 'bg-slate-100   text-slate-600',   icon: Clock        },
  paused: { label: 'Pausado',  classes: 'bg-amber-100   text-amber-700',   icon: Pause        },
} as const

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status as keyof typeof STATUS] ?? STATUS.draft
  const Icon = s.icon
  return (
    <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', s.classes)}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  )
}

// ── Trigger label ─────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  'manual':         'Manual',
  'lead.captured':  'Lead capturado',
  'score.updated':  'Score actualizado',
  'schedule':       'Programado',
}

// ── Flow card ─────────────────────────────────────────────────────────────────

function FlowCard({ flow }: { flow: AutomationFlow }) {
  return (
    <article className="kpi-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 truncate">{flow.name}</h3>
            <StatusBadge status={flow.status} />
          </div>
          {flow.description && (
            <p className="text-sm text-slate-500 line-clamp-2">{flow.description}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">
            Disparador: <span className="font-medium text-slate-600">{TRIGGER_LABELS[flow.trigger] ?? flow.trigger}</span>
          </p>
        </div>
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Zap className="w-5 h-5 text-brand-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-lg font-extrabold text-slate-900">{flow.runCount}</p>
          <p className="text-xs text-slate-400">Ejecuciones</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-lg font-extrabold text-slate-900">
            {flow.lastRunAt
              ? new Date(flow.lastRunAt).toLocaleDateString('es-CL')
              : '—'}
          </p>
          <p className="text-xs text-slate-400">Últ. ejecución</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/automations/${flow.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Editar flujo
        </Link>
        <FlowActions flow={flow} />
      </div>
    </article>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AutomationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) return null

  let flows: AutomationFlow[] = []
  try {
    flows = await getAutomationFlows(session.accessToken)
  } catch {
    // graceful fallback
  }

  return (
    <AutomationsGate>
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Automatizaciones</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {flows.length} flujo{flows.length !== 1 ? 's' : ''} configurado{flows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/automations/playbooks"
            className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-4 h-4" aria-hidden />
            Playbooks
          </Link>
          <Link
            href="/automations/new"
            className="btn-cta text-base px-5 py-2.5 min-h-[44px]"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Nuevo flujo
          </Link>
        </div>
      </div>

      {flows.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map((flow) => (
            <FlowCard key={flow.id} flow={flow} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Zap className="w-8 h-8 text-brand-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sin flujos de automatización</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Diseña flujos visuales para automatizar seguimientos, notificaciones y acciones
              disparadas por eventos de tus leads.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/automations/playbooks" className="flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <BookOpen className="w-4 h-4" />
              Ver playbooks
            </Link>
            <Link href="/automations/new" className="btn-cta">
              <Plus className="w-4 h-4" />
              Crear desde cero
            </Link>
          </div>
        </div>
      )}
    </div>
    </AutomationsGate>
  )
}

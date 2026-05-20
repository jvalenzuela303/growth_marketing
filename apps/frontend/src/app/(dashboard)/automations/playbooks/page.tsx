'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Zap, ArrowLeft, Loader2, Search,
  MessageCircle, Mail, Bell, Target,
  TrendingUp, Users, Calendar, Star,
  Phone, BarChart3, RefreshCw, Handshake,
  ThumbsUp, Clock, BotMessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { createAutomationFlow } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Playbook {
  id:          string
  name:        string
  description: string
  trigger:     string
  category:    string
  icon:        React.ComponentType<{ className?: string }>
  color:       string
  tags:        string[]
  graph:       object
}

// ── Playbook catalog ──────────────────────────────────────────────────────────

const PLAYBOOKS: Playbook[] = [
  // ── Bienvenida & captura ────────────────────────────────────────────────────
  {
    id: 'welcome-whatsapp',
    name: 'Bienvenida inmediata por WhatsApp',
    description: 'Envía un mensaje de bienvenida por WhatsApp segundos después de que un nuevo lead completa el quiz. Primer contacto en menos de 2 minutos.',
    trigger: 'lead.captured',
    category: 'Bienvenida',
    icon: MessageCircle,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    tags: ['WhatsApp', 'Lead nuevo', 'Inmediato'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Lead capturado', trigger: 'lead.captured' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 120 }, data: { label: 'Esperar 30s', delay: 30, unit: 'seconds' } },
        { id: 'send',    type: 'action',  position: { x: 0, y: 240 }, data: { label: 'WhatsApp bienvenida', action: 'whatsapp.send', template: 'welcome' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wait' },
        { id: 'e2', source: 'wait',    target: 'send' },
      ],
    },
  },
  {
    id: 'welcome-email',
    name: 'Email de bienvenida con resultados del quiz',
    description: 'Envía automáticamente el reporte de resultados del quiz al email del lead, con su score personalizado y próximos pasos.',
    trigger: 'lead.captured',
    category: 'Bienvenida',
    icon: Mail,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    tags: ['Email', 'Quiz', 'Personalizado'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 }, data: { label: 'Lead capturado', trigger: 'lead.captured' } },
        { id: 'send',    type: 'action',  position: { x: 0, y: 120 }, data: { label: 'Email con resultados', action: 'email.send', template: 'quiz_results' } },
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'send' }],
    },
  },

  // ── Nurturing ───────────────────────────────────────────────────────────────
  {
    id: 'cold-lead-5day',
    name: 'Secuencia 5 días para leads fríos',
    description: 'Secuencia de emails de valor durante 5 días para leads con score < 40. Educa, genera confianza y empuja hacia la conversión.',
    trigger: 'score.updated',
    category: 'Nurturing',
    icon: Clock,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    tags: ['Email', 'Secuencia', 'Fríos'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Score actualizado', trigger: 'score.updated' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Score < 40', condition: 'lead.score < 40' } },
        { id: 'email1',  type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Email día 1 — bienvenida', action: 'email.send', template: 'nurture_d1' } },
        { id: 'wait2',   type: 'wait',    position: { x: 0, y: 360 }, data: { label: 'Esperar 1 día', delay: 1, unit: 'days' } },
        { id: 'email2',  type: 'action',  position: { x: 0, y: 480 }, data: { label: 'Email día 2 — caso de éxito', action: 'email.send', template: 'nurture_d2' } },
        { id: 'wait3',   type: 'wait',    position: { x: 0, y: 600 }, data: { label: 'Esperar 2 días', delay: 2, unit: 'days' } },
        { id: 'email3',  type: 'action',  position: { x: 0, y: 720 }, data: { label: 'Email día 5 — CTA demo', action: 'email.send', template: 'nurture_d5' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'email1' },
        { id: 'e3', source: 'email1',  target: 'wait2' },
        { id: 'e4', source: 'wait2',   target: 'email2' },
        { id: 'e5', source: 'email2',  target: 'wait3' },
        { id: 'e6', source: 'wait3',   target: 'email3' },
      ],
    },
  },
  {
    id: 'warm-lead-whatsapp-sequence',
    name: 'Secuencia WhatsApp para leads tibios',
    description: 'Envía 3 mensajes de WhatsApp en 7 días a leads con score 40–60. Mantiene el interés y los mueve al siguiente nivel del pipeline.',
    trigger: 'score.updated',
    category: 'Nurturing',
    icon: Phone,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    tags: ['WhatsApp', 'Tibios', 'Secuencia'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Score actualizado', trigger: 'score.updated' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Score 40–60', condition: 'lead.score >= 40 AND lead.score < 60' } },
        { id: 'wa1',     type: 'action',  position: { x: 0, y: 240 }, data: { label: 'WhatsApp día 1', action: 'whatsapp.send', template: 'warm_d1' } },
        { id: 'wait2',   type: 'wait',    position: { x: 0, y: 360 }, data: { label: 'Esperar 3 días', delay: 3, unit: 'days' } },
        { id: 'wa2',     type: 'action',  position: { x: 0, y: 480 }, data: { label: 'WhatsApp día 4', action: 'whatsapp.send', template: 'warm_d4' } },
        { id: 'wait3',   type: 'wait',    position: { x: 0, y: 600 }, data: { label: 'Esperar 4 días', delay: 4, unit: 'days' } },
        { id: 'wa3',     type: 'action',  position: { x: 0, y: 720 }, data: { label: 'WhatsApp día 8', action: 'whatsapp.send', template: 'warm_d8' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'wa1'    },
        { id: 'e3', source: 'wa1',     target: 'wait2'  },
        { id: 'e4', source: 'wait2',   target: 'wa2'    },
        { id: 'e5', source: 'wa2',     target: 'wait3'  },
        { id: 'e6', source: 'wait3',   target: 'wa3'    },
      ],
    },
  },
  {
    id: 'reengagement-inactive',
    name: 'Re-engagement de leads inactivos',
    description: 'Detecta leads que no han tenido actividad en 30 días y los reactiva con un mensaje personalizado de WhatsApp y un email de oferta.',
    trigger: 'schedule',
    category: 'Nurturing',
    icon: RefreshCw,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
    tags: ['WhatsApp', 'Email', 'Inactivos', 'Programado'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Cada lunes a las 9am', trigger: 'schedule', cron: '0 9 * * 1' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Sin actividad 30 días', condition: 'lead.lastActivityDaysAgo >= 30' } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 240 }, data: { label: 'WhatsApp reactivación', action: 'whatsapp.send', template: 'reengagement' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 360 }, data: { label: 'Esperar 2 días', delay: 2, unit: 'days' } },
        { id: 'email',   type: 'action',  position: { x: 0, y: 480 }, data: { label: 'Email con oferta', action: 'email.send', template: 'reengagement_offer' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'wa'     },
        { id: 'e3', source: 'wa',      target: 'wait'   },
        { id: 'e4', source: 'wait',    target: 'email'  },
      ],
    },
  },

  // ── Alertas internas ────────────────────────────────────────────────────────
  {
    id: 'hot-lead-alert',
    name: 'Alerta de lead caliente al comercial',
    description: 'Cuando un lead supera 80 puntos de score, notifica inmediatamente al equipo comercial por WhatsApp y crea una tarea de seguimiento.',
    trigger: 'score.updated',
    category: 'Alertas',
    icon: Bell,
    color: 'bg-red-50 text-red-600 border-red-100',
    tags: ['Alerta', 'WhatsApp', 'Score alto'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Score actualizado', trigger: 'score.updated' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Score >= 80', condition: 'lead.score >= 80' } },
        { id: 'notify',  type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Notificación push interna', action: 'notification.push', message: '🔥 Lead caliente: {{lead.name}}' } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 360 }, data: { label: 'WhatsApp al comercial', action: 'whatsapp.send_internal', template: 'hot_lead_alert' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'notify' },
        { id: 'e3', source: 'notify',  target: 'wa'     },
      ],
    },
  },
  {
    id: 'roas-alert',
    name: 'Alerta semanal de rendimiento de ads',
    description: 'Cada lunes envía un resumen de ROAS, CPL y leads por canal de la semana anterior al email del administrador.',
    trigger: 'schedule',
    category: 'Alertas',
    icon: BarChart3,
    color: 'bg-blue-50 text-blue-600 border-blue-100',
    tags: ['Email', 'ROAS', 'Programado', 'Ads'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Cada lunes a las 8am', trigger: 'schedule', cron: '0 8 * * 1' } },
        { id: 'report',  type: 'action',  position: { x: 0, y: 120 }, data: { label: 'Email reporte semanal ads', action: 'email.send', template: 'weekly_roas_report' } },
      ],
      edges: [{ id: 'e1', source: 'trigger', target: 'report' }],
    },
  },

  // ── Pipeline / Deals ────────────────────────────────────────────────────────
  {
    id: 'deal-won-celebration',
    name: 'Celebración y onboarding al ganar un deal',
    description: 'Cuando se cierra un deal como "ganado", felicita al cliente por WhatsApp y comienza una secuencia de onboarding de 3 emails.',
    trigger: 'deal.won',
    category: 'Pipeline',
    icon: Handshake,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    tags: ['Deal ganado', 'WhatsApp', 'Email', 'Onboarding'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Deal ganado', trigger: 'deal.won' } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 120 }, data: { label: 'WhatsApp felicitación', action: 'whatsapp.send', template: 'deal_won_congrats' } },
        { id: 'email1',  type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Email bienvenida cliente', action: 'email.send', template: 'onboarding_d1' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 360 }, data: { label: 'Esperar 2 días', delay: 2, unit: 'days' } },
        { id: 'email2',  type: 'action',  position: { x: 0, y: 480 }, data: { label: 'Email: primeros pasos', action: 'email.send', template: 'onboarding_d3' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wa'     },
        { id: 'e2', source: 'wa',      target: 'email1' },
        { id: 'e3', source: 'email1',  target: 'wait'   },
        { id: 'e4', source: 'wait',    target: 'email2' },
      ],
    },
  },
  {
    id: 'deal-lost-recovery',
    name: 'Recuperación de deal perdido',
    description: 'Cuando un deal se marca como perdido, espera 7 días y envía un mensaje de WhatsApp con una oferta especial de recuperación.',
    trigger: 'deal.lost',
    category: 'Pipeline',
    icon: RefreshCw,
    color: 'bg-amber-50 text-amber-600 border-amber-100',
    tags: ['Deal perdido', 'WhatsApp', 'Recuperación'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Deal perdido', trigger: 'deal.lost' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 120 }, data: { label: 'Esperar 7 días', delay: 7, unit: 'days' } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 240 }, data: { label: 'WhatsApp oferta especial', action: 'whatsapp.send', template: 'deal_recovery' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wait' },
        { id: 'e2', source: 'wait',    target: 'wa'   },
      ],
    },
  },
  {
    id: 'pipeline-stale-alert',
    name: 'Alerta de deals estancados en pipeline',
    description: 'Identifica deals que llevan más de 14 días sin avanzar de etapa y notifica al comercial responsable para hacer follow-up.',
    trigger: 'schedule',
    category: 'Pipeline',
    icon: Target,
    color: 'bg-orange-50 text-orange-600 border-orange-100',
    tags: ['Pipeline', 'Alerta', 'Programado'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Cada día a las 10am', trigger: 'schedule', cron: '0 10 * * *' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Deal sin avance 14 días', condition: 'deal.daysSinceLastUpdate >= 14' } },
        { id: 'notify',  type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Notificación push interna', action: 'notification.push', message: '⚠️ Deal estancado: {{deal.name}}' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'notify' },
      ],
    },
  },

  // ── Citas ───────────────────────────────────────────────────────────────────
  {
    id: 'appointment-reminder',
    name: 'Recordatorio de cita 24h antes',
    description: 'Envía un recordatorio de WhatsApp y email 24 horas antes de cada cita agendada para reducir el porcentaje de no-shows.',
    trigger: 'appointment.upcoming',
    category: 'Citas',
    icon: Calendar,
    color: 'bg-sky-50 text-sky-600 border-sky-100',
    tags: ['Cita', 'WhatsApp', 'Email', 'Recordatorio'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: '24h antes de la cita', trigger: 'appointment.upcoming', offset: -1440 } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 120 }, data: { label: 'WhatsApp recordatorio', action: 'whatsapp.send', template: 'appointment_reminder' } },
        { id: 'email',   type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Email confirmación cita', action: 'email.send', template: 'appointment_confirm' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wa'    },
        { id: 'e2', source: 'wa',      target: 'email' },
      ],
    },
  },
  {
    id: 'post-meeting-followup',
    name: 'Follow-up post-reunión automático',
    description: 'Después de completar una cita, envía un email de seguimiento con resumen de próximos pasos y un enlace para agendar la siguiente reunión.',
    trigger: 'appointment.completed',
    category: 'Citas',
    icon: Star,
    color: 'bg-violet-50 text-violet-600 border-violet-100',
    tags: ['Cita', 'Email', 'Follow-up'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Cita completada', trigger: 'appointment.completed' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 120 }, data: { label: 'Esperar 30 min', delay: 30, unit: 'minutes' } },
        { id: 'email',   type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Email próximos pasos', action: 'email.send', template: 'post_meeting_followup' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wait'  },
        { id: 'e2', source: 'wait',    target: 'email' },
      ],
    },
  },

  // ── IA & conversacional ─────────────────────────────────────────────────────
  {
    id: 'ai-qualification',
    name: 'Calificación automática con IA por chat',
    description: 'Cuando llega un nuevo lead, el agente IA inicia una conversación de calificación para obtener información clave y mejorar el score inicial.',
    trigger: 'lead.captured',
    category: 'IA',
    icon: BotMessageSquare,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    tags: ['IA', 'WhatsApp', 'Calificación', 'Chat'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Lead capturado', trigger: 'lead.captured' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 120 }, data: { label: 'Esperar 5 min', delay: 5, unit: 'minutes' } },
        { id: 'ai',      type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Iniciar chat IA calificación', action: 'ai.start_conversation', template: 'qualification_flow' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wait' },
        { id: 'e2', source: 'wait',    target: 'ai'   },
      ],
    },
  },
  {
    id: 'out-of-hours-bot',
    name: 'Respuesta automática fuera de horario',
    description: 'Cuando un lead escribe fuera del horario comercial (8am–7pm L-V), el bot responde automáticamente indicando el horario y prometiendo seguimiento.',
    trigger: 'inbound.message',
    category: 'IA',
    icon: BotMessageSquare,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    tags: ['IA', 'WhatsApp', 'Bot', 'Horario'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Mensaje entrante', trigger: 'inbound.message' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Fuera de horario comercial', condition: 'time.isOutsideBusinessHours' } },
        { id: 'reply',   type: 'action',  position: { x: 0, y: 240 }, data: { label: 'WhatsApp respuesta automática', action: 'whatsapp.send', template: 'out_of_hours_reply' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'reply'  },
      ],
    },
  },

  // ── Fidelización ────────────────────────────────────────────────────────────
  {
    id: 'nps-survey',
    name: 'Encuesta NPS 30 días post-cierre',
    description: 'Un mes después de cerrar un deal como ganado, envía una encuesta NPS por email para medir la satisfacción del cliente y detectar promotores.',
    trigger: 'deal.won',
    category: 'Fidelización',
    icon: ThumbsUp,
    color: 'bg-pink-50 text-pink-600 border-pink-100',
    tags: ['NPS', 'Email', 'Satisfacción', 'Post-venta'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Deal ganado', trigger: 'deal.won' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 120 }, data: { label: 'Esperar 30 días', delay: 30, unit: 'days' } },
        { id: 'email',   type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Email encuesta NPS', action: 'email.send', template: 'nps_survey' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'wait'  },
        { id: 'e2', source: 'wait',    target: 'email' },
      ],
    },
  },
  {
    id: 'referral-request',
    name: 'Solicitud de referido a clientes felices',
    description: 'Identifica clientes con NPS ≥ 9 (promotores) y les envía un WhatsApp personalizado invitándolos a referir contactos a cambio de un beneficio.',
    trigger: 'schedule',
    category: 'Fidelización',
    icon: Users,
    color: 'bg-pink-50 text-pink-600 border-pink-100',
    tags: ['Referidos', 'WhatsApp', 'NPS', 'Programado'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Cada viernes a las 11am', trigger: 'schedule', cron: '0 11 * * 5' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'NPS >= 9', condition: 'lead.npsScore >= 9' } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 240 }, data: { label: 'WhatsApp solicitud referido', action: 'whatsapp.send', template: 'referral_request' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'wa'     },
      ],
    },
  },
  {
    id: 'upsell-sequence',
    name: 'Secuencia de upsell a clientes activos',
    description: 'Identifica clientes con deals ganados hace más de 60 días y sin deals adicionales, y lanza una secuencia de upsell con 2 emails y 1 WhatsApp.',
    trigger: 'schedule',
    category: 'Fidelización',
    icon: TrendingUp,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    tags: ['Upsell', 'Email', 'WhatsApp', 'Clientes'],
    graph: {
      nodes: [
        { id: 'trigger', type: 'trigger', position: { x: 0, y: 0 },   data: { label: 'Cada lunes a las 9am', trigger: 'schedule', cron: '0 9 * * 1' } },
        { id: 'filter',  type: 'filter',  position: { x: 0, y: 120 }, data: { label: 'Cliente activo +60 días', condition: 'deal.daysSinceWon >= 60 AND lead.openDeals == 0' } },
        { id: 'email1',  type: 'action',  position: { x: 0, y: 240 }, data: { label: 'Email upsell día 1', action: 'email.send', template: 'upsell_d1' } },
        { id: 'wait',    type: 'wait',    position: { x: 0, y: 360 }, data: { label: 'Esperar 3 días', delay: 3, unit: 'days' } },
        { id: 'email2',  type: 'action',  position: { x: 0, y: 480 }, data: { label: 'Email upsell día 4', action: 'email.send', template: 'upsell_d4' } },
        { id: 'wait2',   type: 'wait',    position: { x: 0, y: 600 }, data: { label: 'Esperar 2 días', delay: 2, unit: 'days' } },
        { id: 'wa',      type: 'action',  position: { x: 0, y: 720 }, data: { label: 'WhatsApp oferta upgrade', action: 'whatsapp.send', template: 'upsell_whatsapp' } },
      ],
      edges: [
        { id: 'e1', source: 'trigger', target: 'filter' },
        { id: 'e2', source: 'filter',  target: 'email1' },
        { id: 'e3', source: 'email1',  target: 'wait'   },
        { id: 'e4', source: 'wait',    target: 'email2' },
        { id: 'e5', source: 'email2',  target: 'wait2'  },
        { id: 'e6', source: 'wait2',   target: 'wa'     },
      ],
    },
  },
]

// ── Categories & helpers ──────────────────────────────────────────────────────

const CATEGORIES = ['Todos', ...Array.from(new Set(PLAYBOOKS.map((p) => p.category)))]

const TRIGGER_LABELS: Record<string, string> = {
  'lead.captured':         'Lead capturado',
  'score.updated':         'Score actualizado',
  'schedule':              'Programado',
  'deal.won':              'Deal ganado',
  'deal.lost':             'Deal perdido',
  'appointment.upcoming':  'Cita próxima',
  'appointment.completed': 'Cita completada',
  'inbound.message':       'Mensaje entrante',
}

// ── Playbook card ─────────────────────────────────────────────────────────────

function PlaybookCard({
  playbook,
  onUse,
  loading,
}: {
  playbook: Playbook
  onUse:   (p: Playbook) => void
  loading: boolean
}) {
  const Icon = playbook.icon
  const stepCount = (playbook.graph as any).nodes?.length ?? 0

  return (
    <article className={cn(
      'flex flex-col rounded-2xl border bg-white p-5 gap-4 shadow-sm',
      'hover:shadow-md transition-shadow duration-200',
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', playbook.color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900 leading-snug">{playbook.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {TRIGGER_LABELS[playbook.trigger] ?? playbook.trigger} · {stepCount} pasos
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed flex-1">{playbook.description}</p>

      <div className="flex flex-wrap gap-1">
        {playbook.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
            {tag}
          </span>
        ))}
      </div>

      <button
        onClick={() => onUse(playbook)}
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-center gap-2 min-h-[40px] rounded-xl',
          'bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold',
          'transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Usar playbook
          </>
        )}
      </button>
    </article>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaybooksPage() {
  const router            = useRouter()
  const { data: session } = useSession()

  const [search,   setSearch]   = useState('')
  const [category, setCategory] = useState('Todos')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError]       = useState('')

  const filtered = PLAYBOOKS.filter((p) => {
    const matchCat   = category === 'Todos' || p.category === category
    const q          = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  async function handleUse(playbook: Playbook) {
    if (!session?.accessToken) return
    setLoadingId(playbook.id)
    setError('')
    try {
      const flow = await createAutomationFlow(session.accessToken, {
        name:        playbook.name,
        description: playbook.description,
        trigger:     playbook.trigger,
        graph:       playbook.graph,
      })
      router.push(`/automations/${flow.id}`)
    } catch {
      setError('No se pudo crear el flujo. Intenta de nuevo.')
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link
          href="/automations"
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0 mt-0.5"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand-600" />
            Biblioteca de Playbooks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {PLAYBOOKS.length} flujos pre-configurados listos para usar. Elige uno y personalízalo.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search + category filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar playbook…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap',
                category === cat
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No hay playbooks que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((playbook) => (
            <PlaybookCard
              key={playbook.id}
              playbook={playbook}
              onUse={handleUse}
              loading={loadingId === playbook.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

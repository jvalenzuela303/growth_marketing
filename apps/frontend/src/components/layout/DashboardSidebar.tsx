'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Filter,
  Users,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Mail,
  TrendingUp,
  BotMessageSquare,
  Calendar,
  HandCoins,
  CreditCard,
  Workflow,
  Building2,
  BarChart3,
  ShieldCheck,
  BadgeDollarSign,
  LayoutList,
  Lock,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { PlanBadge } from '@/components/access/PlanBadge'
import { usePermissions } from '@/hooks/usePermissions'

type PlanTier = 'starter' | 'growth' | 'scale' | 'agency'

interface NavItem {
  href:     string
  label:    string
  icon:     React.ComponentType<{ className?: string }>
  minPlan?: PlanTier
}

const NAV_ITEMS: NavItem[] = [
  { href: '/overview',       label: 'Resumen',          icon: LayoutDashboard },
  { href: '/funnels',        label: 'Embudos',          icon: Filter },
  { href: '/leads',          label: 'Leads',            icon: Users },
  { href: '/conversations',  label: 'Conversaciones',   icon: MessageCircle },
  { href: '/chat',           label: 'Chat IA',          icon: BotMessageSquare },
  { href: '/sequences',      label: 'Secuencias',       icon: Mail,      minPlan: 'growth' },
  { href: '/ads',            label: 'Publicidad',       icon: TrendingUp },
  { href: '/deals',          label: 'Ventas',           icon: HandCoins, minPlan: 'growth' },
  { href: '/attribution',    label: 'Atribución',       icon: BarChart3, minPlan: 'growth' },
  { href: '/appointments',   label: 'Citas',            icon: Calendar },
  { href: '/automations',    label: 'Automatizaciones', icon: Workflow,  minPlan: 'scale'  },
  { href: '/billing',        label: 'Billing',          icon: CreditCard },
  { href: '/settings',       label: 'Configuracion',    icon: Settings },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: '/admin/plans',         label: 'Planes',         icon: LayoutList       },
  { href: '/admin/subscriptions', label: 'Suscripciones',  icon: Users            },
  { href: '/admin/billing',       label: 'Facturación',    icon: BadgeDollarSign  },
]

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-500',
  growth:  'bg-emerald-50 text-emerald-700',
  scale:   'bg-brand-50 text-brand-700',
  agency:  'bg-violet-50 text-violet-700',
}

interface DashboardSidebarProps {
  tenantName: string
  tenantSlug: string
  userRole:   string
  plan?:      string
}

function tenantInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function DashboardSidebar({
  tenantName,
  tenantSlug,
  userRole,
  plan = 'starter',
}: DashboardSidebarProps) {
  const pathname    = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const initials    = tenantInitials(tenantName)
  const { hasPlan } = usePermissions()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col',
        'bg-white border-r border-slate-100 shadow-card',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
      aria-label="Navegación del dashboard"
    >
      {/* ── Platform brand ─────────────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-2.5 px-4 py-4 border-b border-slate-100',
        collapsed && 'justify-center px-0',
      )}>
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-brand flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-white" aria-hidden />
        </div>
        {!collapsed && (
          <span className="text-sm font-extrabold text-slate-900 tracking-tight">
            Growth Engine
          </span>
        )}
      </div>

      {/* ── Workspace / empresa activa ──────────────────────────────────────── */}
      {!collapsed && (
        <div className="mx-3 mt-3 mb-1 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5 flex items-center gap-2.5">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
            {initials || <Building2 className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
              Workspace
            </p>
            <p className="text-sm font-bold text-slate-800 truncate leading-tight">
              {tenantName}
            </p>
            <span className={cn(
              'inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
              PLAN_COLORS[plan] ?? PLAN_COLORS.starter,
            )}>
              {plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex justify-center mt-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
            {initials || <Building2 className="w-4 h-4" />}
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto" aria-label="Menu principal">
        {NAV_ITEMS.map(({ href, label, icon: Icon, minPlan }) => {
          const isActive = pathname === href || (href !== '/overview' && pathname.startsWith(href))
          const locked   = minPlan !== undefined && !hasPlan(minPlan)
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={locked ? `${label} — requiere plan ${minPlan}` : label}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 min-h-[40px]',
                'text-sm font-medium transition-colors duration-150',
                collapsed && 'justify-center px-0',
                locked
                  ? 'text-slate-400 hover:bg-slate-50 hover:text-slate-500'
                  : isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <Icon
                className={cn(
                  'w-[18px] h-[18px] flex-shrink-0',
                  isActive && !locked && 'text-brand-600',
                  locked && 'text-slate-300',
                )}
                aria-hidden
              />
              {!collapsed && (
                <>
                  <span className="flex-1">{label}</span>
                  {locked && (
                    <Lock
                      className="w-3 h-3 text-slate-300 flex-shrink-0"
                      aria-hidden
                    />
                  )}
                </>
              )}
            </Link>
          )
        })}

        {/* ── Admin section — visible only for owner / admin ────────────── */}
        {(userRole === 'owner' || userRole === 'admin') && (
          <>
            {!collapsed && (
              <div className="px-3 pt-4 pb-1 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-slate-400" aria-hidden />
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Admin
                </p>
              </div>
            )}
            {collapsed && <div className="my-2 mx-2 border-t border-slate-100" />}
            {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 min-h-[40px]',
                    'text-sm font-medium transition-colors duration-150',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <Icon className={cn('w-[18px] h-[18px] flex-shrink-0', isActive && 'text-brand-600')} aria-hidden />
                  {!collapsed && <span>{label}</span>}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* ── Plan badge + collapse toggle ────────────────────────────────────── */}
      <div className="p-2 border-t border-slate-100 space-y-1">
        {/* Plan badge row */}
        {!collapsed ? (
          <div className="px-1 py-1.5 flex items-center justify-between">
            <PlanBadge showUpgrade={plan !== 'agency'} />
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <PlanBadge compact />
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          className={cn(
            'flex items-center justify-center w-full min-h-[36px] rounded-xl',
            'text-slate-400 hover:text-slate-700 hover:bg-slate-50',
            'transition-colors duration-150',
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" aria-hidden />
              <span className="text-xs ml-2">Colapsar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

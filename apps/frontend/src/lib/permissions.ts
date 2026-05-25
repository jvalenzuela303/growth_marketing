export const PLAN_FEATURES = {
  starter: ['leads:read', 'leads:create', 'funnels:basic', 'analytics:basic'],
  growth:  ['leads:export', 'analytics:advanced', 'sequences', 'deals'],
  scale:   ['automation', 'whatsapp', 'ai:scoring', 'ai:classify'],
  agency:  ['white-label', 'multi-tenant', 'api-access'],
} as const

export const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  growth:  'Growth',
  scale:   'Scale',
  agency:  'Agency',
}

export const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  growth:  'bg-blue-100 text-blue-700',
  scale:   'bg-purple-100 text-purple-700',
  agency:  'bg-amber-100 text-amber-700',
}

export const PLAN_BORDER_COLORS: Record<string, string> = {
  starter: 'border-gray-200',
  growth:  'border-blue-200',
  scale:   'border-purple-200',
  agency:  'border-amber-200',
}

export const PLAN_ICON_COLORS: Record<string, string> = {
  starter: 'text-gray-500',
  growth:  'text-blue-600',
  scale:   'text-purple-600',
  agency:  'text-amber-600',
}

'use client'

import { useSession } from 'next-auth/react'

const ROLE_HIERARCHY = ['viewer', 'member', 'admin', 'owner'] as const
const PLAN_HIERARCHY = ['starter', 'growth', 'scale', 'agency'] as const

export type UserRole = (typeof ROLE_HIERARCHY)[number]
export type UserPlan = (typeof PLAN_HIERARCHY)[number]

export interface PermissionsResult {
  role:     UserRole
  plan:     UserPlan
  hasRole:  (minRole: UserRole) => boolean
  hasPlan:  (minPlan: UserPlan) => boolean
  isOwner:  boolean
  isAdmin:  boolean
}

export function usePermissions(): PermissionsResult {
  const { data: session } = useSession()

  const role = (session?.user?.role ?? 'viewer') as UserRole
  const plan = (session?.user?.plan ?? 'starter') as UserPlan

  function hasRole(minRole: UserRole): boolean {
    return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(minRole)
  }

  function hasPlan(minPlan: UserPlan): boolean {
    return PLAN_HIERARCHY.indexOf(plan) >= PLAN_HIERARCHY.indexOf(minPlan)
  }

  return {
    role,
    plan,
    hasRole,
    hasPlan,
    isOwner: role === 'owner',
    isAdmin: hasRole('admin'),
  }
}

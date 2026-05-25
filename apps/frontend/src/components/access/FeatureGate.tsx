'use client'

import { usePermissions, type UserRole, type UserPlan } from '@/hooks/usePermissions'
import { UpgradePrompt } from './UpgradePrompt'

interface FeatureGateProps {
  minRole?:      UserRole
  minPlan?:      UserPlan
  /** Rendered when access is denied (overrides default behavior) */
  fallback?:     React.ReactNode
  /**
   * When true and the user lacks the required plan, renders an UpgradePrompt
   * card instead of nothing. Defaults to true when minPlan is provided.
   */
  showUpgrade?:  boolean
  /** Human-readable feature name shown in the upgrade prompt */
  featureName?:  string
  children:      React.ReactNode
}

/**
 * FeatureGate — conditionally renders children based on role and/or plan.
 *
 * Priority:
 *   1. If minRole is set and user lacks it → render fallback (or nothing).
 *   2. If minPlan is set and user lacks it → render upgrade prompt (or fallback).
 *   3. Otherwise render children.
 */
export function FeatureGate({
  minRole,
  minPlan,
  fallback,
  showUpgrade,
  featureName,
  children,
}: FeatureGateProps) {
  const { hasRole, hasPlan } = usePermissions()

  // Role check takes priority — denied silently (no upgrade path)
  if (minRole && !hasRole(minRole)) {
    return fallback ? <>{fallback}</> : null
  }

  // Plan check — show upgrade prompt by default when minPlan is provided
  if (minPlan && !hasPlan(minPlan)) {
    if (fallback) return <>{fallback}</>

    const shouldShowUpgrade = showUpgrade !== false
    if (shouldShowUpgrade) {
      return (
        <UpgradePrompt
          requiredPlan={minPlan}
          featureName={featureName}
        />
      )
    }
    return null
  }

  return <>{children}</>
}

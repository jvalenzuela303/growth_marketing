import { TenantPlan, UserRole } from '@growth-engine/shared-types';

/**
 * Feature permissions matrix for The Growth Engine.
 *
 * PLAN_FEATURES defines which feature scopes are available per billing plan.
 * ROLE_PERMISSIONS defines which operations a user role can perform.
 *
 * These are reference constants — access enforcement happens via RolesGuard
 * and PlanGuard on individual controller routes. Use hasPermission() for
 * programmatic checks inside services.
 */

export const PLAN_FEATURES: Record<TenantPlan, string[]> = {
  starter: [
    'leads:read',
    'leads:create',
    'funnels:read',
    'funnels:create',
    'analytics:basic',
  ],
  growth: [
    'leads:read',
    'leads:create',
    'leads:export',
    'funnels:read',
    'funnels:create',
    'analytics:basic',
    'analytics:advanced',
    'sequences:read',
    'sequences:create',
    'deals:read',
    'deals:create',
  ],
  scale: [
    'leads:*',
    'funnels:*',
    'analytics:*',
    'sequences:*',
    'deals:*',
    'whatsapp:*',
    'ai:scoring',
    'ai:classify',
    'automation:*',
  ],
  agency: ['*'],
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  owner: ['*'],
  admin: [
    'users:manage',
    'billing:read',
    'leads:*',
    'funnels:*',
    'analytics:*',
    'sequences:*',
    'deals:*',
    'automation:*',
  ],
  member: [
    'leads:read',
    'leads:create',
    'leads:update',
    'funnels:read',
    'funnels:create',
    'deals:read',
    'deals:create',
    'sequences:read',
    'analytics:basic',
  ],
  viewer: [
    'leads:read',
    'funnels:read',
    'deals:read',
    'analytics:basic',
  ],
};

/**
 * Checks whether a given set of granted permissions satisfies a required permission.
 * Supports wildcard matching: 'leads:*' satisfies 'leads:read'.
 * A top-level '*' satisfies everything.
 */
function matchesPermission(granted: string, required: string): boolean {
  if (granted === '*') return true;
  if (granted === required) return true;
  // Namespace wildcard: 'leads:*' matches 'leads:read'
  const [grantedNs, grantedAction] = granted.split(':');
  const [requiredNs] = required.split(':');
  return grantedAction === '*' && grantedNs === requiredNs;
}

/**
 * Returns true if the role has the required permission according to ROLE_PERMISSIONS.
 *
 * Example:
 *   hasRolePermission('admin', 'leads:read')  // true
 *   hasRolePermission('viewer', 'leads:update') // false
 */
export function hasRolePermission(role: UserRole, permission: string): boolean {
  const granted = ROLE_PERMISSIONS[role] ?? [];
  return granted.some((g) => matchesPermission(g, permission));
}

/**
 * Returns true if the plan has access to the given feature permission.
 *
 * Example:
 *   hasPlanFeature('growth', 'leads:export')  // true
 *   hasPlanFeature('starter', 'leads:export') // false
 */
export function hasPlanFeature(plan: TenantPlan, permission: string): boolean {
  const granted = PLAN_FEATURES[plan] ?? [];
  return granted.some((g) => matchesPermission(g, permission));
}

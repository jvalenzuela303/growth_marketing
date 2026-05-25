import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantPlan } from '@growth-engine/shared-types';

export const PLAN_KEY = 'requiredPlan';

/**
 * Restricts a route to tenants on the specified plan or any higher-tier plan.
 * Plan hierarchy (ascending): starter < growth < scale < agency.
 *
 * Usage:
 *   @RequiresPlan('growth')   — allows growth, scale, and agency
 *   @RequiresPlan('scale')    — allows scale and agency only
 */
export const RequiresPlan = (...plans: TenantPlan[]) => SetMetadata(PLAN_KEY, plans);

const PLAN_ORDER: TenantPlan[] = ['starter', 'growth', 'scale', 'agency'];

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredPlans = this.reflector.getAllAndOverride<TenantPlan[]>(PLAN_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No @RequiresPlan() decorator — all plans allowed.
    if (!requiredPlans || requiredPlans.length === 0) return true;

    const userPlan: TenantPlan = ctx.switchToHttp().getRequest().userPlan;

    if (!userPlan) {
      throw new ForbiddenException('Plan del tenant no encontrado en la sesión.');
    }

    const userPlanIndex = PLAN_ORDER.indexOf(userPlan);

    // The user passes if their plan is at or above the minimum required plan.
    const minRequiredIndex = Math.min(
      ...requiredPlans.map((p) => PLAN_ORDER.indexOf(p)),
    );

    if (userPlanIndex < minRequiredIndex) {
      throw new ForbiddenException(
        `Esta funcionalidad requiere el plan "${requiredPlans.join('" o "')}" o superior. Tu plan actual es: ${userPlan}.`,
      );
    }

    return true;
  }
}

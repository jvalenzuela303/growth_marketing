import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole, TenantPlan } from '@growth-engine/shared-types';

/**
 * Extrae el tenantId inyectado por TenantMiddleware.
 *
 * Uso en controller:
 *   @Get()
 *   findAll(@TenantId() tenantId: string) { ... }
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);

export interface CurrentUserPayload {
  id: string;
  role: UserRole;
  plan: TenantPlan;
  tenantId: string;
}

/**
 * Extrae el usuario completo del request (populate por TenantMiddleware).
 *
 * Uso:
 *   @Get()
 *   findAll(@CurrentUser() user: CurrentUserPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return {
      id: request.userId,
      role: request.userRole,
      plan: request.userPlan,
      tenantId: request.tenantId,
    };
  },
);

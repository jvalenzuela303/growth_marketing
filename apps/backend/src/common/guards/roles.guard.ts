import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@growth-engine/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Role hierarchy: owner can do everything admin can, admin everything member can, etc.
 * If @Roles('admin') is applied, both 'owner' and 'admin' are granted access.
 *
 * Must be used after JwtAuthGuard so that TenantMiddleware has already attached
 * req.userRole to the request.
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  owner:  ['owner', 'admin', 'member', 'viewer'],
  admin:  ['admin', 'member', 'viewer'],
  member: ['member', 'viewer'],
  viewer: ['viewer'],
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    // No @Roles() decorator — route is open to any authenticated user.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const userRole: UserRole = ctx.switchToHttp().getRequest().userRole;

    if (!userRole) {
      throw new ForbiddenException('Rol de usuario no encontrado en la sesión.');
    }

    // The user's "allowed roles" are those equal to or below their role in the hierarchy.
    // A route requires one of requiredRoles; the user passes if their role can satisfy any of them.
    const userCanAccess = requiredRoles.some((required) =>
      ROLE_HIERARCHY[userRole]?.includes(required),
    );

    if (!userCanAccess) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere rol: ${requiredRoles.join(' o ')}. Tu rol actual es: ${userRole}.`,
      );
    }

    return true;
  }
}

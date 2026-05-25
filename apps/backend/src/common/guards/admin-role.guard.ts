import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Permite el acceso solo a usuarios con rol 'owner' o 'admin'.
 * Debe usarse después de JwtAuthGuard (requiere que TenantMiddleware ya haya
 * parseado el JWT y adjuntado req.userRole).
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const role: string = ctx.switchToHttp().getRequest().userRole ?? '';
    if (role === 'owner' || role === 'admin') return true;
    throw new ForbiddenException('Se requiere rol de administrador o propietario.');
  }
}

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';

/**
 * CRÍTICO: Extrae tenantId del JWT y lo adjunta a req para todos los controllers.
 *
 * Sin este middleware, los datos de diferentes tenants se mezclan porque
 * la app no sabe a qué tenant pertenece la request. El tenantId se usa en
 * PrismaService.withTenant() para configurar la RLS session variable.
 *
 * Decisión de diseño: el middleware NO lanza excepción si el token es inválido
 * porque existen rutas públicas (quiz, webhooks). El guard JwtAuthGuard se
 * encarga de rechazar requests sin tenantId en rutas protegidas.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (token) {
      try {
        const payload = this.jwtService.verify(token);
        req['tenantId'] = payload.tenantId;
        req['userId'] = payload.sub;
        req['userRole'] = payload.role;
        req['userPlan'] = payload.plan;
      } catch {
        // Token inválido o expirado — continúa sin tenantId.
        // JwtAuthGuard bloqueará la request si la ruta requiere autenticación.
      }
    }

    next();
  }
}

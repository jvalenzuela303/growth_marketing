import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '@growth-engine/shared-types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Verifica que el usuario siga activo en DB en cada request autenticado
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, tenantId: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario inactivo o no encontrado.');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role,
      plan: payload.plan,
    };
  }
}

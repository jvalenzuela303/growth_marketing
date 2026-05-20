import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthTokens, JwtPayload } from '@growth-engine/shared-types';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Registra un nuevo tenant con su usuario owner.
   * Operación atómica: si falla la creación del usuario se hace rollback del tenant.
   */
  async register(dto: RegisterDto): Promise<AuthTokens & { userId: string; tenantId: string }> {
    // Verificar unicidad de slug y email antes de iniciar transacción
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException(`El slug "${dto.tenantSlug}" ya está en uso.`);
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: dto.tenantSlug,
          name: dto.tenantName,
          plan: 'starter',
          timezone: dto.timezone || 'America/Santiago',
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: 'owner',
        },
      });

      return { tenant, user };
    });

    this.logger.log(`Nuevo tenant registrado: ${tenant.slug} (${tenant.id})`);

    const tokens = await this.generateTokens(user.id, tenant.id, user.role, tenant.plan);
    return { ...tokens, userId: user.id, tenantId: tenant.id };
  }

  async login(dto: LoginDto): Promise<AuthTokens & { userId: string; tenantId: string; email: string; name: string | null; role: string; plan: string; tenantSlug: string; tenantName: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { tenant: { select: { id: true, slug: true, name: true, plan: true, isActive: true } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (!user.tenant.isActive) {
      throw new UnauthorizedException('La cuenta está suspendida. Contacta a soporte.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // Actualizar last_login_at sin bloquear la respuesta
    this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => this.logger.warn(`No se pudo actualizar lastLoginAt: ${err.message}`));

    const tokens = await this.generateTokens(user.id, user.tenantId, user.role, user.tenant.plan);
    return {
      ...tokens,
      userId:     user.id,
      tenantId:   user.tenantId,
      email:      user.email,
      name:       user.name,
      role:       user.role,
      plan:       user.tenant.plan,
      tenantSlug: user.tenant.slug,
      tenantName: user.tenant.name,
    };
  }

  /**
   * Refresh token rotation: invalida el token anterior y emite uno nuevo.
   * Si el token ya fue usado (replay attack), revoca todos los tokens del usuario.
   */
  async refresh(userId: string, rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { tenant: { select: { plan: true, isActive: true } } },
        },
      },
    });

    if (!storedToken || storedToken.userId !== userId) {
      // Posible replay attack — revoca todos los tokens del usuario
      await this.revokeAllUserTokens(userId);
      throw new UnauthorizedException('Refresh token inválido. Inicia sesión nuevamente.');
    }

    if (storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      await this.revokeAllUserTokens(userId);
      throw new UnauthorizedException('Refresh token expirado o revocado. Inicia sesión nuevamente.');
    }

    // Invalida el token usado (rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.tenantId,
      storedToken.user.role,
      storedToken.user.tenant.plan,
    );
  }

  async logout(userId: string, rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.revokeAllUserTokens(userId);
    }
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  private async generateTokens(
    userId: string,
    tenantId: string,
    role: string,
    plan: string,
  ): Promise<AuthTokens> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: userId,
      tenantId,
      role: role as any,
      plan: plan as any,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
      secret: this.config.get<string>('JWT_SECRET'),
    });

    // Refresh token: string aleatorio seguro (no JWT, guardado hasheado en DB)
    const rawRefreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 900, // 15 minutos en segundos
    };
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

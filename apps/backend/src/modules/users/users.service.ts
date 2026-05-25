import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { MailNotifierService } from '../../common/mail/mail-notifier.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { UserRole } from '@growth-engine/shared-types';

const BCRYPT_ROUNDS = 12;
const LOGIN_URL = 'http://localhost:4000/login';

/** Campos expuestos en todas las respuestas — excluye passwordHash */
const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailNotifierService,
  ) {}

  /**
   * Retorna todos los usuarios del tenant, ordenados por createdAt desc.
   * Excluye passwordHash.
   */
  async listUsers(tenantId: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.user.findMany({
        where: { tenantId },
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /**
   * Crea un nuevo usuario para el tenant con una contraseña temporal y
   * envía un email de invitación con sus credenciales.
   */
  async inviteUser(tenantId: string, invitedById: string, dto: InviteUserDto) {
    // Verificar unicidad de email (global — un email no puede existir en dos tenants)
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        `El email "${dto.email}" ya está registrado en el sistema.`,
      );
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const user = await this.prisma.withTenant(tenantId, () =>
      this.prisma.user.create({
        data: {
          tenantId,
          email: dto.email,
          name: dto.name,
          passwordHash,
          role: dto.role,
          isActive: true,
        },
        select: USER_SELECT,
      }),
    );

    this.logger.log(
      `Usuario invitado: ${user.email} (rol: ${user.role}) por userId=${invitedById} en tenantId=${tenantId}`,
    );

    // Envío de credenciales — fire-and-forget para no bloquear la respuesta
    this.mail
      .send({
        to: dto.email,
        subject: '[Growth Engine] Invitación al equipo',
        html: this.buildInviteHtml(dto.name, dto.email, tempPassword),
      })
      .catch((err) =>
        this.logger.warn(`No se pudo enviar email de invitación a ${dto.email}: ${err.message}`),
      );

    return user;
  }

  /**
   * Actualiza nombre, rol o estado activo de un usuario del tenant.
   *
   * Restricciones:
   * - No se puede modificar al owner.
   * - Un admin no puede modificar a otro admin (solo el owner puede).
   * - No se puede auto-modificar el propio rol.
   */
  async updateUser(
    tenantId: string,
    requesterId: string,
    requesterRole: UserRole,
    userId: string,
    dto: UpdateUserDto,
  ) {
    const target = await this.prisma.withTenant(tenantId, () =>
      this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: USER_SELECT,
      }),
    );

    if (!target) {
      throw new NotFoundException(`Usuario ${userId} no encontrado.`);
    }

    // No se puede modificar al owner
    if (target.role === 'owner') {
      throw new ForbiddenException('No se puede modificar al usuario owner del tenant.');
    }

    // Auto-modificación de rol no permitida
    if (requesterId === userId && dto.role !== undefined) {
      throw new ForbiddenException('No puedes modificar tu propio rol.');
    }

    // Un admin solo puede modificar member/viewer; solo el owner puede modificar admins
    if (requesterRole === 'admin' && target.role === 'admin') {
      throw new ForbiddenException(
        'Solo el owner puede modificar usuarios con rol admin.',
      );
    }

    const updated = await this.prisma.withTenant(tenantId, () =>
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.role !== undefined && { role: dto.role }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        select: USER_SELECT,
      }),
    );

    this.logger.log(
      `Usuario actualizado: ${updated.email} por userId=${requesterId} (${requesterRole})`,
    );

    return updated;
  }

  /**
   * Soft-delete: desactiva al usuario (isActive = false) sin borrarlo de la BD.
   *
   * Restricciones:
   * - No se puede eliminar al owner.
   * - No se puede auto-eliminar.
   * - Solo el owner puede eliminar a admins.
   */
  async removeUser(
    tenantId: string,
    requesterId: string,
    requesterRole: UserRole,
    userId: string,
  ) {
    const target = await this.prisma.withTenant(tenantId, () =>
      this.prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: USER_SELECT,
      }),
    );

    if (!target) {
      throw new NotFoundException(`Usuario ${userId} no encontrado.`);
    }

    if (target.role === 'owner') {
      throw new ForbiddenException('No se puede eliminar al usuario owner del tenant.');
    }

    if (requesterId === userId) {
      throw new ForbiddenException('No puedes eliminarte a ti mismo.');
    }

    if (requesterRole === 'admin' && target.role === 'admin') {
      throw new ForbiddenException(
        'Solo el owner puede eliminar usuarios con rol admin.',
      );
    }

    const deactivated = await this.prisma.withTenant(tenantId, () =>
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: USER_SELECT,
      }),
    );

    this.logger.log(
      `Usuario desactivado (soft-delete): ${deactivated.email} por userId=${requesterId} (${requesterRole})`,
    );

    return deactivated;
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  /** Genera una contraseña temporal de 12 caracteres alfanuméricos. */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 12 }, () =>
      chars[crypto.randomInt(0, chars.length)],
    ).join('');
  }

  private buildInviteHtml(name: string, email: string, tempPassword: string): string {
    return `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Hola ${name}, fuiste invitado/a a Growth Engine</h2>
        <p>Tu cuenta ha sido creada. Usa las siguientes credenciales para ingresar:</p>
        <table cellpadding="8" style="border-collapse: collapse;">
          <tr>
            <td><strong>Email</strong></td>
            <td>${email}</td>
          </tr>
          <tr>
            <td><strong>Contraseña temporal</strong></td>
            <td style="font-family: monospace; letter-spacing: 2px;">${tempPassword}</td>
          </tr>
        </table>
        <p style="margin-top: 24px;">
          <a href="${LOGIN_URL}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
            Iniciar sesión
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:24px;">
          Te recomendamos cambiar tu contraseña después del primer inicio de sesión.
        </p>
      </div>
    `;
  }
}

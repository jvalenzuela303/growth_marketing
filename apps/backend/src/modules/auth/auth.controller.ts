import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RequestAccessDto } from './dto/request-access.dto';
import { SupportRequestDto } from './dto/support-request.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';
import { MailNotifierService } from '../../common/mail/mail-notifier.service';

const NOTIFY_EMAIL = 'soporte@growthengine.io';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly mail: MailNotifierService,
  ) {}

  /**
   * POST /api/v1/auth/register
   * Crea tenant + usuario owner en una transacción atómica.
   * Rate limit estricto: 5 intentos / 60s por IP (previene spam de cuentas).
   */
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return {
      message: 'Cuenta creada exitosamente.',
      userId: result.userId,
      tenantId: result.tenantId,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * POST /api/v1/auth/login
   * Rate limit estricto: 10 intentos / 60s (previene fuerza bruta).
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return {
      accessToken:  result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn:    result.expiresIn,
      userId:       result.userId,
      tenantId:     result.tenantId,
      email:        result.email,
      name:         result.name,
      role:         result.role,
      plan:         result.plan,
      tenantSlug:   result.tenantSlug,
      tenantName:   result.tenantName,
    };
  }

  /**
   * POST /api/v1/auth/refresh
   * Emite nuevos tokens y revoca el refresh token anterior (rotation).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.authService.refresh(dto.userId, dto.refreshToken);
    return tokens;
  }

  /**
   * POST /api/v1/auth/request-access
   * Ruta pública — registra una solicitud de acceso desde la página de login.
   * Rate limit: 3 intentos / 60s por IP.
   */
  @Post('request-access')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async requestAccess(@Body() dto: RequestAccessDto) {
    this.logger.log(
      `Solicitud de acceso: ${dto.name} | ${dto.company} | ${dto.email} | plan: ${dto.plan ?? 'no especificado'}`,
    );

    // Notificación interna via Gmail (fire-and-forget)
    this.mail.send({
      to:       NOTIFY_EMAIL,
      replyTo:  dto.email,
      subject:  `[Acceso] ${dto.name} — ${dto.company}`,
      html: `
        <h2>Nueva solicitud de acceso</h2>
        <table cellpadding="6">
          <tr><td><b>Nombre</b></td><td>${dto.name}</td></tr>
          <tr><td><b>Empresa</b></td><td>${dto.company}</td></tr>
          <tr><td><b>Email</b></td><td>${dto.email}</td></tr>
          <tr><td><b>Teléfono</b></td><td>${dto.phone ?? '—'}</td></tr>
          <tr><td><b>Plan</b></td><td>${dto.plan ?? 'no especificado'}</td></tr>
        </table>
      `,
    }).catch(() => { /* silencioso — el log queda en el logger */ });

    return {
      message: 'Solicitud recibida. Nuestro equipo se pondrá en contacto contigo pronto.',
      received: true,
    };
  }

  /**
   * POST /api/v1/auth/support
   * Ruta pública — recibe solicitudes de soporte desde la página de login.
   * Rate limit: 3 intentos / 60s por IP.
   */
  @Post('support')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async support(@Body() dto: SupportRequestDto) {
    this.logger.log(`Solicitud soporte: ${dto.email} | ${dto.issue}`);

    await this.mail.send({
      to:      NOTIFY_EMAIL,
      replyTo: dto.email,
      subject: `[Soporte] ${dto.issue}`,
      html: `
        <h2>Solicitud de soporte</h2>
        <table cellpadding="6">
          <tr><td><b>Email</b></td><td>${dto.email}</td></tr>
          <tr><td><b>Problema</b></td><td>${dto.issue}</td></tr>
          <tr><td><b>Descripción</b></td><td>${dto.message ?? '—'}</td></tr>
        </table>
      `,
    });

    return {
      message: 'Tu solicitud fue recibida. Te contactaremos a la brevedad.',
      received: true,
    };
  }

  /**
   * POST /api/v1/auth/logout
   * Revoca el refresh token del usuario autenticado.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { refreshToken?: string },
  ) {
    await this.authService.logout(user.id, body.refreshToken);
    return { message: 'Sesión cerrada.' };
  }
}

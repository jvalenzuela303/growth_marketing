import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { InstagramService } from './instagram.service';

/**
 * InstagramController — tres grupos de rutas:
 *
 *  /api/v1/instagram/oauth/init       → Inicio del flujo OAuth (requiere JWT)
 *  /api/v1/instagram/oauth/callback   → Callback de Meta (sin JWT — es redirigido por Instagram)
 *  /api/v1/instagram/oauth/status     → Estado de conexión (requiere JWT)
 *  /api/v1/instagram/oauth/disconnect → Desconectar cuenta (requiere JWT)
 *  /api/v1/instagram/webhook          → Verificación + recepción de DMs (sin JWT — Meta)
 *  /api/v1/instagram/dm               → Enviar DM manual (requiere JWT)
 */
@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(
    private readonly instagramService: InstagramService,
    private readonly config: ConfigService,
  ) {}

  // ─── OAuth Init ───────────────────────────────────────────────────────────

  /**
   * GET /api/v1/instagram/oauth/init
   * Redirige al usuario a la pantalla de autorización de Instagram.
   */
  @Get('oauth/init')
  @UseGuards(JwtAuthGuard)
  initOAuth(@TenantId() tenantId: string, @Res() res: Response) {
    const url = this.instagramService.buildOAuthUrl(tenantId);
    return res.redirect(302, url);
  }

  /**
   * GET /api/v1/instagram/oauth/status
   * Devuelve el estado de la conexión Instagram del tenant.
   */
  @Get('oauth/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@TenantId() tenantId: string) {
    return this.instagramService.getStatus(tenantId);
  }

  /**
   * DELETE /api/v1/instagram/oauth/disconnect
   * Desconecta la cuenta de Instagram del tenant.
   */
  @Delete('oauth/disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(@TenantId() tenantId: string) {
    await this.instagramService.disconnect(tenantId);
    return { success: true };
  }

  // ─── OAuth Callback ───────────────────────────────────────────────────────

  /**
   * GET /api/v1/instagram/oauth/callback
   * Meta redirige aquí tras la autorización del usuario.
   * Intercambia el `code` por token y redirige al frontend.
   */
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code')  code: string,
    @Query('state') state: string,       // tenantId codificado en el state
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    const settingsUrl = `${frontendUrl}/settings?tab=integraciones`;

    if (error) {
      this.logger.warn(`Instagram OAuth rechazado: ${error}`);
      return res.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${settingsUrl}&ig_error=missing_params`);
    }

    try {
      await this.instagramService.handleOAuthCallback(code, state);
      return res.redirect(`${settingsUrl}&ig_success=1`);
    } catch (err: any) {
      this.logger.error(`Error en callback OAuth: ${err.message}`);
      return res.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(err.message)}`);
    }
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/instagram/webhook
   * Verificación del webhook de Meta (handshake inicial).
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode')         mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge')    challenge: string,
  ): number {
    const expected = this.config.get<string>('META_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && verifyToken === expected) {
      this.logger.log('Webhook Instagram verificado correctamente.');
      return parseInt(challenge, 10);
    }

    throw new BadRequestException('Token de verificación de webhook inválido.');
  }

  /**
   * POST /api/v1/instagram/webhook
   * Recibe mensajes entrantes de Instagram DM.
   * Valida firma HMAC-SHA256 antes de procesar.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(@Body() payload: any, @Req() req: Request) {
    const appSecret   = this.config.get<string>('META_APP_SECRET');
    const signature   = req.headers['x-hub-signature-256'] as string | undefined;

    if (appSecret && signature) {
      const rawBody = JSON.stringify(payload);
      const expected = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expected) {
        this.logger.warn('Firma HMAC inválida en webhook Instagram.');
        throw new BadRequestException('Firma HMAC inválida.');
      }
    }

    await this.instagramService.processWebhook(payload).catch((err) =>
      this.logger.error(`Error procesando webhook Instagram: ${err.message}`),
    );

    return { status: 'ok' };
  }

  // ─── Envío manual de DMs ──────────────────────────────────────────────────

  /**
   * POST /api/v1/instagram/dm
   * Envía un DM de texto a un usuario de Instagram.
   * Body: { igUserId: string; text: string }
   */
  @Post('dm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendDM(
    @TenantId() tenantId: string,
    @Body() body: { igUserId: string; text: string },
  ) {
    if (!body.igUserId || !body.text) {
      throw new BadRequestException('igUserId y text son requeridos.');
    }

    return this.instagramService.sendDM(tenantId, body.igUserId, body.text);
  }
}

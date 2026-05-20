import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
  Res,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsService } from './google-ads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

/**
 * GoogleAdsController — tres grupos de rutas:
 *
 *  OAuth (requieren JWT del operador):
 *    GET  /api/v1/google-ads/oauth/init?customerId=917-047-0641
 *    GET  /api/v1/google-ads/oauth/callback          ← redirigido por Google (sin JWT)
 *    DELETE /api/v1/google-ads/oauth/:accountId/disconnect
 *
 *  Campaigns:
 *    GET  /api/v1/google-ads/campaigns?customerId=917-047-0641
 */
@Controller('google-ads')
export class GoogleAdsController {
  private readonly logger = new Logger(GoogleAdsController.name);

  constructor(
    private readonly googleAdsService: GoogleAdsService,
    private readonly config: ConfigService,
  ) {}

  // ─── OAuth Init ───────────────────────────────────────────────────────────

  /**
   * GET /api/v1/google-ads/oauth/init?customerId=917-047-0641
   *
   * Inicia el flujo OAuth de Google.
   * El customerId se transporta en el `state` para recuperarlo en el callback.
   *
   * Parámetros de query:
   *   customerId  — ID del cliente de Google Ads (con o sin guiones)
   */
  @Get('oauth/init')
  @UseGuards(JwtAuthGuard)
  initOAuth(
    @TenantId() tenantId: string,
    @Query('customerId') customerId: string,
    @Res() res: Response,
  ) {
    if (!customerId) {
      throw new BadRequestException('El parámetro customerId es requerido.');
    }

    // El state combina tenantId y customerId, separados por ":"
    // Google devuelve el state intacto en el callback
    const state = `${tenantId}:${customerId}`;
    const url   = this.googleAdsService.buildOAuthUrl(state);

    this.logger.log(`Iniciando OAuth Google Ads: tenant=${tenantId}, customer=${customerId}`);
    return res.redirect(302, url);
  }

  // ─── OAuth Callback ───────────────────────────────────────────────────────

  /**
   * GET /api/v1/google-ads/oauth/callback
   *
   * Google redirige aquí tras la autorización del usuario.
   * NO requiere JwtAuthGuard — Google es quien redirige, no el frontend.
   *
   * Query params que envía Google:
   *   code  — authorization code de un solo uso
   *   state — el mismo string que enviamos en el init
   *   error — presente si el usuario rechazó el acceso
   */
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code')  code:  string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const frontendUrl  = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    const redirectBase = `${frontendUrl}/ads?tab=google`;

    if (error) {
      this.logger.warn(`Google Ads OAuth rechazado: ${error}`);
      return res.redirect(`${redirectBase}&g_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`${redirectBase}&g_error=missing_params`);
    }

    // Decodificar state: "tenantId:customerId"
    const [tenantId, ...rest] = state.split(':');
    const customerId = rest.join(':'); // por si el ID tuviera ":"

    if (!tenantId || !customerId) {
      return res.redirect(`${redirectBase}&g_error=invalid_state`);
    }

    try {
      await this.googleAdsService.handleOAuthCallback(code, tenantId, customerId);
      this.logger.log(`Google Ads OAuth exitoso: tenant=${tenantId}, customer=${customerId}`);
      return res.redirect(`${redirectBase}&g_success=1&customer=${encodeURIComponent(customerId)}`);
    } catch (err: any) {
      this.logger.error(`Error en callback Google Ads: ${err.message}`);
      return res.redirect(`${redirectBase}&g_error=${encodeURIComponent(err.message)}`);
    }
  }

  // ─── Disconnect ───────────────────────────────────────────────────────────

  /**
   * DELETE /api/v1/google-ads/oauth/:accountId/disconnect
   *
   * Borra tokens de la cuenta de Google Ads y la marca como 'disconnected'.
   */
  @Delete('oauth/:accountId/disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(
    @TenantId() tenantId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    await this.googleAdsService.disconnect(tenantId, accountId);
    return { success: true, message: 'Cuenta de Google Ads desconectada.' };
  }

  // ─── Campaigns ────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/google-ads/campaigns?customerId=917-047-0641
   *
   * Devuelve las campañas de la cuenta de Google Ads indicada.
   * Usa el mismo shape de respuesta que el endpoint de Meta Ads para
   * que el frontend pueda renderizarlas en el mismo CampaignTable.
   *
   * Query params:
   *   customerId  — (requerido) ID del cliente (con o sin guiones)
   *   accountId   — (opcional) UUID del registro en ads_accounts;
   *                 si no se provee, se busca por customerId
   */
  /**
   * GET /api/v1/google-ads/campaigns?customerId=917-047-0641&days=30
   *
   * Query params:
   *   customerId  — (requerido) ID del cliente (con o sin guiones)
   *   days        — (opcional, default 30) rango de días para métricas
   *   accountId   — (opcional) UUID en ads_accounts; si no, busca por customerId
   */
  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  async getCampaigns(
    @TenantId() tenantId: string,
    @Query('customerId') customerId: string,
    @Query('days')       daysStr?: string,
    @Query('accountId')  accountId?: string,
  ) {
    if (!customerId) {
      throw new BadRequestException('El parámetro customerId es requerido (ej. 917-047-0641).');
    }

    const days = daysStr ? Math.min(Math.max(parseInt(daysStr, 10) || 30, 1), 365) : 30;
    return this.googleAdsService.getCampaigns(tenantId, customerId, accountId, days);
  }
}

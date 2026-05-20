import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  Res,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { TikTokAdsService } from './tiktok-ads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('tiktok-ads')
export class TikTokAdsController {
  private readonly logger = new Logger(TikTokAdsController.name);

  constructor(
    private readonly tiktokAdsService: TikTokAdsService,
    private readonly config: ConfigService,
  ) {}

  // ── OAuth Init ─────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/tiktok-ads/oauth/init?advertiserId=7123456789
   * Redirige al portal de autorización de TikTok Business.
   */
  @Get('oauth/init')
  @UseGuards(JwtAuthGuard)
  initOAuth(
    @TenantId() tenantId: string,
    @Query('advertiserId') advertiserId: string,
    @Res() res: Response,
  ) {
    if (!advertiserId) {
      throw new BadRequestException('El parámetro advertiserId es requerido.');
    }

    const state = `${tenantId}:${advertiserId}`;
    const url   = this.tiktokAdsService.buildOAuthUrl(state);

    this.logger.log(`Iniciando OAuth TikTok Ads: tenant=${tenantId}, advertiser=${advertiserId}`);
    return res.redirect(302, url);
  }

  // ── OAuth Callback ─────────────────────────────────────────────────────────

  /**
   * GET /api/v1/tiktok-ads/oauth/callback
   * TikTok redirige aquí con auth_code. No requiere JwtAuthGuard.
   */
  @Get('oauth/callback')
  async oauthCallback(
    @Query('auth_code') authCode:  string,
    @Query('state')     state:     string,
    @Query('error')     error:     string,
    @Res() res: Response,
  ) {
    const frontendUrl  = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    const redirectBase = `${frontendUrl}/ads?tab=tiktok`;

    if (error) {
      this.logger.warn(`TikTok Ads OAuth rechazado: ${error}`);
      return res.redirect(`${redirectBase}&tt_error=${encodeURIComponent(error)}`);
    }

    if (!authCode || !state) {
      return res.redirect(`${redirectBase}&tt_error=missing_params`);
    }

    const [tenantId, ...rest] = state.split(':');
    const advertiserId = rest.join(':');

    if (!tenantId || !advertiserId) {
      return res.redirect(`${redirectBase}&tt_error=invalid_state`);
    }

    try {
      await this.tiktokAdsService.handleOAuthCallback(authCode, tenantId, advertiserId);
      this.logger.log(`TikTok Ads OAuth exitoso: tenant=${tenantId}, advertiser=${advertiserId}`);
      return res.redirect(`${redirectBase}&tt_success=1&advertiser=${encodeURIComponent(advertiserId)}`);
    } catch (err: any) {
      this.logger.error(`Error en callback TikTok Ads: ${err.message}`);
      return res.redirect(`${redirectBase}&tt_error=${encodeURIComponent(err.message)}`);
    }
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────

  /**
   * DELETE /api/v1/tiktok-ads/oauth/:accountId/disconnect
   */
  @Delete('oauth/:accountId/disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnect(
    @TenantId() tenantId: string,
    @Param('accountId', ParseUUIDPipe) accountId: string,
  ) {
    await this.tiktokAdsService.disconnect(tenantId, accountId);
    return { success: true, message: 'Cuenta TikTok Ads desconectada.' };
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/tiktok-ads/campaigns?advertiserId=7123456789
   */
  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  async getCampaigns(
    @TenantId() tenantId: string,
    @Query('advertiserId') advertiserId: string,
    @Query('accountId')    accountId?: string,
  ) {
    if (!advertiserId) {
      throw new BadRequestException('El parámetro advertiserId es requerido.');
    }
    return this.tiktokAdsService.getCampaigns(tenantId, advertiserId, accountId);
  }
}

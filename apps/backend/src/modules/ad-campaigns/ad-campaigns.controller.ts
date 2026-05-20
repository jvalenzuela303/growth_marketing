import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdCampaignsService } from './ad-campaigns.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('ad-campaigns')
@UseGuards(JwtAuthGuard)
export class AdCampaignsController {
  constructor(private readonly adCampaignsService: AdCampaignsService) {}

  /**
   * GET /api/v1/ad-campaigns
   * Lista campañas con la última métrica disponible.
   */
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.adCampaignsService.findAll(tenantId, accountId);
  }

  /**
   * POST /api/v1/ad-campaigns/sync
   * Dispara sincronización contra Meta Ads API (fire-and-forget en prod).
   * Retorna 202 Accepted con el resultado de la operación.
   */
  @Post('sync')
  @HttpCode(HttpStatus.ACCEPTED)
  syncCampaigns(@TenantId() tenantId: string) {
    return this.adCampaignsService.syncCampaigns(tenantId);
  }

  /**
   * GET /api/v1/ad-campaigns/:id/metrics?range=30d
   */
  @Get(':id/metrics')
  getMetrics(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('range') range: string = '30d',
  ) {
    return this.adCampaignsService.getMetrics(tenantId, id, range);
  }
}

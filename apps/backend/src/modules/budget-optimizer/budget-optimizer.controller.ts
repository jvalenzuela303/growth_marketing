import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { BudgetOptimizerService } from './budget-optimizer.service';

/**
 * GET /api/v1/budget-optimizer/recommendations?days=30
 *
 * Returns AI-driven budget redistribution recommendations based on
 * actual ROAS per campaign in the requested period.
 */
@Controller('budget-optimizer')
@UseGuards(JwtAuthGuard)
export class BudgetOptimizerController {
  constructor(private readonly service: BudgetOptimizerService) {}

  @Get('recommendations')
  getRecommendations(
    @TenantId() tenantId: string,
    @Query('days') daysStr?: string,
  ) {
    const days = daysStr ? Math.min(Math.max(parseInt(daysStr, 10) || 30, 7), 90) : 30;
    return this.service.getRecommendations(tenantId, days);
  }
}

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminRoleGuard } from '../../common/guards/admin-role.guard';
import { AdminBillingService } from './admin-billing.service';

class SubscriptionsQueryDto {
  @IsOptional() @IsString()                          plan?:     string;
  @IsOptional() @IsString()                          status?:   string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?:     number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

class InvoicesQueryDto {
  @IsOptional() @IsUUID()                            tenantId?: string;
  @IsOptional() @IsString()                          status?:   string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?:     number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize?: number;
}

class UpdatePlanDto {
  @IsIn(['starter', 'growth', 'scale', 'agency'])
  plan: string;
}

class UpdateStatusDto {
  @IsIn(['active', 'trialing', 'past_due', 'canceled', 'suspended'])
  status: string;
}

@Controller('admin/billing')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminBillingController {
  constructor(private readonly svc: AdminBillingService) {}

  /** GET /api/v1/admin/billing/plans — plan config + Stripe price status + tenant counts */
  @Get('plans')
  getPlans() {
    return this.svc.getPlans();
  }

  /** GET /api/v1/admin/billing/stats — MRR, revenue totals, plan distribution */
  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  /** GET /api/v1/admin/billing/subscriptions?plan=&status=&page=&pageSize= */
  @Get('subscriptions')
  getSubscriptions(@Query() q: SubscriptionsQueryDto) {
    return this.svc.getSubscriptions(q.page ?? 1, q.pageSize ?? 20, q.plan, q.status);
  }

  /** PATCH /api/v1/admin/billing/subscriptions/:tenantId/plan */
  @Patch('subscriptions/:tenantId/plan')
  updatePlan(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.svc.updateTenantPlan(tenantId, dto.plan);
  }

  /** PATCH /api/v1/admin/billing/subscriptions/:tenantId/status */
  @Patch('subscriptions/:tenantId/status')
  updateStatus(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.svc.updateSubscriptionStatus(tenantId, dto.status);
  }

  /** GET /api/v1/admin/billing/invoices?tenantId=&status=&page=&pageSize= */
  @Get('invoices')
  getInvoices(@Query() q: InvoicesQueryDto) {
    return this.svc.getInvoices(q.page ?? 1, q.pageSize ?? 20, q.tenantId, q.status);
  }
}

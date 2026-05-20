import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

class CreateCheckoutDto {
  plan: 'growth' | 'scale' | 'agency';
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * POST /api/v1/billing/checkout
   * Creates a Stripe Checkout session and returns the redirect URL.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @TenantId() tenantId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billingService.createCheckoutSession(tenantId, dto.plan);
  }

  /**
   * POST /api/v1/billing/portal
   * Creates a Stripe Customer Portal session for managing subscription.
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  createPortal(@TenantId() tenantId: string) {
    return this.billingService.createPortalSession(tenantId);
  }

  /**
   * GET /api/v1/billing/subscription
   * Returns current plan, status, and enforced limits.
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  getSubscription(@TenantId() tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  /**
   * GET /api/v1/billing/invoices
   * Returns last 24 invoices for the tenant.
   */
  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  getInvoices(@TenantId() tenantId: string) {
    return this.billingService.getInvoices(tenantId);
  }

  /**
   * POST /api/v1/billing/webhook
   * Stripe webhook endpoint — no auth guard, needs raw body for signature verification.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    const rawBody = req.rawBody ?? Buffer.from('');
    return this.billingService.handleWebhook(rawBody, sig);
  }
}

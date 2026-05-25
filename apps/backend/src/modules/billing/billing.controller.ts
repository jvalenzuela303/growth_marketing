import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Headers,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

class CreateCheckoutDto {
  @IsIn(['growth', 'scale', 'agency'])
  plan: 'growth' | 'scale' | 'agency';
}

class StartEnrollmentDto {
  @IsString() returnUrl: string;
}

class ConfirmEnrollmentDto {
  @IsString() sessionToken: string;
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
   * GET /api/v1/billing/payment-methods
   * Lists saved Stripe cards for the tenant's customer.
   */
  @Get('payment-methods')
  @UseGuards(JwtAuthGuard)
  getPaymentMethods(@TenantId() tenantId: string) {
    return this.billingService.getPaymentMethods(tenantId);
  }

  /**
   * POST /api/v1/billing/payment-methods/enroll
   * Inicia inscripción Transbank Oneclick — retorna { redirectUrl, sessionToken }.
   */
  @Post('payment-methods/enroll')
  @UseGuards(JwtAuthGuard)
  startEnrollment(
    @TenantId() tenantId: string,
    @Body() dto: StartEnrollmentDto,
  ) {
    return this.billingService.startEnrollment(tenantId, dto.returnUrl);
  }

  /**
   * POST /api/v1/billing/payment-methods/enroll/confirm
   * Confirma la inscripción con el token_ws devuelto por Transbank.
   */
  @Post('payment-methods/enroll/confirm')
  @UseGuards(JwtAuthGuard)
  confirmEnrollment(
    @TenantId() tenantId: string,
    @Body() dto: ConfirmEnrollmentDto,
  ) {
    return this.billingService.confirmEnrollment(tenantId, dto.sessionToken);
  }

  /**
   * DELETE /api/v1/billing/payment-methods/:cardId
   * Elimina tarjeta — desvincula en Transbank y limpia la DB.
   */
  @Delete('payment-methods/:cardId')
  @UseGuards(JwtAuthGuard)
  detachPaymentMethod(
    @TenantId() tenantId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.billingService.detachPaymentMethod(tenantId, cardId);
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

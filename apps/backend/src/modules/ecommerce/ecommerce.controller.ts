import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { EcommerceService } from './ecommerce.service';
import { PrismaService } from '../../database/prisma.service';

/**
 * EcommerceController
 *
 * Public (no JWT):
 *   POST /api/v1/ecommerce/webhook/shopify/:tenantSlug
 *   POST /api/v1/ecommerce/webhook/woocommerce/:tenantSlug
 *
 * Authenticated:
 *   GET  /api/v1/ecommerce/carts
 *   GET  /api/v1/ecommerce/carts/stats
 */
@Controller('ecommerce')
export class EcommerceController {
  private readonly logger = new Logger(EcommerceController.name);

  constructor(
    private readonly ecommerce: EcommerceService,
    private readonly prisma:    PrismaService,
  ) {}

  // ── Shopify webhook (public) ────────────────────────────────────────────────

  @Post('webhook/shopify/:slug')
  async shopifyWebhook(
    @Param('slug') slug: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-shopify-topic')    topic:    string,
    @Headers('x-shopify-hmac-sha256') hmac:  string,
    @Body() payload: any,
  ) {
    const tenant = await (this.prisma as any).tenant.findUnique({
      where:  { slug },
      select: { id: true, shopifyWebhookSecret: true },
    });
    if (!tenant) return { ok: false, reason: 'tenant_not_found' };

    const secret = (tenant as any).shopifyWebhookSecret;
    if (!secret) {
      this.logger.warn(`Shopify webhook rechazado — tenant ${slug} no tiene shopifyWebhookSecret configurado`);
      throw new ForbiddenException('Webhook signature validation not configured.');
    }
    if (!req.rawBody) {
      throw new ForbiddenException('Raw body required for signature validation.');
    }
    const valid = this.ecommerce.verifyShopifySignature(req.rawBody, hmac, secret);
    if (!valid) {
      this.logger.warn(`Shopify HMAC inválido — tenant ${slug}`);
      throw new ForbiddenException('Invalid webhook signature.');
    }

    await this.ecommerce.handleShopifyWebhook(tenant.id, topic, payload);
    return { ok: true };
  }

  // ── WooCommerce webhook (public) ─────────────────────────────────────────────

  @Post('webhook/woocommerce/:slug')
  async wooCommerceWebhook(
    @Param('slug') slug: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-wc-webhook-topic')     topic:  string,
    @Headers('x-wc-webhook-signature') sig:    string,
    @Body() payload: any,
  ) {
    const tenant = await (this.prisma as any).tenant.findUnique({
      where:  { slug },
      select: { id: true, woocommerceSecret: true },
    });
    if (!tenant) return { ok: false, reason: 'tenant_not_found' };

    const secret = (tenant as any).woocommerceSecret;
    if (!secret) {
      this.logger.warn(`WooCommerce webhook rechazado — tenant ${slug} no tiene woocommerceSecret configurado`);
      throw new ForbiddenException('Webhook signature validation not configured.');
    }
    if (!req.rawBody) {
      throw new ForbiddenException('Raw body required for signature validation.');
    }
    const valid = this.ecommerce.verifyWooCommerceSignature(req.rawBody, sig, secret);
    if (!valid) {
      this.logger.warn(`WooCommerce signature inválida — tenant ${slug}`);
      throw new ForbiddenException('Invalid webhook signature.');
    }

    await this.ecommerce.handleWooCommerceWebhook(tenant.id, topic, payload);
    return { ok: true };
  }

  // ── Carts dashboard (authenticated) ─────────────────────────────────────────

  @Get('carts')
  @UseGuards(JwtAuthGuard)
  findCarts(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ecommerce.findCarts(tenantId, {
      status,
      page:  page  ? Number(page)  : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('carts/stats')
  @UseGuards(JwtAuthGuard)
  getStats(@TenantId() tenantId: string) {
    return this.ecommerce.getStats(tenantId);
  }
}

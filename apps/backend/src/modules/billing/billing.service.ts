import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe = require('stripe');
import { PrismaService } from '../../database/prisma.service';
import { TransbankService } from './transbank.service';

/**
 * Plan → Stripe Price ID mapping and feature limits.
 * All limits are enforced at service-layer before DB writes.
 */
export const PLAN_LIMITS: Record<string, { maxFunnels: number; maxLeadsPerMonth: number; maxWhatsappMessages: number }> = {
  starter: { maxFunnels: 1,   maxLeadsPerMonth: 500,   maxWhatsappMessages: 500   },
  growth:  { maxFunnels: 5,   maxLeadsPerMonth: 2000,  maxWhatsappMessages: 2000  },
  scale:   { maxFunnels: 20,  maxLeadsPerMonth: 10000, maxWhatsappMessages: 10000 },
  agency:  { maxFunnels: 100, maxLeadsPerMonth: 50000, maxWhatsappMessages: 50000 },
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly stripe: any;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly transbank: TransbankService,
  ) {
    this.stripe = new Stripe(
      this.config.get<string>('STRIPE_SECRET_KEY', 'sk_test_placeholder'),
      { apiVersion: '2026-04-22.dahlia' },
    );
  }

  // ── Plan price lookup ──────────────────────────────────────────────────────

  private priceId(plan: 'growth' | 'scale' | 'agency'): string {
    const key = `STRIPE_PRICE_${plan.toUpperCase()}` as const;
    const id  = this.config.get<string>(key, '');
    if (!id || id.startsWith('price_CHANGE')) {
      throw new BadRequestException(`Stripe price ID para plan "${plan}" no configurado. Agrega ${key} en .env.`);
    }
    return id;
  }

  // ── Plan change (local — no Stripe) ──────────────────────────────────────

  /**
   * Cambia el plan del tenant directamente en la DB.
   * En producción con Stripe esto sería un Checkout Session;
   * por ahora el cambio es inmediato ya que Transbank gestiona el cobro por separado.
   */
  async createCheckoutSession(tenantId: string, plan: 'growth' | 'scale' | 'agency') {
    await this.upsertSubscriptionAndUpdatePlan(tenantId, plan, { status: 'active' });
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    return { url: `${frontendUrl}/billing?success=1` };
  }

  // ── Customer portal (no-op) ───────────────────────────────────────────────

  async createPortalSession(tenantId: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    return { url: `${frontendUrl}/billing` };
  }

  // ── Subscription status ────────────────────────────────────────────────────

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.withTenant(tenantId, () =>
      this.prisma.subscription.findUnique({ where: { tenantId } }),
    );

    const tenant = await this.prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { plan: true, maxFunnels: true, maxLeadsPerMonth: true },
    });

    return {
      plan:    tenant?.plan ?? 'starter',
      status:  sub?.status ?? 'free',
      limits:  PLAN_LIMITS[tenant?.plan ?? 'starter'],
      sub,
    };
  }

  // ── Invoice history ────────────────────────────────────────────────────────

  async getInvoices(tenantId: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.invoice.findMany({
        where:   { tenantId },
        orderBy: { createdAt: 'desc' },
        take:    24,
      }),
    );
  }

  // ── Payment methods — Transbank Oneclick ─────────────────────────────────

  /** Returns the stored card for the tenant (one card max). */
  async getPaymentMethods(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub?.paymentMethodMock) return [];

    const pm = sub.paymentMethodMock as {
      last4: string; brand: string; cardType: string;
      tbkUser: string; username: string;
    };

    return [{
      id:       'local-card',
      last4:    pm.last4,
      brand:    pm.brand   ?? 'Visa',
      cardType: pm.cardType ?? 'CREDIT',
      isDefault: true,
    }];
  }

  /**
   * Inicia la inscripción Transbank Oneclick.
   * Retorna { redirectUrl, sessionToken } — el frontend redirige al usuario.
   */
  async startEnrollment(tenantId: string, returnUrl: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    // Usamos el tenantId como username único en Transbank
    const username = `tenant-${tenantId}`;
    const email    = (tenant as any).email ?? `${username}@growthengine.app`;

    return this.transbank.startEnrollment(username, email, returnUrl);
  }

  /**
   * Confirma la inscripción usando el token_ws devuelto por Transbank.
   * Guarda el tbkUser y datos de tarjeta en la DB.
   */
  async confirmEnrollment(tenantId: string, sessionToken: string) {
    const result = await this.transbank.confirmEnrollment(sessionToken);

    const username = `tenant-${tenantId}`;
    const cardData = {
      tbkUser:  result.tbkUser,
      username,
      last4:    result.last4,
      brand:    result.cardType === 'Redcompra' ? 'Redcompra' : 'Visa',
      cardType: result.cardType,
    };

    await this.prisma.subscription.upsert({
      where:  { tenantId },
      create: { tenantId, plan: 'starter', status: 'free', paymentMethodMock: cardData },
      update: { paymentMethodMock: cardData },
    });

    return {
      id:       'local-card',
      last4:    result.last4,
      brand:    cardData.brand,
      cardType: result.cardType,
      isDefault: true,
    };
  }

  /** Elimina la tarjeta inscrita — tanto en Transbank como en la DB. */
  async detachPaymentMethod(tenantId: string, _cardId: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (sub?.paymentMethodMock) {
      const pm = sub.paymentMethodMock as { tbkUser?: string; username?: string };
      if (pm.tbkUser && pm.username) {
        await this.transbank.removeCard(pm.tbkUser, pm.username);
      }
    }

    await this.prisma.subscription.updateMany({
      where: { tenantId },
      data:  { paymentMethodMock: undefined },
    });

    return { success: true };
  }

  // ── Stripe webhook handler ─────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    let event: ReturnType<typeof this.stripe.webhooks.constructEvent>;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature inválida: ${(err as Error).message}`);
      throw new BadRequestException('Webhook signature inválida.');
    }

    this.logger.log(`Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as any);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await this.onSubscriptionUpdated(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as any);
        break;
      case 'invoice.paid':
        await this.onInvoicePaid(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object as any);
        break;
      default:
        this.logger.debug(`Evento Stripe ignorado: ${event.type}`);
    }
  }

  // ── Webhook event handlers ─────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onCheckoutCompleted(session: any) {
    const tenantId = session.metadata?.tenantId;
    const plan     = (session.metadata?.plan ?? 'growth') as string;
    if (!tenantId) return;

    await this.upsertSubscriptionAndUpdatePlan(tenantId, plan, {
      stripeCustomerId: session.customer as string,
      stripeSubId:      session.subscription as string,
      status:           'active',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onSubscriptionUpdated(sub: any) {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    const plan = sub.metadata?.plan ?? 'growth';

    await this.upsertSubscriptionAndUpdatePlan(tenantId, plan, {
      stripeCustomerId:    sub.customer as string,
      stripeSubId:         sub.id,
      stripePriceId:       sub.items.data[0]?.price?.id,
      status:              sub.status,
      currentPeriodStart:  new Date((sub as any).current_period_start * 1000),
      currentPeriodEnd:    new Date((sub as any).current_period_end   * 1000),
      cancelAtPeriodEnd:   sub.cancel_at_period_end,
      trialEnd:            (sub as any).trial_end ? new Date((sub as any).trial_end * 1000) : null,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onSubscriptionDeleted(sub: any) {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubId: sub.id },
      data:  { status: 'canceled' },
    });

    // Downgrade to starter
    const limits = PLAN_LIMITS['starter'];
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data:  { plan: 'starter', ...limits },
    });

    this.logger.log(`Suscripción cancelada para tenant ${tenantId} → plan starter`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onInvoicePaid(invoice: any) {
    const tenantId = await this.findTenantByCustomer(invoice.customer as string);
    if (!tenantId) return;

    await this.upsertInvoice(tenantId, invoice, 'paid');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onInvoicePaymentFailed(invoice: any) {
    const tenantId = await this.findTenantByCustomer(invoice.customer as string);
    if (!tenantId) return;

    await this.upsertInvoice(tenantId, invoice, 'open');

    // Update subscription status
    await this.prisma.subscription.updateMany({
      where: { stripeCustomerId: invoice.customer as string },
      data:  { status: 'past_due' },
    });

    this.logger.warn(`Pago fallido para customer ${invoice.customer}`);
  }

  // ── Stripe call wrapper ───────────────────────────────────────────────────

  /**
   * Wraps any Stripe call. Converts Stripe errors to NestJS exceptions so they
   * don't leak Stripe's 401/402 status codes (which confuse auth middleware).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async stripe_call<T = any>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const type: string = err?.type ?? '';
      if (type === 'StripeAuthenticationError') {
        throw new ServiceUnavailableException(
          'Stripe no está configurado. Agrega STRIPE_SECRET_KEY válida en .env.',
        );
      }
      if (type === 'StripeInvalidRequestError') {
        throw new BadRequestException(err.message ?? 'Solicitud inválida a Stripe.');
      }
      if (err?.statusCode) {
        // Other Stripe HTTP errors — don't leak the status code
        throw new BadRequestException(err.message ?? 'Error en Stripe.');
      }
      throw err;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async upsertSubscriptionAndUpdatePlan(
    tenantId: string,
    plan: string,
    data: Partial<{
      stripeCustomerId: string; stripeSubId: string; stripePriceId: string; status: string;
      currentPeriodStart: Date; currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean; trialEnd: Date | null;
    }>,
  ) {
    await this.prisma.subscription.upsert({
      where:  { tenantId },
      create: { tenantId, plan, ...data },
      update: { plan, ...data },
    });

    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['starter'];
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data:  { plan, ...limits },
    });

    this.logger.log(`Tenant ${tenantId} actualizado a plan "${plan}" (${data.status})`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async upsertInvoice(tenantId: string, invoice: any, status: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });

    await this.prisma.invoice.upsert({
      where:  { stripeInvoiceId: invoice.id },
      create: {
        tenantId,
        subscriptionId:  sub?.id,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: invoice.customer as string,
        amountDue:       (invoice.amount_due  ?? 0) / 100,
        amountPaid:      (invoice.amount_paid ?? 0) / 100,
        currency:        invoice.currency,
        status,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
        invoicePdfUrl:    invoice.invoice_pdf,
        periodStart:      invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd:        invoice.period_end   ? new Date(invoice.period_end   * 1000) : null,
      },
      update: { status, amountPaid: (invoice.amount_paid ?? 0) / 100 },
    });
  }

  private async findTenantByCustomer(customerId: string): Promise<string | null> {
    const sub = await this.prisma.subscription.findFirst({
      where:  { stripeCustomerId: customerId },
      select: { tenantId: true },
    });
    return sub?.tenantId ?? null;
  }
}

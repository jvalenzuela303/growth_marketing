import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe = require('stripe');
import { PrismaService } from '../../database/prisma.service';

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

  // ── Checkout session ───────────────────────────────────────────────────────

  async createCheckoutSession(tenantId: string, plan: 'growth' | 'scale' | 'agency') {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');

    // Get or create Stripe customer
    let customerId = tenant.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        name:     tenant.name,
        metadata: { tenantId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer:            customerId,
      mode:                'subscription',
      line_items: [{ price: this.priceId(plan), quantity: 1 }],
      success_url: `${frontendUrl}/billing?success=1`,
      cancel_url:  `${frontendUrl}/billing?canceled=1`,
      metadata:    { tenantId, plan },
      subscription_data: {
        metadata: { tenantId, plan },
      },
    });

    return { url: session.url };
  }

  // ── Customer portal ────────────────────────────────────────────────────────

  async createPortalSession(tenantId: string) {
    const sub = await this.prisma.withTenant(tenantId, () =>
      this.prisma.subscription.findUnique({ where: { tenantId } }),
    );
    if (!sub?.stripeCustomerId) {
      throw new BadRequestException('No se encontró suscripción Stripe para este tenant.');
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4000');
    const session = await this.stripe.billingPortal.sessions.create({
      customer:   sub.stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });

    return { url: session.url };
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

    await this.upsertSubscriptionAndUpdatePlan(tenantId, session.customer as string, plan, {
      stripeSubId: session.subscription as string,
      status:      'active',
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async onSubscriptionUpdated(sub: any) {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    const plan = sub.metadata?.plan ?? 'growth';

    await this.upsertSubscriptionAndUpdatePlan(tenantId, sub.customer as string, plan, {
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

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async upsertSubscriptionAndUpdatePlan(
    tenantId: string,
    stripeCustomerId: string,
    plan: string,
    data: Partial<{
      stripeSubId: string; stripePriceId: string; status: string;
      currentPeriodStart: Date; currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean; trialEnd: Date | null;
    }>,
  ) {
    await this.prisma.subscription.upsert({
      where:  { tenantId },
      create: { tenantId, stripeCustomerId, plan, ...data },
      update: { stripeCustomerId, plan, ...data },
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

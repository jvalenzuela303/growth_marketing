"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BillingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingService = exports.PLAN_LIMITS = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Stripe = require("stripe");
const prisma_service_1 = require("../../database/prisma.service");
exports.PLAN_LIMITS = {
    starter: { maxFunnels: 1, maxLeadsPerMonth: 500, maxWhatsappMessages: 500 },
    growth: { maxFunnels: 5, maxLeadsPerMonth: 2000, maxWhatsappMessages: 2000 },
    scale: { maxFunnels: 20, maxLeadsPerMonth: 10000, maxWhatsappMessages: 10000 },
    agency: { maxFunnels: 100, maxLeadsPerMonth: 50000, maxWhatsappMessages: 50000 },
};
let BillingService = BillingService_1 = class BillingService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(BillingService_1.name);
        this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY', 'sk_test_placeholder'), { apiVersion: '2026-04-22.dahlia' });
    }
    priceId(plan) {
        const key = `STRIPE_PRICE_${plan.toUpperCase()}`;
        const id = this.config.get(key, '');
        if (!id || id.startsWith('price_CHANGE')) {
            throw new common_1.BadRequestException(`Stripe price ID para plan "${plan}" no configurado. Agrega ${key} en .env.`);
        }
        return id;
    }
    async createCheckoutSession(tenantId, plan) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { subscription: true },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado.');
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        let customerId = tenant.subscription?.stripeCustomerId;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                name: tenant.name,
                metadata: { tenantId },
            });
            customerId = customer.id;
        }
        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: this.priceId(plan), quantity: 1 }],
            success_url: `${frontendUrl}/billing?success=1`,
            cancel_url: `${frontendUrl}/billing?canceled=1`,
            metadata: { tenantId, plan },
            subscription_data: {
                metadata: { tenantId, plan },
            },
        });
        return { url: session.url };
    }
    async createPortalSession(tenantId) {
        const sub = await this.prisma.withTenant(tenantId, () => this.prisma.subscription.findUnique({ where: { tenantId } }));
        if (!sub?.stripeCustomerId) {
            throw new common_1.BadRequestException('No se encontró suscripción Stripe para este tenant.');
        }
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        const session = await this.stripe.billingPortal.sessions.create({
            customer: sub.stripeCustomerId,
            return_url: `${frontendUrl}/billing`,
        });
        return { url: session.url };
    }
    async getSubscription(tenantId) {
        const sub = await this.prisma.withTenant(tenantId, () => this.prisma.subscription.findUnique({ where: { tenantId } }));
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { plan: true, maxFunnels: true, maxLeadsPerMonth: true },
        });
        return {
            plan: tenant?.plan ?? 'starter',
            status: sub?.status ?? 'free',
            limits: exports.PLAN_LIMITS[tenant?.plan ?? 'starter'],
            sub,
        };
    }
    async getInvoices(tenantId) {
        return this.prisma.withTenant(tenantId, () => this.prisma.invoice.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            take: 24,
        }));
    }
    async handleWebhook(rawBody, signature) {
        const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET', '');
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        }
        catch (err) {
            this.logger.warn(`Webhook signature inválida: ${err.message}`);
            throw new common_1.BadRequestException('Webhook signature inválida.');
        }
        this.logger.log(`Stripe webhook: ${event.type}`);
        switch (event.type) {
            case 'checkout.session.completed':
                await this.onCheckoutCompleted(event.data.object);
                break;
            case 'customer.subscription.updated':
            case 'customer.subscription.created':
                await this.onSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.onSubscriptionDeleted(event.data.object);
                break;
            case 'invoice.paid':
                await this.onInvoicePaid(event.data.object);
                break;
            case 'invoice.payment_failed':
                await this.onInvoicePaymentFailed(event.data.object);
                break;
            default:
                this.logger.debug(`Evento Stripe ignorado: ${event.type}`);
        }
    }
    async onCheckoutCompleted(session) {
        const tenantId = session.metadata?.tenantId;
        const plan = (session.metadata?.plan ?? 'growth');
        if (!tenantId)
            return;
        await this.upsertSubscriptionAndUpdatePlan(tenantId, session.customer, plan, {
            stripeSubId: session.subscription,
            status: 'active',
        });
    }
    async onSubscriptionUpdated(sub) {
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId)
            return;
        const plan = sub.metadata?.plan ?? 'growth';
        await this.upsertSubscriptionAndUpdatePlan(tenantId, sub.customer, plan, {
            stripeSubId: sub.id,
            stripePriceId: sub.items.data[0]?.price?.id,
            status: sub.status,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        });
    }
    async onSubscriptionDeleted(sub) {
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId)
            return;
        await this.prisma.subscription.updateMany({
            where: { stripeSubId: sub.id },
            data: { status: 'canceled' },
        });
        const limits = exports.PLAN_LIMITS['starter'];
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { plan: 'starter', ...limits },
        });
        this.logger.log(`Suscripción cancelada para tenant ${tenantId} → plan starter`);
    }
    async onInvoicePaid(invoice) {
        const tenantId = await this.findTenantByCustomer(invoice.customer);
        if (!tenantId)
            return;
        await this.upsertInvoice(tenantId, invoice, 'paid');
    }
    async onInvoicePaymentFailed(invoice) {
        const tenantId = await this.findTenantByCustomer(invoice.customer);
        if (!tenantId)
            return;
        await this.upsertInvoice(tenantId, invoice, 'open');
        await this.prisma.subscription.updateMany({
            where: { stripeCustomerId: invoice.customer },
            data: { status: 'past_due' },
        });
        this.logger.warn(`Pago fallido para customer ${invoice.customer}`);
    }
    async upsertSubscriptionAndUpdatePlan(tenantId, stripeCustomerId, plan, data) {
        await this.prisma.subscription.upsert({
            where: { tenantId },
            create: { tenantId, stripeCustomerId, plan, ...data },
            update: { stripeCustomerId, plan, ...data },
        });
        const limits = exports.PLAN_LIMITS[plan] ?? exports.PLAN_LIMITS['starter'];
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { plan, ...limits },
        });
        this.logger.log(`Tenant ${tenantId} actualizado a plan "${plan}" (${data.status})`);
    }
    async upsertInvoice(tenantId, invoice, status) {
        const sub = await this.prisma.subscription.findUnique({ where: { tenantId } });
        await this.prisma.invoice.upsert({
            where: { stripeInvoiceId: invoice.id },
            create: {
                tenantId,
                subscriptionId: sub?.id,
                stripeInvoiceId: invoice.id,
                stripeCustomerId: invoice.customer,
                amountDue: (invoice.amount_due ?? 0) / 100,
                amountPaid: (invoice.amount_paid ?? 0) / 100,
                currency: invoice.currency,
                status,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
                invoicePdfUrl: invoice.invoice_pdf,
                periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
                periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
            },
            update: { status, amountPaid: (invoice.amount_paid ?? 0) / 100 },
        });
    }
    async findTenantByCustomer(customerId) {
        const sub = await this.prisma.subscription.findFirst({
            where: { stripeCustomerId: customerId },
            select: { tenantId: true },
        });
        return sub?.tenantId ?? null;
    }
};
exports.BillingService = BillingService;
exports.BillingService = BillingService = BillingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], BillingService);
//# sourceMappingURL=billing.service.js.map
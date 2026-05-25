import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { PLAN_LIMITS } from '../billing/billing.service';

const PLAN_META: Record<string, { label: string; price: string; monthlyUsd: number }> = {
  starter: { label: 'Starter', price: 'Gratis',   monthlyUsd: 0   },
  growth:  { label: 'Growth',  price: '$49/mes',  monthlyUsd: 49  },
  scale:   { label: 'Scale',   price: '$149/mes', monthlyUsd: 149 },
  agency:  { label: 'Agency',  price: '$399/mes', monthlyUsd: 399 },
};

@Injectable()
export class AdminBillingService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Plans ─────────────────────────────────────────────────────────────────

  async getPlans() {
    const counts = await this.prisma.tenant.groupBy({
      by: ['plan'],
      _count: { _all: true },
    });
    const countMap = Object.fromEntries(counts.map((c) => [c.plan, c._count._all]));

    return Object.entries(PLAN_LIMITS).map(([key, limits]) => {
      const meta    = PLAN_META[key] ?? { label: key, price: '?', monthlyUsd: 0 };
      const envKey  = key === 'starter' ? null : `STRIPE_PRICE_${key.toUpperCase()}`;
      const priceId = envKey ? (this.config.get<string>(envKey, '') || null) : null;
      const priceConfigured = priceId ? !priceId.startsWith('price_CHANGE') : false;

      return {
        key,
        label:           meta.label,
        price:           meta.price,
        monthlyUsd:      meta.monthlyUsd,
        priceId,
        priceConfigured,
        ...limits,
        tenantCount: countMap[key] ?? 0,
      };
    });
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  async getSubscriptions(
    page     = 1,
    pageSize = 20,
    plan?:   string,
    status?: string,
  ) {
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (plan)   where['plan'] = plan;
    if (status) {
      where['subscription'] =
        status === 'no_subscription' ? { is: null } : { status };
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: pageSize,
        where,
        include: {
          subscription: true,
          users: {
            where:  { role: 'owner', isActive: true },
            select: { email: true, name: true },
            take:   1,
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const data = tenants.map((t) => ({
      tenantId:          t.id,
      tenantName:        t.name,
      tenantSlug:        t.slug,
      ownerEmail:        t.users[0]?.email  ?? '—',
      ownerName:         t.users[0]?.name   ?? null,
      plan:              t.plan,
      subStatus:         t.subscription?.status          ?? null,
      stripeSubId:       t.subscription?.stripeSubId     ?? null,
      stripeCustomerId:  t.subscription?.stripeCustomerId ?? null,
      currentPeriodEnd:  t.subscription?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: t.subscription?.cancelAtPeriodEnd ?? false,
      tenantCreatedAt:   t.createdAt,
    }));

    return { data, total, page, pages: Math.ceil(total / pageSize) };
  }

  async updateTenantPlan(tenantId: string, plan: string) {
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS['starter'];

    const tenant = await this.prisma.tenant.update({
      where:  { id: tenantId },
      data:   { plan, ...limits },
      select: { id: true, name: true, plan: true, maxFunnels: true, maxLeadsPerMonth: true, maxWhatsappMessages: true },
    });

    // Keep subscription.plan in sync if it exists
    await this.prisma.subscription.updateMany({
      where: { tenantId },
      data:  { plan },
    });

    return tenant;
  }

  async updateSubscriptionStatus(tenantId: string, status: string) {
    return this.prisma.subscription.update({
      where:  { tenantId },
      data:   { status },
      select: { tenantId: true, status: true, plan: true },
    });
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(
    page     = 1,
    pageSize = 20,
    tenantId?: string,
    status?:   string,
  ) {
    const skip  = (page - 1) * pageSize;
    const where: Record<string, unknown> = {};
    if (tenantId) where['tenantId'] = tenantId;
    if (status)   where['status']   = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip,
        take: pageSize,
        where,
        include: { tenant: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const data = invoices.map((inv) => ({
      id:               inv.id,
      tenantId:         inv.tenantId,
      tenantName:       inv.tenant.name,
      stripeInvoiceId:  inv.stripeInvoiceId,
      amountDue:        Number(inv.amountDue),
      amountPaid:       Number(inv.amountPaid),
      currency:         inv.currency,
      status:           inv.status,
      periodStart:      inv.periodStart,
      periodEnd:        inv.periodEnd,
      hostedInvoiceUrl: inv.hostedInvoiceUrl,
      invoicePdfUrl:    inv.invoicePdfUrl,
      createdAt:        inv.createdAt,
    }));

    return { data, total, page, pages: Math.ceil(total / pageSize) };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats() {
    const [planGroups, invoiceAggs, failedCount] = await Promise.all([
      this.prisma.tenant.groupBy({ by: ['plan'], _count: { _all: true } }),
      this.prisma.invoice.aggregate({
        _sum: { amountDue: true, amountPaid: true },
      }),
      this.prisma.invoice.count({ where: { status: 'open' } }),
    ]);

    const planDist: Record<string, number> = { starter: 0, growth: 0, scale: 0, agency: 0 };
    let totalTenants = 0;
    for (const g of planGroups) {
      planDist[g.plan] = g._count._all;
      totalTenants    += g._count._all;
    }

    // MRR: active/trialing paid subscriptions
    const activePaidSubs = await this.prisma.subscription.findMany({
      where:  { plan: { in: ['growth', 'scale', 'agency'] }, status: { in: ['active', 'trialing'] } },
      select: { plan: true },
    });
    const mrrMap: Record<string, number> = { growth: 49, scale: 149, agency: 399 };
    const mrr        = activePaidSubs.reduce((s, sub) => s + (mrrMap[sub.plan] ?? 0), 0);
    const paidTenants = activePaidSubs.length;

    return {
      totalTenants,
      paidTenants,
      mrr,
      totalInvoiced:   Number(invoiceAggs._sum.amountDue  ?? 0),
      totalPaid:       Number(invoiceAggs._sum.amountPaid ?? 0),
      failedInvoices:  failedCount,
      planDistribution: planDist,
    };
  }
}

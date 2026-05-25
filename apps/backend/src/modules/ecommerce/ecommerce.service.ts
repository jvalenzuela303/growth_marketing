import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { InjectQueue } from '../../queue/inject-queue.decorator';
import { createHmac, timingSafeEqual } from 'crypto';

export interface CartItemInput {
  externalId?: string;
  name:        string;
  quantity:    number;
  unitPrice:   number;
  imageUrl?:   string;
  productUrl?: string;
}

export interface UpsertCartInput {
  tenantId:    string;
  externalId:  string;
  platform:    'shopify' | 'woocommerce' | 'manual';
  email?:      string;
  phone?:      string;
  totalAmount: number;
  currency?:   string;
  checkoutUrl?: string;
  items:       CartItemInput[];
}

@Injectable()
export class EcommerceService {
  private readonly logger = new Logger(EcommerceService.name);

  constructor(
    private readonly prisma:  PrismaService,
    @InjectQueue('messaging') private readonly messagingQueue: Queue,
  ) {}

  // ── Webhook handlers ────────────────────────────────────────────────────────

  verifyShopifySignature(rawBody: Buffer, hmacHeader: string, secret: string): boolean {
    const digest = createHmac('sha256', secret).update(rawBody).digest('base64');
    try {
      return timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
    } catch {
      return false;
    }
  }

  verifyWooCommerceSignature(rawBody: Buffer, sigHeader: string, secret: string): boolean {
    const digest = createHmac('sha256', secret).update(rawBody).digest('base64');
    try {
      return timingSafeEqual(Buffer.from(digest), Buffer.from(sigHeader));
    } catch {
      return false;
    }
  }

  /**
   * Process incoming Shopify checkout webhook.
   * Topics handled: checkouts/create, checkouts/update, orders/paid
   */
  async handleShopifyWebhook(tenantId: string, topic: string, payload: any): Promise<void> {
    if (topic === 'orders/paid' || topic === 'orders/create') {
      // Mark matching cart as ordered
      const email = payload?.email ?? payload?.customer?.email;
      if (email) {
        await this.prisma.withTenant(tenantId, () =>
          (this.prisma as any).cart.updateMany({
            where: { tenantId, email, status: 'open' },
            data:  { status: 'ordered', orderedAt: new Date() },
          }),
        ).catch(() => {});
      }
      return;
    }

    if (topic === 'checkouts/create' || topic === 'checkouts/update') {
      await this.upsertCart({
        tenantId,
        externalId:  String(payload.id ?? payload.token),
        platform:    'shopify',
        email:       payload.email ?? payload.customer?.email,
        phone:       payload.phone ?? payload.billing_address?.phone,
        totalAmount: Number(payload.total_price ?? 0),
        currency:    payload.currency ?? 'CLP',
        checkoutUrl: payload.abandoned_checkout_url,
        items: (payload.line_items ?? []).map((li: any) => ({
          name:       li.title,
          quantity:   li.quantity ?? 1,
          unitPrice:  Number(li.price ?? 0),
          imageUrl:   li.image_url,
          productUrl: li.url,
        })),
      });
    }
  }

  /**
   * Process incoming WooCommerce webhook.
   * Topics: woocommerce_checkout_order_created, woocommerce_add_to_cart
   */
  async handleWooCommerceWebhook(tenantId: string, topic: string, payload: any): Promise<void> {
    if (topic === 'order.created' || topic === 'order.updated') {
      const email = payload?.billing?.email;
      if (email && (payload.status === 'processing' || payload.status === 'completed')) {
        await this.prisma.withTenant(tenantId, () =>
          (this.prisma as any).cart.updateMany({
            where: { tenantId, email, status: 'open' },
            data:  { status: 'ordered', orderedAt: new Date() },
          }),
        ).catch(() => {});
      }
      return;
    }

    if (topic === 'cart.created' || topic === 'cart.updated') {
      await this.upsertCart({
        tenantId,
        externalId:  String(payload.cart_key ?? payload.id),
        platform:    'woocommerce',
        email:       payload.customer?.billing_email,
        phone:       payload.customer?.billing_phone,
        totalAmount: Number(payload.cart_total ?? 0),
        currency:    payload.currency ?? 'CLP',
        checkoutUrl: payload.checkout_url,
        items: (payload.items ?? []).map((item: any) => ({
          name:       item.name,
          quantity:   item.quantity?.value ?? 1,
          unitPrice:  Number(item.prices?.price ?? 0) / 100,
          imageUrl:   item.images?.[0]?.src,
        })),
      });
    }
  }

  // ── Core upsert logic ────────────────────────────────────────────────────────

  async upsertCart(input: UpsertCartInput): Promise<void> {
    const { tenantId, externalId, platform, email, phone,
            totalAmount, currency, checkoutUrl, items } = input;

    // Find or create lead by email
    let leadId: string | undefined;
    if (email) {
      const existing = await this.prisma.withTenant(tenantId, () =>
        this.prisma.lead.findFirst({
          where: { tenantId, email, deletedAt: null },
          select: { id: true },
        }),
      );

      if (existing) {
        leadId = existing.id;
      } else {
        // Create anonymous lead for this shopper
        const created = await this.prisma.withTenant(tenantId, () =>
          this.prisma.lead.create({
            data: {
              tenantId,
              email,
              phone:  phone ?? null,
              source: platform,
            },
            select: { id: true },
          }),
        );
        leadId = created.id;
      }
    }

    // Upsert cart
    const cart = await this.prisma.withTenant(tenantId, async () => {
      const existing = await (this.prisma as any).cart.findFirst({
        where: { tenantId, platform, externalId },
      });

      if (existing) {
        // Delete old items and replace
        await (this.prisma as any).cartItem.deleteMany({ where: { cartId: existing.id } });
        return (this.prisma as any).cart.update({
          where: { id: existing.id },
          data: {
            leadId:      leadId ?? existing.leadId,
            email:       email  ?? existing.email,
            phone:       phone  ?? existing.phone,
            totalAmount,
            currency:    currency ?? existing.currency,
            checkoutUrl: checkoutUrl ?? existing.checkoutUrl,
            status:      existing.status === 'ordered' ? 'ordered' : 'open',
            updatedAt:   new Date(),
          },
        });
      }

      return (this.prisma as any).cart.create({
        data: {
          tenantId, leadId, externalId, platform,
          email, phone, totalAmount,
          currency:   currency ?? 'CLP',
          checkoutUrl,
          status: 'open',
        },
      });
    });

    // Upsert cart items
    if (items.length > 0) {
      await this.prisma.withTenant(tenantId, () =>
        (this.prisma as any).cartItem.createMany({
          data: items.map((it) => ({
            cartId:    cart.id,
            tenantId,
            name:      it.name,
            quantity:  it.quantity,
            unitPrice: it.unitPrice,
            imageUrl:  it.imageUrl ?? null,
            productUrl: it.productUrl ?? null,
          })),
        }),
      );
    }

    this.logger.debug(`Cart upserted: ${cart.id} (${platform}, ${externalId})`);
  }

  // ── Abandoned cart scan (called by AbandonedCartScanner) ──────────────────

  async scanAbandonedCarts(): Promise<number> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, abandonedCartMinutes: true },
    });

    let totalEnqueued = 0;

    for (const tenant of tenants) {
      const minuteThreshold = (tenant as any).abandonedCartMinutes ?? 30;
      const cutoff = new Date(Date.now() - minuteThreshold * 60 * 1000);

      const carts: any[] = await this.prisma.withTenant(tenant.id, () =>
        (this.prisma as any).cart.findMany({
          where: {
            tenantId: tenant.id,
            status:   'open',
            recoveryAlertSentAt: null,
            updatedAt: { lte: cutoff },
          },
          include: {
            items: { take: 3, orderBy: { unitPrice: 'desc' } },
          },
          take: 100,
        }),
      ) as any[];

      for (const cart of carts) {
        if (!cart.email && !cart.phone) continue;

        const itemNames = (cart.items as any[])
          .map((i: any) => i.name)
          .join(', ')
          .substring(0, 200);

        await this.messagingQueue.add('cart-abandoned', {
          cartId:        cart.id,
          tenantId:      tenant.id,
          leadId:        cart.leadId ?? undefined,
          phone:         cart.phone  ?? undefined,
          email:         cart.email  ?? undefined,
          totalAmount:   Number(cart.totalAmount),
          currency:      cart.currency,
          checkoutUrl:   cart.checkoutUrl ?? undefined,
          itemNames,
          attemptNumber: 1,
        }, { priority: 3 });

        totalEnqueued++;
      }
    }

    this.logger.log(`Abandoned cart scan: ${totalEnqueued} carts enqueued`);
    return totalEnqueued;
  }

  // ── CRUD for dashboard ───────────────────────────────────────────────────────

  async findCarts(tenantId: string, params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    return this.prisma.withTenant(tenantId, async () => {
      const where: any = { tenantId, ...(status && { status }) };
      const [carts, total] = await Promise.all([
        (this.prisma as any).cart.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip, take: limit,
          include: { items: true, lead: { select: { firstName: true, lastName: true, email: true } } },
        }),
        (this.prisma as any).cart.count({ where }),
      ]);
      return { data: carts, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    });
  }

  async getStats(tenantId: string) {
    return this.prisma.withTenant(tenantId, async () => {
      const [total, open, recovered, ordered] = await Promise.all([
        (this.prisma as any).cart.count({ where: { tenantId } }),
        (this.prisma as any).cart.count({ where: { tenantId, status: 'open' } }),
        (this.prisma as any).cart.count({ where: { tenantId, status: 'recovered' } }),
        (this.prisma as any).cart.count({ where: { tenantId, status: 'ordered' } }),
      ]);
      const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;
      return { total, open, recovered, ordered, recoveryRate };
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MetaCapiService } from '../webhooks/meta-capi.service';
import { CreateDealDto } from './dto/create-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metaCapi: MetaCapiService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateDealDto) {
    const deal = await this.prisma.withTenant(tenantId, () =>
      this.prisma.deal.create({
        data: {
          tenantId,
          leadId:       dto.leadId,
          amount:       dto.amount,
          currency:     dto.currency    ?? 'CLP',
          funnelId:     dto.funnelId,
          adsAccountId: dto.adsAccountId,
          campaignName: dto.campaignName,
          source:       dto.source      ?? 'manual',
          stage:        dto.stage       ?? 'won',
          closedAt:     dto.closedAt    ? new Date(dto.closedAt) : new Date(),
          notes:        dto.notes,
          createdBy:    userId,
        },
        include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      }),
    );

    // Fire CAPI Purchase event when deal is created as won
    if (deal.stage === 'won') {
      this.metaCapi.sendPurchaseEvent({
        tenantId,
        email:     deal.lead?.email    ?? undefined,
        phone:     deal.lead?.phone    ?? undefined,
        amount:    Number(deal.amount),
        currency:  deal.currency,
        eventId:   `deal_${deal.id}`,
        sourceUrl: `crm://deals/${deal.id}`,
      }).catch(() => { /* CAPI errors are non-fatal */ });
    }

    return deal;
  }

  async findAll(
    tenantId: string,
    params: { stage?: string; leadId?: string; page?: number; limit?: number },
  ) {
    const { stage, leadId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    return this.prisma.withTenant(tenantId, async () => {
      const where: any = {
        tenantId,
        ...(stage  && { stage }),
        ...(leadId && { leadId }),
      };

      const [deals, total] = await Promise.all([
        this.prisma.deal.findMany({
          where,
          orderBy: { closedAt: 'desc' },
          skip,
          take: limit,
          include: {
            lead: { select: { firstName: true, lastName: true, email: true } },
          },
        }),
        this.prisma.deal.count({ where }),
      ]);

      const revenue = deals
        .filter((d) => d.stage === 'won')
        .reduce((s, d) => s + Number(d.amount), 0);

      return {
        data: deals,
        meta: { total, page, limit, pages: Math.ceil(total / limit), revenue },
      };
    });
  }

  async findOne(tenantId: string, id: string) {
    const deal = await this.prisma.withTenant(tenantId, () =>
      this.prisma.deal.findFirst({
        where: { id, tenantId },
        include: {
          lead: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    );
    if (!deal) throw new NotFoundException('Deal no encontrado.');
    return deal;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateDealDto>) {
    const existing = await this.findOne(tenantId, id);
    const updated  = await this.prisma.withTenant(tenantId, () =>
      this.prisma.deal.update({
        where: { id },
        data: {
          ...(dto.amount       !== undefined && { amount: dto.amount }),
          ...(dto.stage        !== undefined && { stage: dto.stage }),
          ...(dto.notes        !== undefined && { notes: dto.notes }),
          ...(dto.campaignName !== undefined && { campaignName: dto.campaignName }),
          ...(dto.closedAt     !== undefined && { closedAt: new Date(dto.closedAt) }),
        },
        include: { lead: { select: { email: true, phone: true } } },
      }),
    );

    // Fire CAPI Purchase event when deal transitions to won
    const wasWon = existing.stage === 'won';
    if (!wasWon && updated.stage === 'won') {
      this.metaCapi.sendPurchaseEvent({
        tenantId,
        email:     updated.lead?.email ?? undefined,
        phone:     (updated.lead as any)?.phone ?? undefined,
        amount:    Number(updated.amount),
        currency:  updated.currency,
        eventId:   `deal_${updated.id}_won`,
        sourceUrl: `crm://deals/${updated.id}`,
      }).catch(() => { /* CAPI errors are non-fatal */ });
    }

    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.deal.delete({ where: { id } }),
    );
  }

  /**
   * Aggregate revenue for ROAS calculation.
   * Returns total won revenue in the given period.
   */
  async aggregateRevenue(tenantId: string, since: Date) {
    return this.prisma.withTenant(tenantId, async () => {
      const agg = await this.prisma.deal.aggregate({
        where: {
          tenantId,
          stage: 'won',
          closedAt: { gte: since },
        },
        _sum: { amount: true },
        _count: { id: true },
      });
      return {
        totalRevenue: Number(agg._sum.amount ?? 0),
        dealCount:    agg._count.id,
      };
    });
  }

  // ── CSV export ────────────────────────────────────────────────────────────

  async exportCsv(tenantId: string, filters: { stage?: string; leadId?: string }) {
    const deals = await this.prisma.withTenant(tenantId, () =>
      this.prisma.deal.findMany({
        where: {
          tenantId,
          ...(filters.stage  && { stage: filters.stage }),
          ...(filters.leadId && { leadId: filters.leadId }),
        },
        orderBy: { closedAt: 'desc' },
        take: 10000,
        include: {
          lead: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
    );

    const rows = deals.map((d) => ({
      id:           d.id,
      leadName:     `${d.lead?.firstName ?? ''} ${d.lead?.lastName ?? ''}`.trim(),
      leadEmail:    d.lead?.email ?? '',
      amount:       Number(d.amount),
      currency:     d.currency,
      stage:        d.stage,
      source:       d.source ?? '',
      campaignName: d.campaignName ?? '',
      closedAt:     d.closedAt?.toISOString() ?? '',
      notes:        d.notes ?? '',
      createdAt:    d.createdAt.toISOString(),
    }));

    return this.toCsv(rows);
  }

  private toCsv(rows: Record<string, string | number>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines   = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => {
          const val = String(r[h] ?? '').replace(/"/g, '""');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val}"`
            : val;
        }).join(','),
      ),
    ];
    return lines.join('\r\n');
  }
}

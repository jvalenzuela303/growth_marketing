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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DealsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const prisma_service_1 = require("../../database/prisma.service");
const meta_capi_service_1 = require("../webhooks/meta-capi.service");
const inject_queue_decorator_1 = require("../../queue/inject-queue.decorator");
let DealsService = class DealsService {
    constructor(prisma, metaCapi, messagingQueue) {
        this.prisma = prisma;
        this.metaCapi = metaCapi;
        this.messagingQueue = messagingQueue;
    }
    async create(tenantId, userId, dto) {
        const deal = await this.prisma.withTenant(tenantId, () => this.prisma.deal.create({
            data: {
                tenantId,
                leadId: dto.leadId,
                amount: dto.amount,
                currency: dto.currency ?? 'CLP',
                funnelId: dto.funnelId,
                adsAccountId: dto.adsAccountId,
                campaignName: dto.campaignName,
                source: dto.source ?? 'manual',
                stage: dto.stage ?? 'won',
                closedAt: dto.closedAt ? new Date(dto.closedAt) : new Date(),
                notes: dto.notes,
                createdBy: userId,
            },
            include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true } } },
        }));
        if (deal.stage === 'won') {
            this.metaCapi.sendPurchaseEvent({
                tenantId,
                email: deal.lead?.email ?? undefined,
                phone: deal.lead?.phone ?? undefined,
                amount: Number(deal.amount),
                currency: deal.currency,
                eventId: `deal_${deal.id}`,
                sourceUrl: `crm://deals/${deal.id}`,
            }).catch(() => { });
            this.messagingQueue.add('onboarding-start', {
                leadId: dto.leadId,
                tenantId,
                dealId: deal.id,
                amount: Number(deal.amount),
                currency: deal.currency,
                phone: deal.lead?.phone ?? undefined,
                email: deal.lead?.email ?? undefined,
                firstName: deal.lead?.firstName ?? undefined,
            }, { priority: 3 }).catch(() => { });
        }
        return deal;
    }
    async findAll(tenantId, params) {
        const { stage, leadId, page = 1, limit = 20 } = params;
        const skip = (page - 1) * limit;
        return this.prisma.withTenant(tenantId, async () => {
            const where = {
                tenantId,
                ...(stage && { stage }),
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
    async findOne(tenantId, id) {
        const deal = await this.prisma.withTenant(tenantId, () => this.prisma.deal.findFirst({
            where: { id, tenantId },
            include: {
                lead: { select: { firstName: true, lastName: true, email: true } },
            },
        }));
        if (!deal)
            throw new common_1.NotFoundException('Deal no encontrado.');
        return deal;
    }
    async update(tenantId, id, dto) {
        const existing = await this.findOne(tenantId, id);
        const updated = await this.prisma.withTenant(tenantId, () => this.prisma.deal.update({
            where: { id },
            data: {
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.stage !== undefined && { stage: dto.stage }),
                ...(dto.notes !== undefined && { notes: dto.notes }),
                ...(dto.campaignName !== undefined && { campaignName: dto.campaignName }),
                ...(dto.closedAt !== undefined && { closedAt: new Date(dto.closedAt) }),
            },
            include: { lead: { select: { email: true, phone: true } } },
        }));
        const wasWon = existing.stage === 'won';
        if (!wasWon && updated.stage === 'won') {
            this.metaCapi.sendPurchaseEvent({
                tenantId,
                email: updated.lead?.email ?? undefined,
                phone: updated.lead?.phone ?? undefined,
                amount: Number(updated.amount),
                currency: updated.currency,
                eventId: `deal_${updated.id}_won`,
                sourceUrl: `crm://deals/${updated.id}`,
            }).catch(() => { });
            this.messagingQueue.add('onboarding-start', {
                leadId: existing.leadId,
                tenantId,
                dealId: updated.id,
                amount: Number(updated.amount),
                currency: updated.currency,
                phone: updated.lead?.phone ?? undefined,
                email: updated.lead?.email ?? undefined,
                firstName: updated.lead?.firstName ?? undefined,
            }, { priority: 3 }).catch(() => { });
        }
        return updated;
    }
    async remove(tenantId, id) {
        await this.findOne(tenantId, id);
        return this.prisma.withTenant(tenantId, () => this.prisma.deal.delete({ where: { id } }));
    }
    async aggregateRevenue(tenantId, since) {
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
                dealCount: agg._count.id,
            };
        });
    }
    async exportCsv(tenantId, filters) {
        const deals = await this.prisma.withTenant(tenantId, () => this.prisma.deal.findMany({
            where: {
                tenantId,
                ...(filters.stage && { stage: filters.stage }),
                ...(filters.leadId && { leadId: filters.leadId }),
            },
            orderBy: { closedAt: 'desc' },
            take: 10000,
            include: {
                lead: { select: { firstName: true, lastName: true, email: true } },
            },
        }));
        const rows = deals.map((d) => ({
            id: d.id,
            leadName: `${d.lead?.firstName ?? ''} ${d.lead?.lastName ?? ''}`.trim(),
            leadEmail: d.lead?.email ?? '',
            amount: Number(d.amount),
            currency: d.currency,
            stage: d.stage,
            source: d.source ?? '',
            campaignName: d.campaignName ?? '',
            closedAt: d.closedAt?.toISOString() ?? '',
            notes: d.notes ?? '',
            createdAt: d.createdAt.toISOString(),
        }));
        return this.toCsv(rows);
    }
    toCsv(rows) {
        if (rows.length === 0)
            return '';
        const headers = Object.keys(rows[0]);
        const lines = [
            headers.join(','),
            ...rows.map((r) => headers.map((h) => {
                const val = String(r[h] ?? '').replace(/"/g, '""');
                return val.includes(',') || val.includes('"') || val.includes('\n')
                    ? `"${val}"`
                    : val;
            }).join(',')),
        ];
        return lines.join('\r\n');
    }
};
exports.DealsService = DealsService;
exports.DealsService = DealsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, inject_queue_decorator_1.InjectQueue)('messaging')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        meta_capi_service_1.MetaCapiService,
        bullmq_1.Queue])
], DealsService);
//# sourceMappingURL=deals.service.js.map
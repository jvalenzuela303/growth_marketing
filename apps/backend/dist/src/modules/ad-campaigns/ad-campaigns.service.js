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
var AdCampaignsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdCampaignsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AdCampaignsService = AdCampaignsService_1 = class AdCampaignsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdCampaignsService_1.name);
    }
    async findAll(tenantId, adsAccountId) {
        const campaigns = await this.prisma.withTenant(tenantId, () => this.prisma.adCampaign.findMany({
            where: {
                tenantId,
                ...(adsAccountId ? { adsAccountId } : {}),
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                metrics: {
                    orderBy: { date: 'desc' },
                    take: 1,
                },
            },
        }));
        return campaigns.map(({ metrics, platform, ...rest }) => {
            const latest = metrics[0];
            return {
                ...rest,
                source: platform,
                impressions: latest?.impressions ?? 0,
                clicks: latest?.clicks ?? 0,
                spend: Number(latest?.spend ?? 0),
                leads: latest?.leads ?? 0,
            };
        });
    }
    async syncCampaigns(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant no encontrado.');
        }
        const adAccountId = tenant.adAccountId ?? 'mock_account';
        const mockCampaigns = [
            {
                externalId: `${adAccountId}_camp_001`,
                name: 'Diagnóstico - Conversiones',
                status: 'ACTIVE',
                objective: 'CONVERSIONS',
                budgetDaily: 5000,
                impressions: Math.floor(Math.random() * 50000) + 10000,
                clicks: Math.floor(Math.random() * 2000) + 500,
                spend: parseFloat((Math.random() * 3000 + 1000).toFixed(2)),
            },
            {
                externalId: `${adAccountId}_camp_002`,
                name: 'Diagnóstico - Leads',
                status: 'PAUSED',
                objective: 'LEAD_GENERATION',
                budgetDaily: 3000,
                impressions: Math.floor(Math.random() * 30000) + 5000,
                clicks: Math.floor(Math.random() * 1000) + 200,
                spend: parseFloat((Math.random() * 1500 + 500).toFixed(2)),
            },
        ];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        for (const mock of mockCampaigns) {
            const campaign = await this.prisma.withTenant(tenantId, () => this.prisma.adCampaign.upsert({
                where: {
                    tenantId_externalId: {
                        tenantId,
                        externalId: mock.externalId,
                    },
                },
                update: {
                    name: mock.name,
                    status: mock.status,
                    objective: mock.objective,
                    budgetDaily: mock.budgetDaily,
                    lastSyncedAt: new Date(),
                },
                create: {
                    tenantId,
                    externalId: mock.externalId,
                    name: mock.name,
                    status: mock.status,
                    objective: mock.objective,
                    budgetDaily: mock.budgetDaily,
                    platform: 'meta',
                    lastSyncedAt: new Date(),
                },
            }));
            const ctr = mock.clicks > 0 ? parseFloat((mock.clicks / mock.impressions).toFixed(4)) : 0;
            const cpm = mock.impressions > 0 ? parseFloat(((mock.spend / mock.impressions) * 1000).toFixed(4)) : 0;
            const cpc = mock.clicks > 0 ? parseFloat((mock.spend / mock.clicks).toFixed(4)) : 0;
            await this.prisma.withTenant(tenantId, () => this.prisma.adCampaignMetric.upsert({
                where: {
                    campaignId_date: {
                        campaignId: campaign.id,
                        date: today,
                    },
                },
                update: {
                    impressions: mock.impressions,
                    clicks: mock.clicks,
                    spend: mock.spend,
                    ctr,
                    cpm,
                    cpc,
                },
                create: {
                    campaignId: campaign.id,
                    tenantId,
                    date: today,
                    impressions: mock.impressions,
                    clicks: mock.clicks,
                    spend: mock.spend,
                    leads: Math.floor(mock.clicks * 0.05),
                    ctr,
                    cpm,
                    cpc,
                },
            }));
        }
        this.logger.log(`Sync completada para tenant ${tenantId}: 2 campañas actualizadas`);
        return { synced: 2, message: 'Sincronización completada.' };
    }
    async getMetrics(tenantId, campaignId, range) {
        const campaign = await this.prisma.withTenant(tenantId, () => this.prisma.adCampaign.findFirst({
            where: { id: campaignId, tenantId },
        }));
        if (!campaign) {
            throw new common_1.NotFoundException('Campaña no encontrada.');
        }
        const days = this.parseDays(range);
        const since = new Date();
        since.setDate(since.getDate() - days);
        since.setHours(0, 0, 0, 0);
        const metrics = await this.prisma.withTenant(tenantId, () => this.prisma.adCampaignMetric.findMany({
            where: {
                campaignId,
                tenantId,
                date: { gte: since },
            },
            orderBy: { date: 'asc' },
        }));
        return { campaign, metrics, range, days };
    }
    parseDays(range) {
        const match = range?.match(/^(\d+)d$/);
        if (match)
            return parseInt(match[1], 10);
        return 30;
    }
};
exports.AdCampaignsService = AdCampaignsService;
exports.AdCampaignsService = AdCampaignsService = AdCampaignsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdCampaignsService);
//# sourceMappingURL=ad-campaigns.service.js.map
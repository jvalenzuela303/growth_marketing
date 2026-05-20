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
var AdAccountsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdAccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
function maskToken(value) {
    if (!value)
        return null;
    if (value.length <= 4)
        return '***...';
    return '***...' + value.slice(-4);
}
let AdAccountsService = AdAccountsService_1 = class AdAccountsService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AdAccountsService_1.name);
    }
    async findAll(tenantId) {
        const accounts = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findMany({
            where: { tenantId },
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
            include: {
                _count: { select: { campaigns: true } },
            },
        }));
        return accounts.map(({ accessToken, _count, ...rest }) => ({
            ...rest,
            accessToken: maskToken(accessToken),
            campaignCount: _count.campaigns,
        }));
    }
    async findOne(tenantId, id) {
        const account = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({
            where: { id, tenantId },
            include: { _count: { select: { campaigns: true } } },
        }));
        if (!account)
            throw new common_1.NotFoundException('Cuenta de ads no encontrada.');
        const { accessToken, _count, ...rest } = account;
        return { ...rest, accessToken: maskToken(accessToken), campaignCount: _count.campaigns };
    }
    async create(tenantId, dto) {
        const existing = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({
            where: {
                tenantId,
                platform: dto.platform,
                externalAccountId: dto.externalAccountId,
            },
        }));
        if (existing) {
            throw new common_1.ConflictException(`Ya existe una cuenta ${dto.platform} con ID ${dto.externalAccountId}.`);
        }
        const count = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.count({ where: { tenantId } }));
        const account = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.create({
            data: {
                tenantId,
                name: dto.name,
                platform: dto.platform,
                externalAccountId: dto.externalAccountId,
                accessToken: dto.accessToken ?? null,
                status: 'active',
                isDefault: count === 0,
            },
        }));
        this.logger.log(`Cuenta de ads creada: ${account.id} (tenant ${tenantId})`);
        const { accessToken, ...rest } = account;
        return { ...rest, accessToken: maskToken(accessToken), campaignCount: 0 };
    }
    async update(tenantId, id, dto) {
        const account = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({ where: { id, tenantId } }));
        if (!account)
            throw new common_1.NotFoundException('Cuenta de ads no encontrada.');
        const data = {};
        if (dto.name !== undefined)
            data.name = dto.name;
        if (dto.accessToken !== undefined)
            data.accessToken = dto.accessToken;
        if (dto.status !== undefined)
            data.status = dto.status;
        if (dto.isDefault === true) {
            await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false },
            }));
            data.isDefault = true;
        }
        const updated = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.update({ where: { id }, data }));
        this.logger.log(`Cuenta de ads actualizada: ${id} (tenant ${tenantId})`);
        const { accessToken, ...rest } = updated;
        return { ...rest, accessToken: maskToken(accessToken) };
    }
    async remove(tenantId, id) {
        const account = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({ where: { id, tenantId } }));
        if (!account)
            throw new common_1.NotFoundException('Cuenta de ads no encontrada.');
        await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.delete({ where: { id } }));
        if (account.isDefault) {
            const next = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({
                where: { tenantId },
                orderBy: { createdAt: 'asc' },
            }));
            if (next) {
                await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.update({
                    where: { id: next.id },
                    data: { isDefault: true },
                }));
            }
        }
        this.logger.log(`Cuenta de ads eliminada: ${id} (tenant ${tenantId})`);
        return { message: 'Cuenta eliminada.' };
    }
    async syncAccount(tenantId, id) {
        const account = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({ where: { id, tenantId } }));
        if (!account)
            throw new common_1.NotFoundException('Cuenta de ads no encontrada.');
        this.logger.log(`Iniciando sync para cuenta ${id} (${account.platform})`);
        try {
            const mockCampaigns = this.buildMockCampaigns(account.externalAccountId, account.platform);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            for (const mock of mockCampaigns) {
                const campaign = await this.prisma.withTenant(tenantId, () => this.prisma.adCampaign.upsert({
                    where: { tenantId_externalId: { tenantId, externalId: mock.externalId } },
                    update: {
                        name: mock.name,
                        status: mock.status,
                        objective: mock.objective,
                        budgetDaily: mock.budgetDaily,
                        lastSyncedAt: new Date(),
                        adsAccountId: id,
                    },
                    create: {
                        tenantId,
                        adsAccountId: id,
                        externalId: mock.externalId,
                        name: mock.name,
                        status: mock.status,
                        objective: mock.objective,
                        budgetDaily: mock.budgetDaily,
                        platform: account.platform,
                        lastSyncedAt: new Date(),
                    },
                }));
                const ctr = mock.clicks > 0 ? parseFloat((mock.clicks / mock.impressions).toFixed(4)) : 0;
                const cpm = mock.impressions > 0 ? parseFloat(((mock.spend / mock.impressions) * 1000).toFixed(4)) : 0;
                const cpc = mock.clicks > 0 ? parseFloat((mock.spend / mock.clicks).toFixed(4)) : 0;
                await this.prisma.withTenant(tenantId, () => this.prisma.adCampaignMetric.upsert({
                    where: { campaignId_date: { campaignId: campaign.id, date: today } },
                    update: { impressions: mock.impressions, clicks: mock.clicks, spend: mock.spend, ctr, cpm, cpc },
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
            await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.update({
                where: { id },
                data: { lastSyncedAt: new Date(), syncErrorMessage: null, status: 'active' },
            }));
            this.logger.log(`Sync completada para cuenta ${id}: ${mockCampaigns.length} campañas`);
            return { synced: mockCampaigns.length, accountId: id, message: 'Sincronización completada.' };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.update({
                where: { id },
                data: { syncErrorMessage: msg, status: 'error' },
            }));
            throw err;
        }
    }
    buildMockCampaigns(accountId, platform) {
        return [
            {
                externalId: `${accountId}_camp_001`,
                name: 'Diagnóstico — Conversiones',
                status: 'ACTIVE',
                objective: 'CONVERSIONS',
                budgetDaily: 5000,
                impressions: Math.floor(Math.random() * 50000) + 10000,
                clicks: Math.floor(Math.random() * 2000) + 500,
                spend: parseFloat((Math.random() * 3000 + 1000).toFixed(2)),
            },
            {
                externalId: `${accountId}_camp_002`,
                name: 'Diagnóstico — Leads',
                status: 'PAUSED',
                objective: 'LEAD_GENERATION',
                budgetDaily: 3000,
                impressions: Math.floor(Math.random() * 30000) + 5000,
                clicks: Math.floor(Math.random() * 1000) + 200,
                spend: parseFloat((Math.random() * 1500 + 500).toFixed(2)),
            },
        ];
    }
};
exports.AdAccountsService = AdAccountsService;
exports.AdAccountsService = AdAccountsService = AdAccountsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdAccountsService);
//# sourceMappingURL=ad-accounts.service.js.map
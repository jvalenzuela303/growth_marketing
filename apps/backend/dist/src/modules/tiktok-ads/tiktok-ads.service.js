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
var TikTokAdsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAdsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../database/prisma.service");
let TikTokAdsService = TikTokAdsService_1 = class TikTokAdsService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(TikTokAdsService_1.name);
        this.baseUrl = 'https://business-api.tiktok.com/open_api/v1.3';
        this.authUrl = 'https://business-api.tiktok.com/portal/auth';
        this.tokenUrl = 'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/';
    }
    buildOAuthUrl(state) {
        const appId = this.config.get('TIKTOK_APP_ID', '');
        const redirectUri = this.config.get('TIKTOK_REDIRECT_URI', 'http://localhost:4001/api/v1/tiktok-ads/oauth/callback');
        if (!appId) {
            throw new common_1.BadRequestException('TIKTOK_APP_ID no configurado en .env');
        }
        const params = new URLSearchParams({
            app_id: appId,
            state,
            redirect_uri: redirectUri,
        });
        return `${this.authUrl}?${params}`;
    }
    async handleOAuthCallback(authCode, tenantId, advertiserId) {
        const appId = this.config.get('TIKTOK_APP_ID', '');
        const appSecret = this.config.get('TIKTOK_APP_SECRET', '');
        if (!appId || !appSecret) {
            throw new common_1.BadRequestException('TIKTOK_APP_ID o TIKTOK_APP_SECRET no configurados.');
        }
        const res = await fetch(this.tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: appId,
                secret: appSecret,
                auth_code: authCode,
            }),
        });
        const body = await res.json();
        if (body.code !== 0) {
            throw new common_1.BadRequestException(`TikTok OAuth error: ${body.message ?? JSON.stringify(body)}`);
        }
        const accessToken = body.data?.access_token;
        const accountName = `TikTok — ${advertiserId}`;
        const existing = await this.prisma.adsAccount.findFirst({
            where: { tenantId, platform: 'tiktok', externalAccountId: advertiserId },
        });
        if (existing) {
            await this.prisma.adsAccount.update({
                where: { id: existing.id },
                data: { accessToken, status: 'active', lastSyncedAt: new Date(), syncErrorMessage: null },
            });
        }
        else {
            const count = await this.prisma.adsAccount.count({ where: { tenantId } });
            await this.prisma.adsAccount.create({
                data: {
                    tenantId,
                    name: accountName,
                    platform: 'tiktok',
                    externalAccountId: advertiserId,
                    accessToken,
                    status: 'active',
                    isDefault: count === 0,
                    lastSyncedAt: new Date(),
                },
            });
        }
        this.logger.log(`TikTok Ads OAuth completado: tenant=${tenantId}, advertiser=${advertiserId}`);
    }
    async disconnect(tenantId, accountId) {
        const account = await this.prisma.adsAccount.findFirst({
            where: { id: accountId, tenantId, platform: 'tiktok' },
        });
        if (!account)
            throw new common_1.NotFoundException('Cuenta TikTok Ads no encontrada.');
        await this.prisma.adsAccount.update({
            where: { id: accountId },
            data: { accessToken: null, status: 'disconnected' },
        });
    }
    async getCampaigns(tenantId, advertiserId, accountId) {
        const account = accountId
            ? await this.prisma.adsAccount.findFirst({ where: { id: accountId, tenantId } })
            : await this.prisma.adsAccount.findFirst({
                where: { tenantId, platform: 'tiktok', externalAccountId: advertiserId, status: 'active' },
            });
        if (!account) {
            throw new common_1.NotFoundException('Cuenta TikTok Ads no encontrada o desconectada.');
        }
        if (!account.accessToken) {
            throw new common_1.BadRequestException('La cuenta TikTok Ads no tiene token de acceso. Reconecta con OAuth.');
        }
        try {
            const campaigns = await this.fetchCampaigns(account.accessToken, advertiserId);
            const metrics = await this.fetchMetrics(account.accessToken, advertiserId, campaigns.map((c) => c.campaign_id));
            const metricsMap = new Map();
            for (const m of metrics) {
                metricsMap.set(m.dimensions?.campaign_id, m.metrics);
            }
            const result = campaigns.map((c) => {
                const m = metricsMap.get(c.campaign_id) ?? {};
                const spend = parseFloat(m.spend ?? '0');
                const impressions = parseInt(m.impressions ?? '0', 10);
                const clicks = parseInt(m.clicks ?? '0', 10);
                const conversions = parseFloat(m.conversion ?? '0');
                return {
                    id: c.campaign_id,
                    name: c.campaign_name,
                    status: c.operation_status,
                    objective: c.objective_type,
                    budgetDaily: parseFloat(c.budget ?? '0'),
                    spend,
                    impressions,
                    clicks,
                    conversions,
                    ctr: impressions > 0 ? clicks / impressions : 0,
                    cpc: clicks > 0 ? spend / clicks : 0,
                    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
                    platform: 'tiktok',
                };
            });
            await this.prisma.adsAccount.update({
                where: { id: account.id },
                data: { lastSyncedAt: new Date(), syncErrorMessage: null },
            });
            return { campaigns: result, account: { id: account.id, name: account.name, advertiserId } };
        }
        catch (err) {
            this.logger.warn(`TikTok API error, falling back to DB: ${err.message}`);
            const dbCampaigns = await this.prisma.adCampaign.findMany({
                where: { tenantId, adsAccountId: account.id },
                include: { metrics: { orderBy: { date: 'desc' }, take: 1 } },
            });
            return {
                campaigns: dbCampaigns.map((c) => ({
                    id: c.externalId,
                    name: c.name,
                    status: c.status,
                    objective: c.objective ?? '',
                    budgetDaily: Number(c.budgetDaily ?? 0),
                    spend: Number(c.metrics[0]?.spend ?? 0),
                    impressions: c.metrics[0]?.impressions ?? 0,
                    clicks: c.metrics[0]?.clicks ?? 0,
                    conversions: 0,
                    ctr: Number(c.metrics[0]?.ctr ?? 0),
                    cpc: Number(c.metrics[0]?.cpc ?? 0),
                    cpm: Number(c.metrics[0]?.cpm ?? 0),
                    platform: 'tiktok',
                })),
                account: { id: account.id, name: account.name, advertiserId },
                warning: 'Datos desde caché local (API TikTok no disponible)',
            };
        }
    }
    async fetchCampaigns(accessToken, advertiserId) {
        const url = `${this.baseUrl}/campaign/get/?advertiser_id=${encodeURIComponent(advertiserId)}&page_size=20`;
        const res = await fetch(url, {
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });
        const body = await res.json();
        if (body.code !== 0)
            throw new Error(`TikTok /campaign/get error: ${body.message}`);
        return body.data?.list ?? [];
    }
    async fetchMetrics(accessToken, advertiserId, campaignIds) {
        if (campaignIds.length === 0)
            return [];
        const url = `${this.baseUrl}/report/integrated/get/`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                advertiser_id: advertiserId,
                report_type: 'BASIC',
                dimensions: ['campaign_id'],
                metrics: ['spend', 'impressions', 'clicks', 'conversion', 'ctr', 'cpc', 'cpm'],
                data_level: 'AUCTION_CAMPAIGN',
                start_date: this.daysAgo(30),
                end_date: this.today(),
                filtering: [{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify(campaignIds) }],
                page_size: 20,
            }),
        });
        const body = await res.json();
        if (body.code !== 0)
            return [];
        return body.data?.list ?? [];
    }
    today() {
        return new Date().toISOString().slice(0, 10);
    }
    daysAgo(n) {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
    }
};
exports.TikTokAdsService = TikTokAdsService;
exports.TikTokAdsService = TikTokAdsService = TikTokAdsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], TikTokAdsService);
//# sourceMappingURL=tiktok-ads.service.js.map
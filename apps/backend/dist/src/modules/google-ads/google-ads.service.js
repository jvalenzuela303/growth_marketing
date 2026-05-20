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
var GoogleAdsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAdsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const prisma_service_1 = require("../../database/prisma.service");
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ADS_BASE = 'https://googleads.googleapis.com/v20';
const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
let GoogleAdsService = GoogleAdsService_1 = class GoogleAdsService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(GoogleAdsService_1.name);
    }
    buildOAuthUrl(tenantId) {
        const clientId = this.requireConfig('GOOGLE_ADS_CLIENT_ID');
        const redirectUri = this.requireConfig('GOOGLE_ADS_REDIRECT_URI');
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: GOOGLE_ADS_SCOPE,
            access_type: 'offline',
            prompt: 'consent',
            state: tenantId,
        });
        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }
    async handleOAuthCallback(code, tenantId, customerId) {
        const clientId = this.requireConfig('GOOGLE_ADS_CLIENT_ID');
        const clientSecret = this.requireConfig('GOOGLE_ADS_CLIENT_SECRET');
        const redirectUri = this.requireConfig('GOOGLE_ADS_REDIRECT_URI');
        const tokenRes = await axios_1.default.post(GOOGLE_TOKEN_URL, new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch((err) => {
            const detail = err.response?.data?.error_description ?? err.message;
            this.logger.error(`Error intercambiando code de Google: ${detail}`);
            throw new common_1.BadRequestException(`No se pudo intercambiar el código OAuth: ${detail}`);
        });
        const { access_token, refresh_token, expires_in } = tokenRes.data;
        if (!refresh_token) {
            throw new common_1.BadRequestException('Google no devolvió refresh_token. Revoca el acceso previo en myaccount.google.com/permissions y vuelve a conectar.');
        }
        const tokens = {
            refresh_token,
            access_token,
            expires_at: Date.now() + expires_in * 1000,
        };
        const normalizedId = customerId.replace(/-/g, '');
        let accountName = `Google Ads ${customerId}`;
        try {
            const info = await this.fetchCustomerInfo(normalizedId, tokens);
            accountName = info.descriptiveName ?? accountName;
        }
        catch {
            this.logger.warn(`No se pudo obtener nombre de la cuenta ${customerId}`);
        }
        await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.upsert({
            where: {
                uq_ads_accounts_tenant_platform_external: {
                    tenantId,
                    platform: 'google',
                    externalAccountId: normalizedId,
                },
            },
            update: {
                name: accountName,
                accessToken: JSON.stringify(tokens),
                status: 'active',
                syncErrorMessage: null,
            },
            create: {
                tenantId,
                name: accountName,
                platform: 'google',
                externalAccountId: normalizedId,
                accessToken: JSON.stringify(tokens),
                status: 'active',
                isDefault: false,
            },
        }));
        this.logger.log(`Google Ads OAuth completado: tenant=${tenantId}, customerId=${normalizedId}`);
    }
    async disconnect(tenantId, adsAccountId) {
        await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.updateMany({
            where: { id: adsAccountId, tenantId, platform: 'google' },
            data: { accessToken: null, status: 'disconnected' },
        }));
        this.logger.log(`Google Ads desconectado: tenant=${tenantId}, account=${adsAccountId}`);
    }
    async getCampaigns(tenantId, customerId, adsAccountId, days = 30) {
        const normalizedId = customerId.replace(/-/g, '');
        const account = await this.resolveAccount(tenantId, normalizedId, adsAccountId);
        const tokens = this.parseTokens(account.accessToken);
        const fresh = await this.getFreshAccessToken(tokens, account.id, tenantId);
        const dateTo = new Date();
        const dateFrom = new Date();
        dateFrom.setDate(dateTo.getDate() - days);
        const fmt = (d) => d.toISOString().slice(0, 10);
        const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE campaign.status != 'REMOVED'
        AND segments.date BETWEEN '${fmt(dateFrom)}' AND '${fmt(dateTo)}'
      ORDER BY metrics.cost_micros DESC
    `;
        const devToken = this.requireConfig('GOOGLE_ADS_DEVELOPER_TOKEN');
        const loginCustId = this.config.get('GOOGLE_ADS_LOGIN_CUSTOMER_ID');
        const headers = {
            Authorization: `Bearer ${fresh}`,
            'developer-token': devToken,
            'Content-Type': 'application/json',
        };
        if (loginCustId) {
            headers['login-customer-id'] = loginCustId;
        }
        const res = await axios_1.default.post(`${GOOGLE_ADS_BASE}/customers/${normalizedId}/googleAds:search`, { query }, { headers, timeout: 15_000 }).catch((err) => {
            const detail = JSON.stringify(err.response?.data ?? err.message);
            this.logger.error(`Error Google Ads API: ${detail}`);
            this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.update({
                where: { id: account.id },
                data: { status: 'error', syncErrorMessage: detail.slice(0, 500) },
            })).catch(() => { });
            throw new common_1.BadRequestException(`Error consultando Google Ads API: ${err.response?.data?.error?.message ?? err.message}`);
        });
        return (res.data.results ?? []).map((row) => ({
            id: row.campaign.id,
            name: row.campaign.name,
            status: row.campaign.status,
            platform: 'google',
            channelType: row.campaign.advertisingChannelType ?? null,
            budgetDaily: row.campaignBudget
                ? Number(row.campaignBudget.amountMicros) / 1_000_000
                : null,
            impressions: Number(row.metrics?.impressions ?? 0),
            clicks: Number(row.metrics?.clicks ?? 0),
            spend: Number(row.metrics?.costMicros ?? 0) / 1_000_000,
            conversions: row.metrics?.conversions ?? 0,
            ctr: row.metrics?.ctr ?? 0,
            cpc: Number(row.metrics?.averageCpc ?? 0) / 1_000_000,
            cpm: Number(row.metrics?.averageCpm ?? 0) / 1_000_000,
        }));
    }
    async getFreshAccessToken(tokens, accountId, tenantId) {
        const MARGIN_MS = 5 * 60 * 1000;
        if (tokens.expires_at - Date.now() > MARGIN_MS) {
            return tokens.access_token;
        }
        this.logger.debug(`Refrescando access_token para account ${accountId}`);
        const clientId = this.requireConfig('GOOGLE_ADS_CLIENT_ID');
        const clientSecret = this.requireConfig('GOOGLE_ADS_CLIENT_SECRET');
        const res = await axios_1.default.post(GOOGLE_TOKEN_URL, new URLSearchParams({
            refresh_token: tokens.refresh_token,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).catch((err) => {
            const detail = err.response?.data?.error ?? err.message;
            throw new common_1.UnauthorizedException(`No se pudo refrescar el token de Google: ${detail}`);
        });
        const updated = {
            refresh_token: tokens.refresh_token,
            access_token: res.data.access_token,
            expires_at: Date.now() + res.data.expires_in * 1000,
        };
        this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.update({
            where: { id: accountId },
            data: { accessToken: JSON.stringify(updated) },
        })).catch((e) => this.logger.warn(`No se pudo persistir token refrescado: ${e.message}`));
        return updated.access_token;
    }
    async resolveAccount(tenantId, customerId, adsAccountId) {
        const where = adsAccountId
            ? { id: adsAccountId, tenantId, platform: 'google' }
            : { tenantId, platform: 'google', externalAccountId: customerId };
        const account = await this.prisma.withTenant(tenantId, () => this.prisma.adsAccount.findFirst({ where }));
        if (!account) {
            throw new common_1.BadRequestException(`No se encontró cuenta de Google Ads (customerId=${customerId}) para este tenant. ` +
                'Conecta la cuenta primero desde la página de Publicidad.');
        }
        if (!account.accessToken) {
            throw new common_1.UnauthorizedException('La cuenta de Google Ads no tiene tokens almacenados. Vuelve a conectarla.');
        }
        return account;
    }
    parseTokens(raw) {
        if (!raw)
            throw new common_1.UnauthorizedException('Token de Google Ads no configurado.');
        try {
            return JSON.parse(raw);
        }
        catch {
            throw new common_1.UnauthorizedException('Token de Google Ads tiene formato inválido.');
        }
    }
    async fetchCustomerInfo(customerId, tokens) {
        const devToken = this.requireConfig('GOOGLE_ADS_DEVELOPER_TOKEN');
        const query = `
      SELECT customer.id, customer.descriptive_name, customer.currency_code
      FROM customer
      LIMIT 1
    `;
        const res = await axios_1.default.post(`${GOOGLE_ADS_BASE}/customers/${customerId}/googleAds:search`, { query }, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                'developer-token': devToken,
                'Content-Type': 'application/json',
            },
            timeout: 8_000,
        });
        return res.data.results?.[0]?.customer ?? {};
    }
    requireConfig(key) {
        const value = this.config.get(key);
        if (!value) {
            throw new common_1.BadRequestException(`Variable de entorno ${key} no está configurada. Agrégala a apps/backend/.env`);
        }
        return value;
    }
};
exports.GoogleAdsService = GoogleAdsService;
exports.GoogleAdsService = GoogleAdsService = GoogleAdsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], GoogleAdsService);
//# sourceMappingURL=google-ads.service.js.map
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
var InstagramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const prisma_service_1 = require("../../database/prisma.service");
const GRAPH_API = 'https://graph.facebook.com/v19.0';
const INSTAGRAM_OAUTH_BASE = 'https://api.instagram.com/oauth/authorize';
const TOKEN_EXCHANGE_URL = 'https://graph.instagram.com/access_token';
let InstagramService = InstagramService_1 = class InstagramService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(InstagramService_1.name);
    }
    buildOAuthUrl(tenantId) {
        const appId = this.config.get('META_APP_ID');
        const redirectUri = this.config.get('META_INSTAGRAM_REDIRECT_URI');
        if (!appId || !redirectUri) {
            throw new common_1.BadRequestException('META_APP_ID y META_INSTAGRAM_REDIRECT_URI deben estar configurados.');
        }
        const params = new URLSearchParams({
            client_id: appId,
            redirect_uri: redirectUri,
            scope: 'instagram_manage_messages,pages_manage_metadata,pages_messaging',
            response_type: 'code',
            state: tenantId,
        });
        return `${INSTAGRAM_OAUTH_BASE}?${params.toString()}`;
    }
    async handleOAuthCallback(code, tenantId) {
        const appId = this.config.get('META_APP_ID');
        const appSecret = this.config.get('META_APP_SECRET');
        const redirectUri = this.config.get('META_INSTAGRAM_REDIRECT_URI');
        if (!appId || !appSecret || !redirectUri) {
            throw new common_1.BadRequestException('Credenciales META no configuradas en el servidor.');
        }
        const shortTokenRes = await axios_1.default.get('https://api.instagram.com/oauth/access_token', {
            params: {
                client_id: appId,
                client_secret: appSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code,
            },
        }).catch((err) => {
            this.logger.error(`Error intercambiando code: ${err.response?.data?.error_description}`);
            throw new common_1.BadRequestException('No se pudo intercambiar el código OAuth de Instagram.');
        });
        const shortToken = shortTokenRes.data.access_token;
        const longTokenRes = await axios_1.default.get(TOKEN_EXCHANGE_URL, {
            params: {
                grant_type: 'ig_exchange_token',
                client_secret: appSecret,
                access_token: shortToken,
            },
        }).catch(() => {
            throw new common_1.BadRequestException('No se pudo obtener token de larga duración de Instagram.');
        });
        const longToken = longTokenRes.data.access_token;
        const meRes = await axios_1.default.get('https://graph.instagram.com/me', {
            params: {
                fields: 'id,username',
                access_token: longToken,
            },
        }).catch(() => {
            throw new common_1.BadRequestException('No se pudo obtener el perfil de Instagram.');
        });
        const pageId = meRes.data.id;
        this.logger.log(`Instagram OAuth completado para tenant ${tenantId}: pageId=${pageId}`);
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                metaInstagramPageId: pageId,
                metaInstagramAccessToken: longToken,
            },
        });
    }
    async disconnect(tenantId) {
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                metaInstagramPageId: null,
                metaInstagramAccessToken: null,
            },
        });
        this.logger.log(`Instagram desconectado para tenant ${tenantId}`);
    }
    async getStatus(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                metaInstagramPageId: true,
                metaInstagramAccessToken: true,
            },
        });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant no encontrado.');
        const pageId = tenant.metaInstagramPageId;
        const token = tenant.metaInstagramAccessToken;
        if (!pageId || !token) {
            return { connected: false, pageId: null, username: null };
        }
        try {
            const res = await axios_1.default.get('https://graph.instagram.com/me', { params: { fields: 'id,username', access_token: token } });
            return { connected: true, pageId, username: res.data.username ?? null };
        }
        catch {
            return { connected: true, pageId, username: null };
        }
    }
    async sendDM(tenantId, igUserId, text) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { metaInstagramPageId: true, metaInstagramAccessToken: true },
        });
        const pageId = tenant?.metaInstagramPageId;
        const token = tenant?.metaInstagramAccessToken;
        if (!pageId || !token) {
            throw new common_1.BadRequestException('Instagram no está conectado para este tenant.');
        }
        const res = await axios_1.default.post(`${GRAPH_API}/${pageId}/messages`, {
            recipient: { id: igUserId },
            message: { text },
        }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10_000,
        }).catch((err) => {
            this.logger.error(`Error enviando DM Instagram: ${JSON.stringify(err.response?.data)}`);
            throw new common_1.BadRequestException('Error enviando DM de Instagram.');
        });
        return { messageId: res.data.message_id };
    }
    async processWebhook(payload) {
        if (payload?.object !== 'instagram')
            return;
        for (const entry of payload?.entry ?? []) {
            const pageId = entry.id;
            const tenant = await this.prisma.$queryRaw `
        SELECT id FROM tenants
        WHERE meta_instagram_page_id = ${pageId}
          AND deleted_at IS NULL
        LIMIT 1
      `.catch(() => []);
            if (!tenant.length) {
                this.logger.warn(`Webhook Instagram: no se encontró tenant para pageId=${pageId}`);
                continue;
            }
            const tenantId = tenant[0].id;
            for (const event of entry?.messaging ?? []) {
                const senderId = event?.sender?.id;
                const text = event?.message?.text;
                const messageId = event?.message?.mid;
                if (!senderId || !text)
                    continue;
                const lead = await this.findOrCreateInstagramLead(tenantId, senderId);
                await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
                    data: {
                        tenantId,
                        leadId: lead.id,
                        channel: 'instagram',
                        role: 'user',
                        content: text,
                        contentType: 'text',
                        status: 'delivered',
                        externalMessageId: messageId,
                        metadata: { igUserId: senderId },
                    },
                }));
                this.logger.debug(`Instagram DM guardado: lead=${lead.id}, msg="${text.slice(0, 50)}"`);
            }
        }
    }
    async findOrCreateInstagramLead(tenantId, igUserId) {
        const existing = await this.prisma.withTenant(tenantId, () => this.prisma.$queryRaw `
        SELECT id FROM leads
        WHERE tenant_id  = ${tenantId}::uuid
          AND deleted_at IS NULL
          AND quiz_answers->>'instagramUserId' = ${igUserId}
        LIMIT 1
      `);
        if (existing.length)
            return { id: existing[0].id };
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.create({
            data: {
                tenantId,
                source: 'instagram',
                quizAnswers: { instagramUserId: igUserId },
                quizScore: 0,
                behaviorScore: 0,
                engagementScore: 0,
                demographicScore: 0,
            },
        }));
        return { id: lead.id };
    }
};
exports.InstagramService = InstagramService;
exports.InstagramService = InstagramService = InstagramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], InstagramService);
//# sourceMappingURL=instagram.service.js.map
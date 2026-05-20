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
var WebhooksController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const prisma_service_1 = require("../../database/prisma.service");
class CapiEventDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CapiEventDto.prototype, "event_name", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CapiEventDto.prototype, "event_time", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CapiEventDto.prototype, "event_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CapiEventDto.prototype, "event_source_url", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CapiEventDto.prototype, "user_data", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], CapiEventDto.prototype, "custom_data", void 0);
class MetaCapiWebhookDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MetaCapiWebhookDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MetaCapiWebhookDto.prototype, "pixelId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => CapiEventDto),
    __metadata("design:type", Array)
], MetaCapiWebhookDto.prototype, "events", void 0);
let WebhooksController = WebhooksController_1 = class WebhooksController {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(WebhooksController_1.name);
    }
    verifyMetaWebhook(mode, verifyToken, challenge) {
        const expectedToken = this.config.get('META_WEBHOOK_VERIFY_TOKEN');
        if (mode === 'subscribe' && verifyToken === expectedToken) {
            return parseInt(challenge, 10);
        }
        throw new common_1.BadRequestException('Verificación de webhook fallida.');
    }
    async sendToMetaCapi(dto, req) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: dto.tenantId },
            select: { metaCapiToken: true, metaPixelId: true, isActive: true },
        });
        if (!tenant || !tenant.isActive) {
            throw new common_1.BadRequestException('Tenant no encontrado o inactivo.');
        }
        const accessToken = tenant.metaCapiToken || this.config.get('META_CAPI_TOKEN');
        const pixelId = tenant.metaPixelId || dto.pixelId;
        if (!accessToken) {
            throw new common_1.BadRequestException('Meta CAPI token no configurado para este tenant.');
        }
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const enrichedEvents = dto.events.map((event) => ({
            ...event,
            user_data: {
                ...event.user_data,
                client_ip_address: event.user_data?.client_ip_address || ipAddress,
                client_user_agent: event.user_data?.client_user_agent || userAgent,
            },
            action_source: 'website',
        }));
        try {
            const response = await axios_1.default.post(`https://graph.facebook.com/v19.0/${pixelId}/events`, {
                data: enrichedEvents,
                test_event_code: this.config.get('META_CAPI_TEST_CODE'),
            }, {
                params: { access_token: accessToken },
                timeout: 10000,
            });
            this.logger.debug(`CAPI: ${enrichedEvents.length} evento(s) enviados a pixel ${pixelId}. ` +
                `events_received: ${response.data?.events_received}`);
            return {
                success: true,
                eventsReceived: response.data?.events_received,
                fbc: response.data?.fbc,
            };
        }
        catch (error) {
            const errorData = error.response?.data;
            this.logger.error(`Error Meta CAPI: ${JSON.stringify(errorData)}`);
            throw new common_1.BadRequestException(`Meta CAPI error: ${errorData?.error?.message || error.message}`);
        }
    }
    async receiveMetaLeadAd(payload, req) {
        const signature = req.headers['x-hub-signature-256'];
        const appSecret = this.config.get('META_APP_SECRET');
        if (appSecret && signature) {
            const crypto = await Promise.resolve().then(() => require('crypto'));
            const expectedSignature = 'sha256=' +
                crypto
                    .createHmac('sha256', appSecret)
                    .update(JSON.stringify(payload))
                    .digest('hex');
            if (signature !== expectedSignature) {
                throw new common_1.BadRequestException('Firma HMAC inválida.');
            }
        }
        this.logger.log(`Lead Ad webhook recibido: ${JSON.stringify(payload?.entry?.length)} entradas`);
        return { status: 'received' };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Get)('meta/verify'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "verifyMetaWebhook", null);
__decorate([
    (0, common_1.Post)('meta'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [MetaCapiWebhookDto, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "sendToMetaCapi", null);
__decorate([
    (0, common_1.Post)('meta/leads'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "receiveMetaLeadAd", null);
exports.WebhooksController = WebhooksController = WebhooksController_1 = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], WebhooksController);
//# sourceMappingURL=meta-capi.controller.js.map
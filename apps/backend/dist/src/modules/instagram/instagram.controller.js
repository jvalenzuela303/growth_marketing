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
var InstagramController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto = require("crypto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const instagram_service_1 = require("./instagram.service");
let InstagramController = InstagramController_1 = class InstagramController {
    constructor(instagramService, config) {
        this.instagramService = instagramService;
        this.config = config;
        this.logger = new common_1.Logger(InstagramController_1.name);
    }
    initOAuth(tenantId, res) {
        const url = this.instagramService.buildOAuthUrl(tenantId);
        return res.redirect(302, url);
    }
    async getStatus(tenantId) {
        return this.instagramService.getStatus(tenantId);
    }
    async disconnect(tenantId) {
        await this.instagramService.disconnect(tenantId);
        return { success: true };
    }
    async oauthCallback(code, state, error, res) {
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        const settingsUrl = `${frontendUrl}/settings?tab=integraciones`;
        if (error) {
            this.logger.warn(`Instagram OAuth rechazado: ${error}`);
            return res.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(error)}`);
        }
        if (!code || !state) {
            return res.redirect(`${settingsUrl}&ig_error=missing_params`);
        }
        try {
            await this.instagramService.handleOAuthCallback(code, state);
            return res.redirect(`${settingsUrl}&ig_success=1`);
        }
        catch (err) {
            this.logger.error(`Error en callback OAuth: ${err.message}`);
            return res.redirect(`${settingsUrl}&ig_error=${encodeURIComponent(err.message)}`);
        }
    }
    verifyWebhook(mode, verifyToken, challenge) {
        const expected = this.config.get('META_WEBHOOK_VERIFY_TOKEN');
        if (mode === 'subscribe' && verifyToken === expected) {
            this.logger.log('Webhook Instagram verificado correctamente.');
            return parseInt(challenge, 10);
        }
        throw new common_1.BadRequestException('Token de verificación de webhook inválido.');
    }
    async receiveWebhook(payload, req) {
        const appSecret = this.config.get('META_APP_SECRET');
        const signature = req.headers['x-hub-signature-256'];
        if (appSecret && signature) {
            const rawBody = JSON.stringify(payload);
            const expected = 'sha256=' + crypto
                .createHmac('sha256', appSecret)
                .update(rawBody)
                .digest('hex');
            if (signature !== expected) {
                this.logger.warn('Firma HMAC inválida en webhook Instagram.');
                throw new common_1.BadRequestException('Firma HMAC inválida.');
            }
        }
        await this.instagramService.processWebhook(payload).catch((err) => this.logger.error(`Error procesando webhook Instagram: ${err.message}`));
        return { status: 'ok' };
    }
    async sendDM(tenantId, body) {
        if (!body.igUserId || !body.text) {
            throw new common_1.BadRequestException('igUserId y text son requeridos.');
        }
        return this.instagramService.sendDM(tenantId, body.igUserId, body.text);
    }
};
exports.InstagramController = InstagramController;
__decorate([
    (0, common_1.Get)('oauth/init'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstagramController.prototype, "initOAuth", null);
__decorate([
    (0, common_1.Get)('oauth/status'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InstagramController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Delete)('oauth/disconnect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InstagramController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], InstagramController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.Get)('webhook'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Number)
], InstagramController.prototype, "verifyWebhook", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], InstagramController.prototype, "receiveWebhook", null);
__decorate([
    (0, common_1.Post)('dm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InstagramController.prototype, "sendDM", null);
exports.InstagramController = InstagramController = InstagramController_1 = __decorate([
    (0, common_1.Controller)('instagram'),
    __metadata("design:paramtypes", [instagram_service_1.InstagramService,
        config_1.ConfigService])
], InstagramController);
//# sourceMappingURL=instagram.controller.js.map
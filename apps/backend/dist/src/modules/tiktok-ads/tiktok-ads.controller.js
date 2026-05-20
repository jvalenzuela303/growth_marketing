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
var TikTokAdsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikTokAdsController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const tiktok_ads_service_1 = require("./tiktok-ads.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let TikTokAdsController = TikTokAdsController_1 = class TikTokAdsController {
    constructor(tiktokAdsService, config) {
        this.tiktokAdsService = tiktokAdsService;
        this.config = config;
        this.logger = new common_1.Logger(TikTokAdsController_1.name);
    }
    initOAuth(tenantId, advertiserId, res) {
        if (!advertiserId) {
            throw new common_1.BadRequestException('El parámetro advertiserId es requerido.');
        }
        const state = `${tenantId}:${advertiserId}`;
        const url = this.tiktokAdsService.buildOAuthUrl(state);
        this.logger.log(`Iniciando OAuth TikTok Ads: tenant=${tenantId}, advertiser=${advertiserId}`);
        return res.redirect(302, url);
    }
    async oauthCallback(authCode, state, error, res) {
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        const redirectBase = `${frontendUrl}/ads?tab=tiktok`;
        if (error) {
            this.logger.warn(`TikTok Ads OAuth rechazado: ${error}`);
            return res.redirect(`${redirectBase}&tt_error=${encodeURIComponent(error)}`);
        }
        if (!authCode || !state) {
            return res.redirect(`${redirectBase}&tt_error=missing_params`);
        }
        const [tenantId, ...rest] = state.split(':');
        const advertiserId = rest.join(':');
        if (!tenantId || !advertiserId) {
            return res.redirect(`${redirectBase}&tt_error=invalid_state`);
        }
        try {
            await this.tiktokAdsService.handleOAuthCallback(authCode, tenantId, advertiserId);
            this.logger.log(`TikTok Ads OAuth exitoso: tenant=${tenantId}, advertiser=${advertiserId}`);
            return res.redirect(`${redirectBase}&tt_success=1&advertiser=${encodeURIComponent(advertiserId)}`);
        }
        catch (err) {
            this.logger.error(`Error en callback TikTok Ads: ${err.message}`);
            return res.redirect(`${redirectBase}&tt_error=${encodeURIComponent(err.message)}`);
        }
    }
    async disconnect(tenantId, accountId) {
        await this.tiktokAdsService.disconnect(tenantId, accountId);
        return { success: true, message: 'Cuenta TikTok Ads desconectada.' };
    }
    async getCampaigns(tenantId, advertiserId, accountId) {
        if (!advertiserId) {
            throw new common_1.BadRequestException('El parámetro advertiserId es requerido.');
        }
        return this.tiktokAdsService.getCampaigns(tenantId, advertiserId, accountId);
    }
};
exports.TikTokAdsController = TikTokAdsController;
__decorate([
    (0, common_1.Get)('oauth/init'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('advertiserId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], TikTokAdsController.prototype, "initOAuth", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    __param(0, (0, common_1.Query)('auth_code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], TikTokAdsController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.Delete)('oauth/:accountId/disconnect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('accountId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TikTokAdsController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('campaigns'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('advertiserId')),
    __param(2, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TikTokAdsController.prototype, "getCampaigns", null);
exports.TikTokAdsController = TikTokAdsController = TikTokAdsController_1 = __decorate([
    (0, common_1.Controller)('tiktok-ads'),
    __metadata("design:paramtypes", [tiktok_ads_service_1.TikTokAdsService,
        config_1.ConfigService])
], TikTokAdsController);
//# sourceMappingURL=tiktok-ads.controller.js.map
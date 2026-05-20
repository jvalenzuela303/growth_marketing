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
var GoogleAdsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAdsController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_ads_service_1 = require("./google-ads.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let GoogleAdsController = GoogleAdsController_1 = class GoogleAdsController {
    constructor(googleAdsService, config) {
        this.googleAdsService = googleAdsService;
        this.config = config;
        this.logger = new common_1.Logger(GoogleAdsController_1.name);
    }
    initOAuth(tenantId, customerId, res) {
        if (!customerId) {
            throw new common_1.BadRequestException('El parámetro customerId es requerido.');
        }
        const state = `${tenantId}:${customerId}`;
        const url = this.googleAdsService.buildOAuthUrl(state);
        this.logger.log(`Iniciando OAuth Google Ads: tenant=${tenantId}, customer=${customerId}`);
        return res.redirect(302, url);
    }
    async oauthCallback(code, state, error, res) {
        const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:4000');
        const redirectBase = `${frontendUrl}/ads?tab=google`;
        if (error) {
            this.logger.warn(`Google Ads OAuth rechazado: ${error}`);
            return res.redirect(`${redirectBase}&g_error=${encodeURIComponent(error)}`);
        }
        if (!code || !state) {
            return res.redirect(`${redirectBase}&g_error=missing_params`);
        }
        const [tenantId, ...rest] = state.split(':');
        const customerId = rest.join(':');
        if (!tenantId || !customerId) {
            return res.redirect(`${redirectBase}&g_error=invalid_state`);
        }
        try {
            await this.googleAdsService.handleOAuthCallback(code, tenantId, customerId);
            this.logger.log(`Google Ads OAuth exitoso: tenant=${tenantId}, customer=${customerId}`);
            return res.redirect(`${redirectBase}&g_success=1&customer=${encodeURIComponent(customerId)}`);
        }
        catch (err) {
            this.logger.error(`Error en callback Google Ads: ${err.message}`);
            return res.redirect(`${redirectBase}&g_error=${encodeURIComponent(err.message)}`);
        }
    }
    async disconnect(tenantId, accountId) {
        await this.googleAdsService.disconnect(tenantId, accountId);
        return { success: true, message: 'Cuenta de Google Ads desconectada.' };
    }
    async getCampaigns(tenantId, customerId, daysStr, accountId) {
        if (!customerId) {
            throw new common_1.BadRequestException('El parámetro customerId es requerido (ej. 917-047-0641).');
        }
        const days = daysStr ? Math.min(Math.max(parseInt(daysStr, 10) || 30, 1), 365) : 30;
        return this.googleAdsService.getCampaigns(tenantId, customerId, accountId, days);
    }
};
exports.GoogleAdsController = GoogleAdsController;
__decorate([
    (0, common_1.Get)('oauth/init'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('customerId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], GoogleAdsController.prototype, "initOAuth", null);
__decorate([
    (0, common_1.Get)('oauth/callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('error')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], GoogleAdsController.prototype, "oauthCallback", null);
__decorate([
    (0, common_1.Delete)('oauth/:accountId/disconnect'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('accountId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], GoogleAdsController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Get)('campaigns'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('customerId')),
    __param(2, (0, common_1.Query)('days')),
    __param(3, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], GoogleAdsController.prototype, "getCampaigns", null);
exports.GoogleAdsController = GoogleAdsController = GoogleAdsController_1 = __decorate([
    (0, common_1.Controller)('google-ads'),
    __metadata("design:paramtypes", [google_ads_service_1.GoogleAdsService,
        config_1.ConfigService])
], GoogleAdsController);
//# sourceMappingURL=google-ads.controller.js.map
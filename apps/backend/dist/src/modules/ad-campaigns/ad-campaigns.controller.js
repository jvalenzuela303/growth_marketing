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
exports.AdCampaignsController = void 0;
const common_1 = require("@nestjs/common");
const ad_campaigns_service_1 = require("./ad-campaigns.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let AdCampaignsController = class AdCampaignsController {
    constructor(adCampaignsService) {
        this.adCampaignsService = adCampaignsService;
    }
    findAll(tenantId, accountId) {
        return this.adCampaignsService.findAll(tenantId, accountId);
    }
    syncCampaigns(tenantId) {
        return this.adCampaignsService.syncCampaigns(tenantId);
    }
    getMetrics(tenantId, id, range = '30d') {
        return this.adCampaignsService.getMetrics(tenantId, id, range);
    }
};
exports.AdCampaignsController = AdCampaignsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('accountId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdCampaignsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdCampaignsController.prototype, "syncCampaigns", null);
__decorate([
    (0, common_1.Get)(':id/metrics'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdCampaignsController.prototype, "getMetrics", null);
exports.AdCampaignsController = AdCampaignsController = __decorate([
    (0, common_1.Controller)('ad-campaigns'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ad_campaigns_service_1.AdCampaignsService])
], AdCampaignsController);
//# sourceMappingURL=ad-campaigns.controller.js.map
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
exports.AdAccountsController = void 0;
const common_1 = require("@nestjs/common");
const ad_accounts_service_1 = require("./ad-accounts.service");
const create_ad_account_dto_1 = require("./dto/create-ad-account.dto");
const update_ad_account_dto_1 = require("./dto/update-ad-account.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let AdAccountsController = class AdAccountsController {
    constructor(adAccountsService) {
        this.adAccountsService = adAccountsService;
    }
    findAll(tenantId) {
        return this.adAccountsService.findAll(tenantId);
    }
    findOne(tenantId, id) {
        return this.adAccountsService.findOne(tenantId, id);
    }
    create(tenantId, dto) {
        return this.adAccountsService.create(tenantId, dto);
    }
    update(tenantId, id, dto) {
        return this.adAccountsService.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.adAccountsService.remove(tenantId, id);
    }
    sync(tenantId, id) {
        return this.adAccountsService.syncAccount(tenantId, id);
    }
};
exports.AdAccountsController = AdAccountsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdAccountsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdAccountsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_ad_account_dto_1.CreateAdAccountDto]),
    __metadata("design:returntype", void 0)
], AdAccountsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_ad_account_dto_1.UpdateAdAccountDto]),
    __metadata("design:returntype", void 0)
], AdAccountsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdAccountsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/sync'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdAccountsController.prototype, "sync", null);
exports.AdAccountsController = AdAccountsController = __decorate([
    (0, common_1.Controller)('ad-accounts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ad_accounts_service_1.AdAccountsService])
], AdAccountsController);
//# sourceMappingURL=ad-accounts.controller.js.map
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
exports.FunnelsController = void 0;
const common_1 = require("@nestjs/common");
const funnels_service_1 = require("./funnels.service");
const create_funnel_dto_1 = require("./dto/create-funnel.dto");
const update_funnel_dto_1 = require("./dto/update-funnel.dto");
const create_variant_dto_1 = require("./dto/create-variant.dto");
const update_variant_dto_1 = require("./dto/update-variant.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let FunnelsController = class FunnelsController {
    constructor(funnelsService) {
        this.funnelsService = funnelsService;
    }
    getTemplates() {
        return this.funnelsService.getTemplates();
    }
    createFromTemplate(tenantId, user, body) {
        return this.funnelsService.createFromTemplate(tenantId, user.id, body.templateId, { name: body.name, slug: body.slug });
    }
    findAll(tenantId) {
        return this.funnelsService.findAll(tenantId);
    }
    create(tenantId, user, dto) {
        return this.funnelsService.create(tenantId, user.id, dto);
    }
    findOne(tenantId, id) {
        return this.funnelsService.findOne(tenantId, id);
    }
    update(tenantId, id, dto) {
        return this.funnelsService.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.funnelsService.remove(tenantId, id);
    }
    publish(tenantId, id) {
        return this.funnelsService.publish(tenantId, id);
    }
    getVariants(tenantId, funnelId) {
        return this.funnelsService.getVariants(tenantId, funnelId);
    }
    createVariant(tenantId, funnelId, dto) {
        return this.funnelsService.createVariant(tenantId, funnelId, dto);
    }
    updateVariant(tenantId, funnelId, variantId, dto) {
        return this.funnelsService.updateVariant(tenantId, funnelId, variantId, dto);
    }
    deleteVariant(tenantId, funnelId, variantId) {
        return this.funnelsService.deleteVariant(tenantId, funnelId, variantId);
    }
};
exports.FunnelsController = FunnelsController;
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Post)('from-template'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "createFromTemplate", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_funnel_dto_1.CreateFunnelDto]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_funnel_dto_1.UpdateFunnelDto]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "publish", null);
__decorate([
    (0, common_1.Get)(':funnelId/variants'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('funnelId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "getVariants", null);
__decorate([
    (0, common_1.Post)(':funnelId/variants'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('funnelId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_variant_dto_1.CreateVariantDto]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "createVariant", null);
__decorate([
    (0, common_1.Patch)(':funnelId/variants/:variantId'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('funnelId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('variantId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_variant_dto_1.UpdateVariantDto]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "updateVariant", null);
__decorate([
    (0, common_1.Delete)(':funnelId/variants/:variantId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('funnelId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('variantId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], FunnelsController.prototype, "deleteVariant", null);
exports.FunnelsController = FunnelsController = __decorate([
    (0, common_1.Controller)('funnels'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [funnels_service_1.FunnelsService])
], FunnelsController);
//# sourceMappingURL=funnels.controller.js.map
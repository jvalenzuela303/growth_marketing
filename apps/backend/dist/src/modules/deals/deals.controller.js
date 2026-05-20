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
exports.DealsController = void 0;
const common_1 = require("@nestjs/common");
const deals_service_1 = require("./deals.service");
const create_deal_dto_1 = require("./dto/create-deal.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let DealsController = class DealsController {
    constructor(dealsService) {
        this.dealsService = dealsService;
    }
    create(tenantId, user, dto) {
        return this.dealsService.create(tenantId, user.id, dto);
    }
    findAll(tenantId, stage, leadId, page, limit) {
        return this.dealsService.findAll(tenantId, {
            stage,
            leadId,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }
    findOne(tenantId, id) {
        return this.dealsService.findOne(tenantId, id);
    }
    update(tenantId, id, dto) {
        return this.dealsService.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.dealsService.remove(tenantId, id);
    }
    async exportCsv(tenantId, res, stage, leadId) {
        const csv = await this.dealsService.exportCsv(tenantId, { stage, leadId });
        const filename = `deals_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
    }
};
exports.DealsController = DealsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_deal_dto_1.CreateDealDto]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('stage')),
    __param(2, (0, common_1.Query)('leadId')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], DealsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('stage')),
    __param(3, (0, common_1.Query)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], DealsController.prototype, "exportCsv", null);
exports.DealsController = DealsController = __decorate([
    (0, common_1.Controller)('deals'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [deals_service_1.DealsService])
], DealsController);
//# sourceMappingURL=deals.controller.js.map
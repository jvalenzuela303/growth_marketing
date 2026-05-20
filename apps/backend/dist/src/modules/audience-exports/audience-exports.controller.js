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
exports.AudienceExportsController = void 0;
const common_1 = require("@nestjs/common");
const audience_exports_service_1 = require("./audience-exports.service");
const create_audience_export_dto_1 = require("./dto/create-audience-export.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let AudienceExportsController = class AudienceExportsController {
    constructor(audienceExportsService) {
        this.audienceExportsService = audienceExportsService;
    }
    findAll(tenantId) {
        return this.audienceExportsService.findAll(tenantId);
    }
    create(tenantId, dto) {
        return this.audienceExportsService.create(tenantId, dto.segment, dto.type);
    }
};
exports.AudienceExportsController = AudienceExportsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AudienceExportsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_audience_export_dto_1.CreateAudienceExportDto]),
    __metadata("design:returntype", void 0)
], AudienceExportsController.prototype, "create", null);
exports.AudienceExportsController = AudienceExportsController = __decorate([
    (0, common_1.Controller)('audience-exports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [audience_exports_service_1.AudienceExportsService])
], AudienceExportsController);
//# sourceMappingURL=audience-exports.controller.js.map
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
exports.AdSpendController = void 0;
const common_1 = require("@nestjs/common");
const ad_spend_service_1 = require("./ad-spend.service");
const ad_spend_dto_1 = require("./ad-spend.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let AdSpendController = class AdSpendController {
    constructor(adSpendService) {
        this.adSpendService = adSpendService;
    }
    findAll(tenantId, page = '1', limit = '20') {
        return this.adSpendService.findAll(tenantId, Math.max(1, Number(page)), Math.min(100, Math.max(1, Number(limit))));
    }
    create(tenantId, dto) {
        return this.adSpendService.create(tenantId, dto);
    }
};
exports.AdSpendController = AdSpendController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdSpendController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ad_spend_dto_1.CreateAdSpendDto]),
    __metadata("design:returntype", void 0)
], AdSpendController.prototype, "create", null);
exports.AdSpendController = AdSpendController = __decorate([
    (0, common_1.Controller)('ad-spend'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [ad_spend_service_1.AdSpendService])
], AdSpendController);
//# sourceMappingURL=ad-spend.controller.js.map
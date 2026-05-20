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
exports.SequencesController = void 0;
const common_1 = require("@nestjs/common");
const sequences_service_1 = require("./sequences.service");
const create_sequence_dto_1 = require("./dto/create-sequence.dto");
const update_sequence_dto_1 = require("./dto/update-sequence.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let SequencesController = class SequencesController {
    constructor(sequencesService) {
        this.sequencesService = sequencesService;
    }
    findAll(tenantId) {
        return this.sequencesService.findAll(tenantId);
    }
    create(tenantId, dto) {
        return this.sequencesService.create(tenantId, dto);
    }
    update(tenantId, id, dto) {
        return this.sequencesService.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.sequencesService.remove(tenantId, id);
    }
    toggle(tenantId, id) {
        return this.sequencesService.toggle(tenantId, id);
    }
};
exports.SequencesController = SequencesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SequencesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_sequence_dto_1.CreateSequenceDto]),
    __metadata("design:returntype", void 0)
], SequencesController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_sequence_dto_1.UpdateSequenceDto]),
    __metadata("design:returntype", void 0)
], SequencesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SequencesController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/toggle'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SequencesController.prototype, "toggle", null);
exports.SequencesController = SequencesController = __decorate([
    (0, common_1.Controller)('sequences'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sequences_service_1.SequencesService])
], SequencesController);
//# sourceMappingURL=sequences.controller.js.map
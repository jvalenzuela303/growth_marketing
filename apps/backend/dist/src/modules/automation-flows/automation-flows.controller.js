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
exports.AutomationFlowsController = void 0;
const common_1 = require("@nestjs/common");
const automation_flows_service_1 = require("./automation-flows.service");
const create_flow_dto_1 = require("./dto/create-flow.dto");
const update_flow_dto_1 = require("./dto/update-flow.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const plan_guard_1 = require("../../common/guards/plan.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let AutomationFlowsController = class AutomationFlowsController {
    constructor(service) {
        this.service = service;
    }
    findAll(tenantId) {
        return this.service.findAll(tenantId);
    }
    create(tenantId, user, dto) {
        return this.service.create(tenantId, user.id, dto);
    }
    findOne(tenantId, id) {
        return this.service.findOne(tenantId, id);
    }
    update(tenantId, id, dto) {
        return this.service.update(tenantId, id, dto);
    }
    remove(tenantId, id) {
        return this.service.remove(tenantId, id);
    }
    activate(tenantId, id) {
        return this.service.activate(tenantId, id);
    }
    pause(tenantId, id) {
        return this.service.pause(tenantId, id);
    }
    run(tenantId, id, leadId) {
        return this.service.run(tenantId, id, leadId);
    }
    getRuns(tenantId, id) {
        return this.service.getRuns(tenantId, id);
    }
};
exports.AutomationFlowsController = AutomationFlowsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_flow_dto_1.CreateFlowDto]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_flow_dto_1.UpdateFlowDto]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/pause'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)(':id/run'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('leadId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "run", null);
__decorate([
    (0, common_1.Get)(':id/runs'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AutomationFlowsController.prototype, "getRuns", null);
exports.AutomationFlowsController = AutomationFlowsController = __decorate([
    (0, common_1.Controller)('automation-flows'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, plan_guard_1.PlanGuard),
    (0, plan_guard_1.RequiresPlan)('scale'),
    __metadata("design:paramtypes", [automation_flows_service_1.AutomationFlowsService])
], AutomationFlowsController);
//# sourceMappingURL=automation-flows.controller.js.map
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
exports.LeadsController = void 0;
const common_1 = require("@nestjs/common");
const leads_service_1 = require("./leads.service");
const capture_webhook_dto_1 = require("./dto/capture-webhook.dto");
const update_lead_dto_1 = require("./dto/update-lead.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const plan_guard_1 = require("../../common/guards/plan.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const plan_guard_2 = require("../../common/guards/plan.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let LeadsController = class LeadsController {
    constructor(leadsService) {
        this.leadsService = leadsService;
    }
    async captureFromWebhook(dto, req) {
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress;
        return this.leadsService.captureFromWebhook({ ...dto });
    }
    async findAll(tenantId, segment, pipelineStage, source, page, limit) {
        return this.leadsService.findAll(tenantId, {
            segment,
            pipelineStage,
            source,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
        });
    }
    async findOne(tenantId, id) {
        return this.leadsService.findOne(tenantId, id);
    }
    async update(tenantId, id, dto) {
        return this.leadsService.update(tenantId, id, dto);
    }
    async remove(tenantId, id) {
        return this.leadsService.softDelete(tenantId, id);
    }
    async getScore(tenantId, id) {
        return this.leadsService.getScore(tenantId, id);
    }
    async getPrediction(tenantId, id) {
        return this.leadsService.getPrediction(tenantId, id);
    }
    async exportCsv(tenantId, res, segment, pipelineStage, source) {
        const csv = await this.leadsService.exportCsv(tenantId, { segment, pipelineStage, source });
        const filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csv);
    }
    async getReport(tenantId, id, res) {
        const html = await this.leadsService.generateReport(tenantId, id);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    }
};
exports.LeadsController = LeadsController;
__decorate([
    (0, common_1.Post)('capture'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [capture_webhook_dto_1.CaptureWebhookDto, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "captureFromWebhook", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('segment')),
    __param(2, (0, common_1.Query)('pipelineStage')),
    __param(3, (0, common_1.Query)('source')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_lead_dto_1.UpdateLeadDto]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/score'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getScore", null);
__decorate([
    (0, common_1.Get)(':id/prediction'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getPrediction", null);
__decorate([
    (0, common_1.Get)('export/csv'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard, plan_guard_1.PlanGuard),
    (0, roles_decorator_1.Roles)('admin'),
    (0, plan_guard_2.RequiresPlan)('growth'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('segment')),
    __param(3, (0, common_1.Query)('pipelineStage')),
    __param(4, (0, common_1.Query)('source')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "exportCsv", null);
__decorate([
    (0, common_1.Get)(':id/report'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], LeadsController.prototype, "getReport", null);
exports.LeadsController = LeadsController = __decorate([
    (0, common_1.Controller)('leads'),
    __metadata("design:paramtypes", [leads_service_1.LeadsService])
], LeadsController);
//# sourceMappingURL=leads.controller.js.map
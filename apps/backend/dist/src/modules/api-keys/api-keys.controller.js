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
exports.ApiKeysController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const api_keys_service_1 = require("./api-keys.service");
const create_api_key_dto_1 = require("./dto/create-api-key.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let ApiKeysController = class ApiKeysController {
    constructor(service) {
        this.service = service;
    }
    findAll(tenantId) {
        return this.service.findAll(tenantId);
    }
    create(tenantId, user, dto) {
        return this.service.create(tenantId, user.id, dto);
    }
    revoke(tenantId, id) {
        return this.service.revoke(tenantId, id);
    }
};
exports.ApiKeysController = ApiKeysController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Listar API keys del tenant' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Lista de API keys activas' }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Crear nueva API key', description: 'El raw key se muestra una sola vez.' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'API key creada. Guarda el valor de "key" — no se vuelve a mostrar.' }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, tenant_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, create_api_key_dto_1.CreateApiKeyDto]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revocar API key' }),
    (0, swagger_1.ApiOkResponse)({ description: 'API key revocada' }),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ApiKeysController.prototype, "revoke", null);
exports.ApiKeysController = ApiKeysController = __decorate([
    (0, swagger_1.ApiTags)('api-keys'),
    (0, swagger_1.ApiBearerAuth)('JWT'),
    (0, common_1.Controller)('api-keys'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [api_keys_service_1.ApiKeysService])
], ApiKeysController);
//# sourceMappingURL=api-keys.controller.js.map
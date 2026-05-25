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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_dto_1 = require("./dto/refresh.dto");
const request_access_dto_1 = require("./dto/request-access.dto");
const support_request_dto_1 = require("./dto/support-request.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const mail_notifier_service_1 = require("../../common/mail/mail-notifier.service");
const NOTIFY_EMAIL = 'soporte@growthengine.io';
let AuthController = AuthController_1 = class AuthController {
    constructor(authService, mail) {
        this.authService = authService;
        this.mail = mail;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async register(dto) {
        const result = await this.authService.register(dto);
        return {
            message: 'Cuenta creada exitosamente.',
            userId: result.userId,
            tenantId: result.tenantId,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
        };
    }
    async login(dto) {
        const result = await this.authService.login(dto);
        return {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
            userId: result.userId,
            tenantId: result.tenantId,
            email: result.email,
            name: result.name,
            role: result.role,
            plan: result.plan,
            tenantSlug: result.tenantSlug,
            tenantName: result.tenantName,
        };
    }
    async refresh(dto) {
        const tokens = await this.authService.refresh(dto.userId, dto.refreshToken);
        return tokens;
    }
    async requestAccess(dto) {
        this.logger.log(`Solicitud de acceso: ${dto.name} | ${dto.company} | ${dto.email} | plan: ${dto.plan ?? 'no especificado'}`);
        this.mail.send({
            to: NOTIFY_EMAIL,
            replyTo: dto.email,
            subject: `[Acceso] ${dto.name} — ${dto.company}`,
            html: `
        <h2>Nueva solicitud de acceso</h2>
        <table cellpadding="6">
          <tr><td><b>Nombre</b></td><td>${dto.name}</td></tr>
          <tr><td><b>Empresa</b></td><td>${dto.company}</td></tr>
          <tr><td><b>Email</b></td><td>${dto.email}</td></tr>
          <tr><td><b>Teléfono</b></td><td>${dto.phone ?? '—'}</td></tr>
          <tr><td><b>Plan</b></td><td>${dto.plan ?? 'no especificado'}</td></tr>
        </table>
      `,
        }).catch(() => { });
        return {
            message: 'Solicitud recibida. Nuestro equipo se pondrá en contacto contigo pronto.',
            received: true,
        };
    }
    async support(dto) {
        this.logger.log(`Solicitud soporte: ${dto.email} | ${dto.issue}`);
        await this.mail.send({
            to: NOTIFY_EMAIL,
            replyTo: dto.email,
            subject: `[Soporte] ${dto.issue}`,
            html: `
        <h2>Solicitud de soporte</h2>
        <table cellpadding="6">
          <tr><td><b>Email</b></td><td>${dto.email}</td></tr>
          <tr><td><b>Problema</b></td><td>${dto.issue}</td></tr>
          <tr><td><b>Descripción</b></td><td>${dto.message ?? '—'}</td></tr>
        </table>
      `,
        });
        return {
            message: 'Tu solicitud fue recibida. Te contactaremos a la brevedad.',
            received: true,
        };
    }
    async logout(user, body) {
        await this.authService.logout(user.id, body.refreshToken);
        return { message: 'Sesión cerrada.' };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('request-access'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [request_access_dto_1.RequestAccessDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestAccess", null);
__decorate([
    (0, common_1.Post)('support'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [support_request_dto_1.SupportRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "support", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        mail_notifier_service_1.MailNotifierService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map
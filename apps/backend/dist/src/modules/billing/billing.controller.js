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
exports.BillingController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const billing_service_1 = require("./billing.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
class CreateCheckoutDto {
}
__decorate([
    (0, class_validator_1.IsIn)(['growth', 'scale', 'agency']),
    __metadata("design:type", String)
], CreateCheckoutDto.prototype, "plan", void 0);
class StartEnrollmentDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StartEnrollmentDto.prototype, "returnUrl", void 0);
class ConfirmEnrollmentDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConfirmEnrollmentDto.prototype, "sessionToken", void 0);
let BillingController = class BillingController {
    constructor(billingService) {
        this.billingService = billingService;
    }
    createCheckout(tenantId, dto) {
        return this.billingService.createCheckoutSession(tenantId, dto.plan);
    }
    createPortal(tenantId) {
        return this.billingService.createPortalSession(tenantId);
    }
    getSubscription(tenantId) {
        return this.billingService.getSubscription(tenantId);
    }
    getInvoices(tenantId) {
        return this.billingService.getInvoices(tenantId);
    }
    getPaymentMethods(tenantId) {
        return this.billingService.getPaymentMethods(tenantId);
    }
    startEnrollment(tenantId, dto) {
        return this.billingService.startEnrollment(tenantId, dto.returnUrl);
    }
    confirmEnrollment(tenantId, dto) {
        return this.billingService.confirmEnrollment(tenantId, dto.sessionToken);
    }
    detachPaymentMethod(tenantId, cardId) {
        return this.billingService.detachPaymentMethod(tenantId, cardId);
    }
    handleWebhook(req, sig) {
        const rawBody = req.rawBody ?? Buffer.from('');
        return this.billingService.handleWebhook(rawBody, sig);
    }
};
exports.BillingController = BillingController;
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateCheckoutDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Post)('portal'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "createPortal", null);
__decorate([
    (0, common_1.Get)('subscription'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getSubscription", null);
__decorate([
    (0, common_1.Get)('invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('payment-methods'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "getPaymentMethods", null);
__decorate([
    (0, common_1.Post)('payment-methods/enroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, StartEnrollmentDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "startEnrollment", null);
__decorate([
    (0, common_1.Post)('payment-methods/enroll/confirm'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ConfirmEnrollmentDto]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "confirmEnrollment", null);
__decorate([
    (0, common_1.Delete)('payment-methods/:cardId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('cardId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "detachPaymentMethod", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], BillingController.prototype, "handleWebhook", null);
exports.BillingController = BillingController = __decorate([
    (0, common_1.Controller)('billing'),
    __metadata("design:paramtypes", [billing_service_1.BillingService])
], BillingController);
//# sourceMappingURL=billing.controller.js.map
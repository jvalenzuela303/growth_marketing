"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.TenantId = void 0;
const common_1 = require("@nestjs/common");
exports.TenantId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
});
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return {
        id: request.userId,
        role: request.userRole,
        plan: request.userPlan,
        tenantId: request.tenantId,
    };
});
//# sourceMappingURL=tenant.decorator.js.map
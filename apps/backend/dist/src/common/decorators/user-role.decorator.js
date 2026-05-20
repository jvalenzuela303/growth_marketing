"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = void 0;
const common_1 = require("@nestjs/common");
exports.UserRole = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.userRole ?? 'member';
});
//# sourceMappingURL=user-role.decorator.js.map
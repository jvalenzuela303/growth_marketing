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
var AuditMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditMiddleware = void 0;
const common_1 = require("@nestjs/common");
const audit_service_1 = require("../../modules/audit/audit.service");
const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
function extractResource(url) {
    const match = url.match(/\/api\/v1\/([^/?]+)(?:\/([^/?]+))?/);
    if (!match)
        return null;
    const segment = match[1];
    const maybeId = match[2];
    const resourceId = maybeId && /^[0-9a-f-]{36}$/.test(maybeId) ? maybeId : undefined;
    const resourceMap = {
        'leads': 'lead',
        'deals': 'deal',
        'funnels': 'funnel',
        'users': 'user',
        'automation-flows': 'automation_flow',
        'api-keys': 'api_key',
        'sequences': 'sequence',
        'ads-accounts': 'ads_account',
        'conversations': 'conversation',
        'settings': 'settings',
    };
    const resource = resourceMap[segment];
    return resource ? { resource, resourceId } : null;
}
function methodToAction(method) {
    if (method === 'POST')
        return 'create';
    if (method === 'DELETE')
        return 'delete';
    return 'update';
}
let AuditMiddleware = AuditMiddleware_1 = class AuditMiddleware {
    constructor(audit) {
        this.audit = audit;
        this.logger = new common_1.Logger(AuditMiddleware_1.name);
    }
    use(req, res, next) {
        if (!AUDIT_METHODS.has(req.method)) {
            next();
            return;
        }
        const info = extractResource(req.url);
        if (!info) {
            next();
            return;
        }
        if (req.url.includes('/auth/') || req.url.includes('/webhooks/') || req.url.includes('/quiz/')) {
            next();
            return;
        }
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
        const userAgent = req.headers['user-agent'];
        res.on('finish', () => {
            const status = res.statusCode < 400 ? 'success' : 'failure';
            this.audit.log({
                tenantId: req.tenantId ?? 'unknown',
                userId: req.userId ?? null,
                action: methodToAction(req.method),
                resource: info.resource,
                resourceId: info.resourceId ?? null,
                ipAddress: ip,
                userAgent,
                status,
                reason: status === 'failure' ? `HTTP ${res.statusCode}` : null,
            });
        });
        next();
    }
};
exports.AuditMiddleware = AuditMiddleware;
exports.AuditMiddleware = AuditMiddleware = AuditMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditMiddleware);
//# sourceMappingURL=audit.middleware.js.map
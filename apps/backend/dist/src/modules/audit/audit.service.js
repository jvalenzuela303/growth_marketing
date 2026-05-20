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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    log(entry) {
        this.persist(entry).catch((err) => {
            this.logger.error(`Audit log failed: ${String(err)}`);
        });
    }
    async logAsync(entry) {
        await this.persist(entry);
    }
    async persist(entry) {
        await this.prisma.auditLog.create({
            data: {
                tenantId: entry.tenantId,
                userId: entry.userId ?? null,
                action: entry.action,
                resource: entry.resource,
                resourceId: entry.resourceId ?? null,
                changes: entry.changes ?? {},
                ipAddress: entry.ipAddress ?? null,
                userAgent: entry.userAgent ?? null,
                status: entry.status ?? 'success',
                reason: entry.reason ?? null,
            },
        });
    }
    async findAll(tenantId, params = {}) {
        const { resource, userId, action, from, to, page = 1, limit = 50 } = params;
        const skip = (page - 1) * limit;
        const where = {
            tenantId,
            ...(resource && { resource }),
            ...(userId && { userId }),
            ...(action && { action }),
            ...(from || to ? {
                createdAt: {
                    ...(from && { gte: from }),
                    ...(to && { lte: to }),
                },
            } : {}),
        };
        const [logs, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.auditLog.count({ where }),
        ]);
        return {
            data: logs,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map
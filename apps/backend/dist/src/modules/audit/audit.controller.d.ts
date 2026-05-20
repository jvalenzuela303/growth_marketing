import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getLogs(tenantId: string, role: string, resource?: string, userId?: string, action?: string, from?: string, to?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            status: string;
            action: string;
            resource: string;
            resourceId: string | null;
            changes: import("@prisma/client/runtime/library").JsonValue;
            reason: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
}

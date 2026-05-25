import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly auditService;
    constructor(auditService: AuditService);
    getLogs(tenantId: string, resource?: string, userId?: string, action?: string, from?: string, to?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            createdAt: Date;
            tenantId: string;
            userId: string | null;
            ipAddress: string | null;
            userAgent: string | null;
            status: string;
            reason: string | null;
            action: string;
            resource: string;
            resourceId: string | null;
            changes: import("@prisma/client/runtime/library").JsonValue;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
}

import { PrismaService } from '../../database/prisma.service';
export interface AuditLogEntry {
    tenantId: string;
    userId?: string | null;
    action: 'create' | 'update' | 'delete' | 'read' | 'login' | 'export' | 'login_failed';
    resource: string;
    resourceId?: string | null;
    changes?: {
        before?: Record<string, unknown>;
        after?: Record<string, unknown>;
    };
    ipAddress?: string | null;
    userAgent?: string | null;
    status?: 'success' | 'failure';
    reason?: string | null;
}
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    log(entry: AuditLogEntry): void;
    logAsync(entry: AuditLogEntry): Promise<void>;
    private persist;
    findAll(tenantId: string, params?: {
        resource?: string;
        userId?: string;
        action?: string;
        from?: Date;
        to?: Date;
        page?: number;
        limit?: number;
    }): Promise<{
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

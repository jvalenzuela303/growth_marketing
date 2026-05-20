import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditLogEntry {
  tenantId:   string
  userId?:    string | null
  action:     'create' | 'update' | 'delete' | 'read' | 'login' | 'export' | 'login_failed'
  resource:   string
  resourceId?: string | null
  changes?:   { before?: Record<string, unknown>; after?: Record<string, unknown> }
  ipAddress?: string | null
  userAgent?: string | null
  status?:    'success' | 'failure'
  reason?:    string | null
}

/**
 * AuditService — immutable audit trail for SOC 2 / GDPR compliance.
 *
 * Usage: fire-and-forget from controllers/services. Never throws.
 *
 * Example:
 *   this.audit.log({ tenantId, userId, action: 'delete', resource: 'lead', resourceId: lead.id })
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append an audit log entry. Non-blocking — errors are swallowed to
   * prevent audit failures from blocking the primary operation.
   */
  log(entry: AuditLogEntry): void {
    this.persist(entry).catch((err: unknown) => {
      this.logger.error(`Audit log failed: ${String(err)}`);
    });
  }

  /**
   * Await version for cases where the caller needs confirmation.
   */
  async logAsync(entry: AuditLogEntry): Promise<void> {
    await this.persist(entry);
  }

  private async persist(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId:   entry.tenantId,
        userId:     entry.userId ?? null,
        action:     entry.action,
        resource:   entry.resource,
        resourceId: entry.resourceId ?? null,
        changes:    (entry.changes as any) ?? {},
        ipAddress:  entry.ipAddress ?? null,
        userAgent:  entry.userAgent ?? null,
        status:     entry.status ?? 'success',
        reason:     entry.reason ?? null,
      },
    });
  }

  // ── Queries (admin only) ───────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    params: {
      resource?: string
      userId?:   string
      action?:   string
      from?:     Date
      to?:       Date
      page?:     number
      limit?:    number
    } = {},
  ) {
    const { resource, userId, action, from, to, page = 1, limit = 50 } = params;
    const skip  = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(resource && { resource }),
      ...(userId   && { userId   }),
      ...(action   && { action   }),
      ...(from || to ? {
        createdAt: {
          ...(from && { gte: from }),
          ...(to   && { lte: to   }),
        },
      } : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }
}

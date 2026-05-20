import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../../modules/audit/audit.service';

const AUDIT_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Routes that map to audit resource names
function extractResource(url: string): { resource: string; resourceId?: string } | null {
  // /api/v1/<resource>[/<id>][/sub-resource]
  const match = url.match(/\/api\/v1\/([^/?]+)(?:\/([^/?]+))?/);
  if (!match) return null;

  const segment    = match[1];
  const maybeId    = match[2];
  const resourceId = maybeId && /^[0-9a-f-]{36}$/.test(maybeId) ? maybeId : undefined;

  const resourceMap: Record<string, string> = {
    'leads':            'lead',
    'deals':            'deal',
    'funnels':          'funnel',
    'users':            'user',
    'automation-flows': 'automation_flow',
    'api-keys':         'api_key',
    'sequences':        'sequence',
    'ads-accounts':     'ads_account',
    'conversations':    'conversation',
    'settings':         'settings',
  };

  const resource = resourceMap[segment];
  return resource ? { resource, resourceId } : null;
}

function methodToAction(method: string): 'create' | 'update' | 'delete' {
  if (method === 'POST')   return 'create';
  if (method === 'DELETE') return 'delete';
  return 'update';
}

/**
 * AuditMiddleware — logs all mutating HTTP requests to the audit trail.
 *
 * Attached to /api/v1/* paths, skips non-auditable routes (analytics, webhooks, auth).
 * Fires after response completes so the status code is available.
 */
@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  constructor(private readonly audit: AuditService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (!AUDIT_METHODS.has(req.method)) { next(); return; }

    const info = extractResource(req.url);
    if (!info) { next(); return; }

    // Skip auth and webhook routes — too noisy / not meaningful
    if (req.url.includes('/auth/') || req.url.includes('/webhooks/') || req.url.includes('/quiz/')) {
      next(); return;
    }

    const ip        = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    res.on('finish', () => {
      const status = res.statusCode < 400 ? 'success' : 'failure';
      this.audit.log({
        tenantId:   (req as any).tenantId ?? 'unknown',
        userId:     (req as any).userId   ?? null,
        action:     methodToAction(req.method),
        resource:   info.resource,
        resourceId: info.resourceId ?? null,
        ipAddress:  ip,
        userAgent,
        status,
        reason:     status === 'failure' ? `HTTP ${res.statusCode}` : null,
      });
    });

    next();
  }
}

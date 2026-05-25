import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { AuditService } from './audit.service';

/**
 * GET /api/v1/audit/logs — Audit trail (owner/admin only).
 * Role enforcement is delegated to RolesGuard; the manual check has been removed.
 */
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @TenantId()  tenantId: string,
    @Query('resource') resource?: string,
    @Query('userId')   userId?:   string,
    @Query('action')   action?:   string,
    @Query('from')     from?:     string,
    @Query('to')       to?:       string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    return this.auditService.findAll(tenantId, {
      resource,
      userId,
      action,
      from:  from  ? new Date(from)  : undefined,
      to:    to    ? new Date(to)    : undefined,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}

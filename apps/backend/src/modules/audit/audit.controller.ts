import {
  Controller,
  Get,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { AuditService } from './audit.service';
import { UserId } from '../../common/decorators/user-id.decorator';
import { UserRole } from '../../common/decorators/user-role.decorator';

/**
 * GET /api/v1/audit/logs — Audit trail (owner/admin only).
 */
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @TenantId()  tenantId: string,
    @UserRole()  role:     string,
    @Query('resource') resource?: string,
    @Query('userId')   userId?:   string,
    @Query('action')   action?:   string,
    @Query('from')     from?:     string,
    @Query('to')       to?:       string,
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
  ) {
    if (role !== 'owner' && role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden ver los logs de auditoría.');
    }

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

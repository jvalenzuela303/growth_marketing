import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService, PushSubscriptionDto } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /**
   * POST /api/v1/notifications/push-subscribe
   * Registra o actualiza una suscripción Web Push para el usuario autenticado.
   */
  @Post('push-subscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar suscripción Web Push' })
  async subscribe(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: PushSubscriptionDto,
  ) {
    await this.service.saveSubscription(tenantId, user.id, dto);
    return { ok: true };
  }
}

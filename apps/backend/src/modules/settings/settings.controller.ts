import {
  Controller,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/v1/settings
   * Returns current tenant settings with sensitive fields masked.
   * Token/key values show only last 4 chars so the frontend can indicate
   * "configured" vs "not configured" without exposing credentials.
   *
   * curl -H "Authorization: Bearer <token>" \
   *      http://localhost:3001/api/v1/settings
   */
  @Get()
  getSettings(@TenantId() tenantId: string) {
    return this.settingsService.getSettings(tenantId);
  }

  /**
   * PATCH /api/v1/settings
   * Partial update of tenant settings. Send only the fields to change.
   * Returns the updated settings object with masked credentials.
   *
   * curl -X PATCH http://localhost:3001/api/v1/settings \
   *   -H "Authorization: Bearer <token>" \
   *   -H "Content-Type: application/json" \
   *   -d '{"metaPixelId":"1234567890","sendgridApiKey":"SG.xxxx","alertEmail":"ops@acme.com"}'
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  updateSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(tenantId, dto);
  }
}

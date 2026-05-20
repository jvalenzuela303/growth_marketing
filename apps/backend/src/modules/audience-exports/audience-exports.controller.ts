import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AudienceExportsService } from './audience-exports.service';
import { CreateAudienceExportDto } from './dto/create-audience-export.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('audience-exports')
@UseGuards(JwtAuthGuard)
export class AudienceExportsController {
  constructor(private readonly audienceExportsService: AudienceExportsService) {}

  /**
   * GET /api/v1/audience-exports
   */
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.audienceExportsService.findAll(tenantId);
  }

  /**
   * POST /api/v1/audience-exports
   * Crea una exportación de audiencia y la sincroniza con Meta (simulado).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAudienceExportDto,
  ) {
    return this.audienceExportsService.create(tenantId, dto.segment, dto.type);
  }
}

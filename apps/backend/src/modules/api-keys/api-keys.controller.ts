import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@ApiTags('api-keys')
@ApiBearerAuth('JWT')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  /**
   * GET /api/v1/api-keys
   * List all active API keys (prefixes only, no raw key).
   */
  @Get()
  @ApiOperation({ summary: 'Listar API keys del tenant' })
  @ApiOkResponse({ description: 'Lista de API keys activas' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  /**
   * POST /api/v1/api-keys
   * Create a new API key. Returns the raw key ONCE.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear nueva API key', description: 'El raw key se muestra una sola vez.' })
  @ApiCreatedResponse({ description: 'API key creada. Guarda el valor de "key" — no se vuelve a mostrar.' })
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.service.create(tenantId, user.id, dto);
  }

  /**
   * DELETE /api/v1/api-keys/:id
   * Revoke an API key permanently.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar API key' })
  @ApiOkResponse({ description: 'API key revocada' })
  revoke(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.revoke(tenantId, id);
  }
}

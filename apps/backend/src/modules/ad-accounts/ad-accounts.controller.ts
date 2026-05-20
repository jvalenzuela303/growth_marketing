import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdAccountsService } from './ad-accounts.service';
import { CreateAdAccountDto } from './dto/create-ad-account.dto';
import { UpdateAdAccountDto } from './dto/update-ad-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('ad-accounts')
@UseGuards(JwtAuthGuard)
export class AdAccountsController {
  constructor(private readonly adAccountsService: AdAccountsService) {}

  /**
   * GET /api/v1/ad-accounts
   * Lista todas las cuentas de ads del tenant.
   */
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.adAccountsService.findAll(tenantId);
  }

  /**
   * GET /api/v1/ad-accounts/:id
   */
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adAccountsService.findOne(tenantId, id);
  }

  /**
   * POST /api/v1/ad-accounts
   * Conecta una nueva cuenta de ads.
   */
  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAdAccountDto,
  ) {
    return this.adAccountsService.create(tenantId, dto);
  }

  /**
   * PATCH /api/v1/ad-accounts/:id
   * Actualiza nombre, token, estado o la marca de cuenta default.
   */
  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdAccountDto,
  ) {
    return this.adAccountsService.update(tenantId, id, dto);
  }

  /**
   * DELETE /api/v1/ad-accounts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adAccountsService.remove(tenantId, id);
  }

  /**
   * POST /api/v1/ad-accounts/:id/sync
   * Sincroniza campañas de esta cuenta desde la plataforma.
   */
  @Post(':id/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  sync(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adAccountsService.syncAccount(tenantId, id);
  }
}

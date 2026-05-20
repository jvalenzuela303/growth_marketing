import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  /**
   * POST /api/v1/deals
   * Registra un cierre de venta (deal) ligado a un lead.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateDealDto,
  ) {
    return this.dealsService.create(tenantId, user.id, dto);
  }

  /**
   * GET /api/v1/deals?stage=won&page=1&limit=20
   */
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('stage')   stage?:  string,
    @Query('leadId')  leadId?: string,
    @Query('page')    page?:   string,
    @Query('limit')   limit?:  string,
  ) {
    return this.dealsService.findAll(tenantId, {
      stage,
      leadId,
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * GET /api/v1/deals/:id
   */
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dealsService.findOne(tenantId, id);
  }

  /**
   * PATCH /api/v1/deals/:id
   */
  @Patch(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateDealDto>,
  ) {
    return this.dealsService.update(tenantId, id, dto);
  }

  /**
   * DELETE /api/v1/deals/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.dealsService.remove(tenantId, id);
  }

  /**
   * GET /api/v1/deals/export/csv?stage=won
   * Descarga deals en CSV (máx 10,000 filas).
   */
  @Get('export/csv')
  async exportCsv(
    @TenantId() tenantId: string,
    @Res() res: Response,
    @Query('stage')  stage?:  string,
    @Query('leadId') leadId?: string,
  ) {
    const csv      = await this.dealsService.exportCsv(tenantId, { stage, leadId });
    const filename = `deals_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  }
}

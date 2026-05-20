import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'express';
import { LeadsService } from './leads.service';
import { CaptureWebhookDto } from './dto/capture-webhook.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * POST /api/v1/leads/capture
   * Endpoint público para recibir leads desde Meta Ads, n8n o integraciones externas.
   * No requiere autenticación JWT pero sí un tenantId válido en el body.
   * La validación de origen se hace a nivel de webhook secret en WebhooksModule.
   *
   * curl -X POST http://localhost:3001/api/v1/leads/capture \
   *   -H "Content-Type: application/json" \
   *   -d '{"tenantId":"uuid","funnelId":"uuid","email":"lead@example.com","source":"meta_ads"}'
   */
  @Post('capture')
  @HttpCode(HttpStatus.CREATED)
  async captureFromWebhook(@Body() dto: CaptureWebhookDto, @Req() req: Request) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket?.remoteAddress;
    return this.leadsService.captureFromWebhook({ ...dto });
  }

  /**
   * GET /api/v1/leads?segment=fuego&pipelineStage=nuevo&page=1&limit=20
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @TenantId() tenantId: string,
    @Query('segment') segment?: string,
    @Query('pipelineStage') pipelineStage?: string,
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.findAll(tenantId, {
      segment,
      pipelineStage,
      source,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    });
  }

  /**
   * GET /api/v1/leads/:id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.findOne(tenantId, id);
  }

  /**
   * PATCH /api/v1/leads/:id
   * Actualiza stage, asignación y notas. Los scores solo los actualiza el AI Engine.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(tenantId, id, dto);
  }

  /**
   * GET /api/v1/leads/:id/score
   * Devuelve el score detallado y la clasificación del lead.
   */
  @Get(':id/score')
  @UseGuards(JwtAuthGuard)
  async getScore(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.getScore(tenantId, id);
  }

  /**
   * GET /api/v1/leads/:id/prediction
   * Returns the ML-predicted conversion probability for a lead.
   */
  @Get(':id/prediction')
  @UseGuards(JwtAuthGuard)
  async getPrediction(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leadsService.getPrediction(tenantId, id);
  }

  /**
   * GET /api/v1/leads/export/csv?segment=fuego&pipelineStage=nuevo&source=meta_ads
   * Descarga todos los leads en formato CSV (máx 10,000 filas).
   */
  @Get('export/csv')
  @UseGuards(JwtAuthGuard)
  async exportCsv(
    @TenantId() tenantId: string,
    @Res() res: Response,
    @Query('segment')       segment?:       string,
    @Query('pipelineStage') pipelineStage?: string,
    @Query('source')        source?:        string,
  ) {
    const csv      = await this.leadsService.exportCsv(tenantId, { segment, pipelineStage, source });
    const filename = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 detection
  }

  /**
   * GET /api/v1/leads/:id/report
   * Returns a print-optimized HTML Lead Intelligence Report.
   * Open in new tab → Ctrl+P → Save as PDF.
   */
  @Get(':id/report')
  @UseGuards(JwtAuthGuard)
  async getReport(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const html = await this.leadsService.generateReport(tenantId, id);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}

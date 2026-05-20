import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FunnelsService } from './funnels.service';
import { CreateFunnelDto } from './dto/create-funnel.dto';
import { UpdateFunnelDto } from './dto/update-funnel.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

@Controller('funnels')
@UseGuards(JwtAuthGuard)
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  /**
   * GET /api/v1/funnels/templates
   * Returns static industry templates (no auth required beyond JWT).
   * Must be declared before :id to avoid route collision.
   */
  @Get('templates')
  getTemplates() {
    return this.funnelsService.getTemplates();
  }

  /**
   * POST /api/v1/funnels/from-template
   * Creates a draft funnel pre-seeded from a named template.
   */
  @Post('from-template')
  createFromTemplate(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { templateId: string; name?: string; slug?: string },
  ) {
    return this.funnelsService.createFromTemplate(
      tenantId,
      user.id,
      body.templateId,
      { name: body.name, slug: body.slug },
    );
  }

  /**
   * GET /api/v1/funnels
   */
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.funnelsService.findAll(tenantId);
  }

  /**
   * POST /api/v1/funnels
   */
  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFunnelDto,
  ) {
    return this.funnelsService.create(tenantId, user.id, dto);
  }

  /**
   * GET /api/v1/funnels/:id
   */
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.funnelsService.findOne(tenantId, id);
  }

  /**
   * PUT /api/v1/funnels/:id
   */
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFunnelDto,
  ) {
    return this.funnelsService.update(tenantId, id, dto);
  }

  /**
   * DELETE /api/v1/funnels/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.funnelsService.remove(tenantId, id);
  }

  /**
   * POST /api/v1/funnels/:id/publish
   * Valida que el funnel tenga preguntas y lo activa.
   */
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  publish(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.funnelsService.publish(tenantId, id);
  }

  // ─── A/B Testing: Variants ───────────────────────────────────────────────

  /**
   * GET /api/v1/funnels/:funnelId/variants
   */
  @Get(':funnelId/variants')
  getVariants(
    @TenantId() tenantId: string,
    @Param('funnelId', ParseUUIDPipe) funnelId: string,
  ) {
    return this.funnelsService.getVariants(tenantId, funnelId);
  }

  /**
   * POST /api/v1/funnels/:funnelId/variants
   * Si es la primera variante, auto-crea la variante de control.
   */
  @Post(':funnelId/variants')
  @HttpCode(HttpStatus.CREATED)
  createVariant(
    @TenantId() tenantId: string,
    @Param('funnelId', ParseUUIDPipe) funnelId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.funnelsService.createVariant(tenantId, funnelId, dto);
  }

  /**
   * PATCH /api/v1/funnels/:funnelId/variants/:variantId
   */
  @Patch(':funnelId/variants/:variantId')
  updateVariant(
    @TenantId() tenantId: string,
    @Param('funnelId', ParseUUIDPipe) funnelId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.funnelsService.updateVariant(tenantId, funnelId, variantId, dto);
  }

  /**
   * DELETE /api/v1/funnels/:funnelId/variants/:variantId
   * No permite eliminar el control si existen otras variantes.
   */
  @Delete(':funnelId/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteVariant(
    @TenantId() tenantId: string,
    @Param('funnelId', ParseUUIDPipe) funnelId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
  ) {
    return this.funnelsService.deleteVariant(tenantId, funnelId, variantId);
  }
}

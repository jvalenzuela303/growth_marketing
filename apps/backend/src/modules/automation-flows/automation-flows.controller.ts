import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AutomationFlowsService } from './automation-flows.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { UpdateFlowDto } from './dto/update-flow.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlanGuard, RequiresPlan } from '../../common/guards/plan.guard';
import { TenantId, CurrentUser, CurrentUserPayload } from '../../common/decorators/tenant.decorator';

/**
 * All automation-flows routes require the 'scale' plan or above.
 * Automation is a scale-tier feature.
 */
@Controller('automation-flows')
@UseGuards(JwtAuthGuard, PlanGuard)
@RequiresPlan('scale')
export class AutomationFlowsController {
  constructor(private readonly service: AutomationFlowsService) {}

  /** GET /api/v1/automation-flows */
  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  /** POST /api/v1/automation-flows */
  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateFlowDto,
  ) {
    return this.service.create(tenantId, user.id, dto);
  }

  /** GET /api/v1/automation-flows/:id */
  @Get(':id')
  findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(tenantId, id);
  }

  /** PUT /api/v1/automation-flows/:id */
  @Put(':id')
  update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFlowDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  /** DELETE /api/v1/automation-flows/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenantId, id);
  }

  /** POST /api/v1/automation-flows/:id/activate */
  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  activate(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.activate(tenantId, id);
  }

  /** POST /api/v1/automation-flows/:id/pause */
  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  pause(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.pause(tenantId, id);
  }

  /** POST /api/v1/automation-flows/:id/run */
  @Post(':id/run')
  @HttpCode(HttpStatus.OK)
  run(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('leadId') leadId?: string,
  ) {
    return this.service.run(tenantId, id, leadId);
  }

  /** GET /api/v1/automation-flows/:id/runs */
  @Get(':id/runs')
  getRuns(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getRuns(tenantId, id);
  }
}

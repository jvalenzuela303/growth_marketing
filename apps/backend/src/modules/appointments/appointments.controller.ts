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
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * GET /api/v1/appointments?leadId=:id&status=scheduled
   */
  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('leadId') leadId?: string,
    @Query('status') status?: string,
  ) {
    return this.appointmentsService.findAll(tenantId, leadId, status);
  }

  /**
   * POST /api/v1/appointments
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(tenantId, dto);
  }

  /**
   * PATCH /api/v1/appointments/:id/status
   */
  @Patch(':id/status')
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(tenantId, id, dto);
  }
}

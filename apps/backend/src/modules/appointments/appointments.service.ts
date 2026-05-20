import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, leadId?: string, status?: string) {
    return this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.findMany({
        where: {
          tenantId,
          ...(leadId && { leadId }),
          ...(status && { status }),
        },
        orderBy: { scheduledAt: 'asc' },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              segment: true,
            },
          },
        },
      }),
    );
  }

  async create(tenantId: string, dto: CreateAppointmentDto) {
    // Verificar que el lead pertenece al tenant
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: dto.leadId, tenantId, deletedAt: null },
      }),
    );

    if (!lead) {
      throw new NotFoundException('Lead no encontrado o no pertenece a este tenant.');
    }

    const appointment = await this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.create({
        data: {
          tenantId,
          leadId: dto.leadId,
          scheduledAt: new Date(dto.scheduledAt),
          durationMins: dto.durationMins ?? 30,
          status: 'scheduled',
          channel: dto.channel ?? 'video_call',
          meetingUrl: dto.meetingUrl,
          notes: dto.notes,
        },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    );

    this.logger.log(`Appointment created: ${appointment.id} for lead ${dto.leadId} (tenant: ${tenantId})`);
    return appointment;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateAppointmentStatusDto) {
    if (!VALID_STATUSES.includes(dto.status)) {
      throw new BadRequestException(`Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`);
    }

    const appointment = await this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.findFirst({
        where: { id, tenantId },
      }),
    );

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada.');
    }

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.update({
        where: { id },
        data: { status: dto.status },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
    );
  }
}

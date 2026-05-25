import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { InjectQueue } from '../../queue/inject-queue.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

// Gap 1: reminder windows in ms
const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_2H_MS  =  2 * 60 * 60 * 1000;

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('messaging') private readonly messagingQueue: Queue,
  ) {}

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
              phone: true,
            },
          },
        },
      }),
    );

    this.logger.log(`Appointment created: ${appointment.id} for lead ${dto.leadId} (tenant: ${tenantId})`);

    // Gap 1: schedule reminder jobs before the appointment
    const reminderBase = {
      appointmentId: appointment.id,
      tenantId,
      leadId:        dto.leadId,
      phone:         appointment.lead?.phone  ?? undefined,
      email:         appointment.lead?.email  ?? undefined,
      firstName:     appointment.lead?.firstName ?? undefined,
      scheduledAt:   appointment.scheduledAt.toISOString(),
      meetingUrl:    appointment.meetingUrl ?? undefined,
    };

    const now          = Date.now();
    const appointmentMs = appointment.scheduledAt.getTime();

    const delay24h = appointmentMs - REMINDER_24H_MS - now;
    const delay2h  = appointmentMs - REMINDER_2H_MS  - now;

    if (delay24h > 0) {
      this.messagingQueue
        .add('appointment-reminder', { ...reminderBase, reminderType: '24h' }, { delay: delay24h, priority: 2 })
        .catch(() => {});
    }

    if (delay2h > 0) {
      this.messagingQueue
        .add('appointment-reminder', { ...reminderBase, reminderType: '2h' }, { delay: delay2h, priority: 1 })
        .catch(() => {});
    }

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

    const updated = await this.prisma.withTenant(tenantId, () =>
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
              phone: true,
            },
          },
        },
      }),
    );

    // Salud: trigger post-consultation follow-up when appointment is completed
    if (dto.status === 'completed' && appointment.status !== 'completed') {
      this.messagingQueue.add('followup-post-consultation', {
        appointmentId: id,
        tenantId,
        leadId:    updated.leadId,
        phone:     (updated.lead as any)?.phone  ?? undefined,
        email:     updated.lead?.email           ?? undefined,
        firstName: updated.lead?.firstName       ?? undefined,
      }, { delay: 2 * 60 * 60 * 1000, priority: 3 }).catch(() => {}); // 2h after consultation
    }

    return updated;
  }

  // ── Servicios: public self-service reschedule ─────────────────────────────

  async reschedule(tenantId: string, appointmentId: string, email: string, newDateStr: string) {
    const newDate = new Date(newDateStr);
    if (isNaN(newDate.getTime()) || newDate <= new Date()) {
      throw new BadRequestException('newDate debe ser una fecha futura válida.');
    }

    const appointment = await this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.findFirst({
        where: { id: appointmentId, tenantId, status: 'scheduled' },
        include: {
          lead: { select: { id: true, email: true, firstName: true, phone: true } },
        },
      }),
    );

    if (!appointment) throw new NotFoundException('Cita no encontrada o ya no está programada.');

    if (appointment.lead?.email?.toLowerCase() !== email.toLowerCase()) {
      throw new BadRequestException('El email no coincide con el de la cita.');
    }

    const updated = await this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.update({
        where: { id: appointmentId },
        data:  { scheduledAt: newDate },
      }),
    );

    // Schedule new reminder jobs for the updated time
    const now    = Date.now();
    const apptMs = newDate.getTime();
    const base   = {
      appointmentId,
      tenantId,
      leadId:     appointment.leadId,
      phone:      (appointment.lead as any)?.phone ?? undefined,
      email:      appointment.lead?.email          ?? undefined,
      firstName:  appointment.lead?.firstName      ?? undefined,
      scheduledAt: newDate.toISOString(),
      meetingUrl:  appointment.meetingUrl          ?? undefined,
    };

    const delay24h = apptMs - REMINDER_24H_MS - now;
    const delay2h  = apptMs - REMINDER_2H_MS  - now;

    if (delay24h > 0) {
      this.messagingQueue
        .add('appointment-reminder', { ...base, reminderType: '24h' }, { delay: delay24h, priority: 2 })
        .catch(() => {});
    }
    if (delay2h > 0) {
      this.messagingQueue
        .add('appointment-reminder', { ...base, reminderType: '2h' }, { delay: delay2h, priority: 1 })
        .catch(() => {});
    }

    this.logger.log(`Appointment ${appointmentId} rescheduled to ${newDate.toISOString()} (self-service)`);
    return { message: 'Cita reagendada exitosamente.', scheduledAt: updated.scheduledAt };
  }
}

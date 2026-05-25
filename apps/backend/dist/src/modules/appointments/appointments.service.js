"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AppointmentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const prisma_service_1 = require("../../database/prisma.service");
const inject_queue_decorator_1 = require("../../queue/inject-queue.decorator");
const VALID_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];
const REMINDER_24H_MS = 24 * 60 * 60 * 1000;
const REMINDER_2H_MS = 2 * 60 * 60 * 1000;
let AppointmentsService = AppointmentsService_1 = class AppointmentsService {
    constructor(prisma, messagingQueue) {
        this.prisma = prisma;
        this.messagingQueue = messagingQueue;
        this.logger = new common_1.Logger(AppointmentsService_1.name);
    }
    async findAll(tenantId, leadId, status) {
        return this.prisma.withTenant(tenantId, () => this.prisma.appointment.findMany({
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
        }));
    }
    async create(tenantId, dto) {
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: dto.leadId, tenantId, deletedAt: null },
        }));
        if (!lead) {
            throw new common_1.NotFoundException('Lead no encontrado o no pertenece a este tenant.');
        }
        const appointment = await this.prisma.withTenant(tenantId, () => this.prisma.appointment.create({
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
        }));
        this.logger.log(`Appointment created: ${appointment.id} for lead ${dto.leadId} (tenant: ${tenantId})`);
        const reminderBase = {
            appointmentId: appointment.id,
            tenantId,
            leadId: dto.leadId,
            phone: appointment.lead?.phone ?? undefined,
            email: appointment.lead?.email ?? undefined,
            firstName: appointment.lead?.firstName ?? undefined,
            scheduledAt: appointment.scheduledAt.toISOString(),
            meetingUrl: appointment.meetingUrl ?? undefined,
        };
        const now = Date.now();
        const appointmentMs = appointment.scheduledAt.getTime();
        const delay24h = appointmentMs - REMINDER_24H_MS - now;
        const delay2h = appointmentMs - REMINDER_2H_MS - now;
        if (delay24h > 0) {
            this.messagingQueue
                .add('appointment-reminder', { ...reminderBase, reminderType: '24h' }, { delay: delay24h, priority: 2 })
                .catch(() => { });
        }
        if (delay2h > 0) {
            this.messagingQueue
                .add('appointment-reminder', { ...reminderBase, reminderType: '2h' }, { delay: delay2h, priority: 1 })
                .catch(() => { });
        }
        return appointment;
    }
    async updateStatus(tenantId, id, dto) {
        if (!VALID_STATUSES.includes(dto.status)) {
            throw new common_1.BadRequestException(`Estado inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}`);
        }
        const appointment = await this.prisma.withTenant(tenantId, () => this.prisma.appointment.findFirst({
            where: { id, tenantId },
        }));
        if (!appointment) {
            throw new common_1.NotFoundException('Cita no encontrada.');
        }
        const updated = await this.prisma.withTenant(tenantId, () => this.prisma.appointment.update({
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
        }));
        if (dto.status === 'completed' && appointment.status !== 'completed') {
            this.messagingQueue.add('followup-post-consultation', {
                appointmentId: id,
                tenantId,
                leadId: updated.leadId,
                phone: updated.lead?.phone ?? undefined,
                email: updated.lead?.email ?? undefined,
                firstName: updated.lead?.firstName ?? undefined,
            }, { delay: 2 * 60 * 60 * 1000, priority: 3 }).catch(() => { });
        }
        return updated;
    }
    async reschedule(tenantId, appointmentId, email, newDateStr) {
        const newDate = new Date(newDateStr);
        if (isNaN(newDate.getTime()) || newDate <= new Date()) {
            throw new common_1.BadRequestException('newDate debe ser una fecha futura válida.');
        }
        const appointment = await this.prisma.withTenant(tenantId, () => this.prisma.appointment.findFirst({
            where: { id: appointmentId, tenantId, status: 'scheduled' },
            include: {
                lead: { select: { id: true, email: true, firstName: true, phone: true } },
            },
        }));
        if (!appointment)
            throw new common_1.NotFoundException('Cita no encontrada o ya no está programada.');
        if (appointment.lead?.email?.toLowerCase() !== email.toLowerCase()) {
            throw new common_1.BadRequestException('El email no coincide con el de la cita.');
        }
        const updated = await this.prisma.withTenant(tenantId, () => this.prisma.appointment.update({
            where: { id: appointmentId },
            data: { scheduledAt: newDate },
        }));
        const now = Date.now();
        const apptMs = newDate.getTime();
        const base = {
            appointmentId,
            tenantId,
            leadId: appointment.leadId,
            phone: appointment.lead?.phone ?? undefined,
            email: appointment.lead?.email ?? undefined,
            firstName: appointment.lead?.firstName ?? undefined,
            scheduledAt: newDate.toISOString(),
            meetingUrl: appointment.meetingUrl ?? undefined,
        };
        const delay24h = apptMs - REMINDER_24H_MS - now;
        const delay2h = apptMs - REMINDER_2H_MS - now;
        if (delay24h > 0) {
            this.messagingQueue
                .add('appointment-reminder', { ...base, reminderType: '24h' }, { delay: delay24h, priority: 2 })
                .catch(() => { });
        }
        if (delay2h > 0) {
            this.messagingQueue
                .add('appointment-reminder', { ...base, reminderType: '2h' }, { delay: delay2h, priority: 1 })
                .catch(() => { });
        }
        this.logger.log(`Appointment ${appointmentId} rescheduled to ${newDate.toISOString()} (self-service)`);
        return { message: 'Cita reagendada exitosamente.', scheduledAt: updated.scheduledAt };
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = AppointmentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, inject_queue_decorator_1.InjectQueue)('messaging')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_1.Queue])
], AppointmentsService);
//# sourceMappingURL=appointments.service.js.map
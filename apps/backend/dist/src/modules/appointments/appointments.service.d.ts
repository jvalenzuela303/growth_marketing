import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
export declare class AppointmentsService {
    private readonly prisma;
    private readonly messagingQueue;
    private readonly logger;
    constructor(prisma: PrismaService, messagingQueue: Queue);
    findAll(tenantId: string, leadId?: string, status?: string): Promise<({
        lead: {
            email: string;
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            segment: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        leadId: string;
        channel: string;
        status: string;
        scheduledAt: Date;
        meetingUrl: string | null;
        durationMins: number;
        calendarEventId: string | null;
        reminderSentAt: Date | null;
    })[]>;
    create(tenantId: string, dto: CreateAppointmentDto): Promise<{
        lead: {
            email: string;
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        leadId: string;
        channel: string;
        status: string;
        scheduledAt: Date;
        meetingUrl: string | null;
        durationMins: number;
        calendarEventId: string | null;
        reminderSentAt: Date | null;
    }>;
    updateStatus(tenantId: string, id: string, dto: UpdateAppointmentStatusDto): Promise<{
        lead: {
            email: string;
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        notes: string | null;
        leadId: string;
        channel: string;
        status: string;
        scheduledAt: Date;
        meetingUrl: string | null;
        durationMins: number;
        calendarEventId: string | null;
        reminderSentAt: Date | null;
    }>;
    reschedule(tenantId: string, appointmentId: string, email: string, newDateStr: string): Promise<{
        message: string;
        scheduledAt: Date;
    }>;
}

import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { WidgetChatDto } from './dto/widget-chat.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
export declare class WidgetController {
    private readonly prisma;
    private readonly config;
    private readonly chat;
    private readonly appointments;
    constructor(prisma: PrismaService, config: ConfigService, chat: ChatService, appointments: AppointmentsService);
    getConfig(slug: string): Promise<{
        tenantSlug: string;
        tenantName: string;
        widgetTitle: string;
        primaryColor: string;
        position: string;
        funnelId: string;
        quizUrl: string;
    }>;
    publicChat(slug: string, body: WidgetChatDto): Promise<{
        response: string;
    }>;
    rescheduleAppointment(slug: string, appointmentId: string, body: RescheduleAppointmentDto): Promise<{
        message: string;
        scheduledAt: Date;
    }>;
    getScript(slug: string, res: Response): Promise<void>;
}

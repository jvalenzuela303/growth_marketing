import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
declare class CapiEventDto {
    event_name: string;
    event_time: number;
    event_id?: string;
    event_source_url?: string;
    user_data?: {
        em?: string;
        ph?: string;
        fbp?: string;
        fbc?: string;
        client_ip_address?: string;
        client_user_agent?: string;
    };
    custom_data?: Record<string, unknown>;
}
declare class MetaCapiWebhookDto {
    tenantId: string;
    pixelId: string;
    events: CapiEventDto[];
}
export declare class WebhooksController {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService);
    verifyMetaWebhook(mode: string, verifyToken: string, challenge: string): number;
    sendToMetaCapi(dto: MetaCapiWebhookDto, req: Request): Promise<{
        success: boolean;
        eventsReceived: any;
        fbc: any;
    }>;
    receiveMetaLeadAd(payload: any, req: Request): Promise<{
        status: string;
    }>;
}
export {};

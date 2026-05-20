import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export interface PushSubscriptionDto {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    expirationTime?: number | null;
}
export declare class NotificationsService implements OnModuleInit {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private vapidEnabled;
    constructor(prisma: PrismaService, config: ConfigService);
    onModuleInit(): void;
    saveSubscription(tenantId: string, userId: string, dto: PushSubscriptionDto): Promise<void>;
    notifyHotLead(tenantId: string, lead: {
        id: string;
        name: string;
        score: number;
        phone?: string | null;
    }): Promise<void>;
    notifyNewMessage(tenantId: string, leadName: string, preview: string): Promise<void>;
}

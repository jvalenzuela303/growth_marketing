import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export interface MessengerInboundEvent {
    senderId: string;
    recipientId: string;
    text: string;
    timestamp: number;
    mid: string;
}
export declare class MessengerService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private readonly graphUrl;
    constructor(config: ConfigService, prisma: PrismaService);
    verifyWebhook(mode: string, token: string, challenge: string): string | null;
    handleInboundMessage(event: MessengerInboundEvent, pageId: string): Promise<void>;
    sendMessage(recipientPsid: string, text: string): Promise<{
        success: boolean;
        messageId?: string;
    }>;
}

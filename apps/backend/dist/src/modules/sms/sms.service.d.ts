import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { SmsChannel } from '../messaging/channels/sms.channel';
import { WhatsAppChannel } from '../messaging/channels/whatsapp.channel';
import type { MessageResult } from '@growth-engine/shared-types';
export declare class SmsService {
    private readonly smsChannel;
    private readonly whatsAppChannel;
    private readonly prisma;
    private readonly config;
    private readonly logger;
    constructor(smsChannel: SmsChannel, whatsAppChannel: WhatsAppChannel, prisma: PrismaService, config: ConfigService);
    sendSms(tenantId: string, to: string, message: string, leadId?: string): Promise<MessageResult>;
    sendWithFallback(tenantId: string, to: string, message: string, leadId?: string): Promise<{
        channel: string;
        result: MessageResult;
    }>;
    isSmsAvailable(): boolean;
    private persist;
}

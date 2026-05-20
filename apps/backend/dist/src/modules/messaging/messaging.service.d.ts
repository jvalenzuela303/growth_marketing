import { WhatsAppChannel } from './channels/whatsapp.channel';
import { EmailChannel } from './channels/email.channel';
import { InstagramChannel } from './channels/instagram.channel';
import { SmsChannel } from './channels/sms.channel';
import { PrismaService } from '../../database/prisma.service';
import type { MessageChannel, SendMessageOptions, MessageResult } from '@growth-engine/shared-types';
export interface SendMessageRequest extends SendMessageOptions {
    tenantId: string;
    leadId?: string;
}
export declare class MessagingService {
    private readonly prisma;
    private readonly whatsappChannel;
    private readonly emailChannel;
    private readonly instagramChannel;
    private readonly smsChannel;
    private readonly logger;
    private readonly channels;
    constructor(prisma: PrismaService, whatsappChannel: WhatsAppChannel, emailChannel: EmailChannel, instagramChannel: InstagramChannel, smsChannel: SmsChannel);
    send(request: SendMessageRequest): Promise<MessageResult>;
    sendTemplate(tenantId: string, leadId: string | undefined, channel: MessageChannel, to: string, templateName: string, params: Record<string, string>): Promise<MessageResult>;
    private persistConversation;
}

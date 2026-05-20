import { ConfigService } from '@nestjs/config';
import type { IChannel, MessageChannel, SendMessageOptions, MessageResult } from '@growth-engine/shared-types';
export declare class WhatsAppChannel implements IChannel {
    private readonly config;
    readonly channel: MessageChannel;
    private readonly logger;
    constructor(config: ConfigService);
    isAvailable(): boolean;
    sendMessage(options: SendMessageOptions): Promise<MessageResult>;
    sendTemplate(to: string, templateName: string, params: Record<string, string>): Promise<MessageResult>;
    private normalizePhone;
    private handleApiError;
}

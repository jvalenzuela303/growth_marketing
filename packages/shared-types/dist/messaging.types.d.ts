export type MessageChannel = 'whatsapp' | 'email' | 'sms' | 'chat' | 'instagram';
export type MessageDirection = 'outbound' | 'inbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export interface SendMessageOptions {
    to: string;
    channel: MessageChannel;
    templateName?: string;
    templateParams?: Record<string, string>;
    content?: string;
    subject?: string;
    metadata?: Record<string, unknown>;
}
export interface MessageResult {
    success: boolean;
    externalMessageId?: string;
    error?: string;
}
export interface IChannel {
    channel: MessageChannel;
    sendMessage(options: SendMessageOptions): Promise<MessageResult>;
    sendTemplate(to: string, templateName: string, params: Record<string, string>): Promise<MessageResult>;
    isAvailable(): boolean;
}
export declare const WHATSAPP_TEMPLATES: {
    readonly WELCOME: "ge_welcome_lead";
    readonly HOT_LEAD_1: "ge_hot_lead_message_1";
    readonly HOT_LEAD_2: "ge_hot_lead_message_2";
    readonly HOT_LEAD_3: "ge_hot_lead_message_3";
    readonly HOT_LEAD_4: "ge_hot_lead_message_4";
    readonly HOT_LEAD_5: "ge_hot_lead_message_5";
    readonly WARM_NURTURE_1: "ge_warm_nurture_1";
    readonly WARM_NURTURE_2: "ge_warm_nurture_2";
    readonly REENGAGEMENT: "ge_reengagement";
};
//# sourceMappingURL=messaging.types.d.ts.map
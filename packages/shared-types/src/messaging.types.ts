export type MessageChannel = 'whatsapp' | 'email' | 'sms' | 'chat' | 'instagram';
export type MessageDirection = 'outbound' | 'inbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface SendMessageOptions {
  to: string;          // teléfono o email
  channel: MessageChannel;
  templateName?: string;
  templateParams?: Record<string, string>;
  content?: string;
  subject?: string;    // solo para email
  metadata?: Record<string, unknown>;
}

export interface MessageResult {
  success: boolean;
  externalMessageId?: string;
  error?: string;
}

// Interface del Channel Abstraction Layer (riesgo #1 del proyecto)
// TODOS los channels (WhatsApp, Email, SMS) implementan esta interface
// Permite switchear de canal sin cambiar código de negocio
export interface IChannel {
  channel: MessageChannel;
  sendMessage(options: SendMessageOptions): Promise<MessageResult>;
  sendTemplate(to: string, templateName: string, params: Record<string, string>): Promise<MessageResult>;
  isAvailable(): boolean;
}

// Templates de WhatsApp predefinidos
export const WHATSAPP_TEMPLATES = {
  WELCOME: 'ge_welcome_lead',
  HOT_LEAD_1: 'ge_hot_lead_message_1',
  HOT_LEAD_2: 'ge_hot_lead_message_2',
  HOT_LEAD_3: 'ge_hot_lead_message_3',
  HOT_LEAD_4: 'ge_hot_lead_message_4',
  HOT_LEAD_5: 'ge_hot_lead_message_5',
  WARM_NURTURE_1: 'ge_warm_nurture_1',
  WARM_NURTURE_2: 'ge_warm_nurture_2',
  REENGAGEMENT: 'ge_reengagement',
} as const;

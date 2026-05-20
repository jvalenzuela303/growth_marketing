import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type {
  IChannel,
  MessageChannel,
  SendMessageOptions,
  MessageResult,
} from '@growth-engine/shared-types';

const META_API_VERSION = 'v19.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * Implementación del Channel Abstraction Layer para WhatsApp Business API (Meta Cloud).
 *
 * IMPORTANTE: Siempre usar a través de MessagingService, nunca instanciar directamente.
 * Los tokens y phone IDs son por-tenant — se pasan en tiempo de llamada para
 * soportar multi-tenancy sin instanciar un canal por tenant.
 */
@Injectable()
export class WhatsAppChannel implements IChannel {
  readonly channel: MessageChannel = 'whatsapp';
  private readonly logger = new Logger(WhatsAppChannel.name);

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    return !!this.config.get('META_WHATSAPP_TOKEN');
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    const phoneNumberId = this.config.get<string>('META_WHATSAPP_PHONE_ID');
    const token = this.config.get<string>('META_WHATSAPP_TOKEN');

    if (!phoneNumberId || !token) {
      this.logger.warn('WhatsApp no configurado: META_WHATSAPP_PHONE_ID o META_WHATSAPP_TOKEN faltantes.');
      return { success: false, error: 'WhatsApp no configurado.' };
    }

    const phone = this.normalizePhone(options.to);

    try {
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'text',
        text: { body: options.content || '' },
      };

      const response = await axios.post(
        `${META_API_BASE}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const msgId = response.data?.messages?.[0]?.id;
      this.logger.debug(`WhatsApp enviado: ${msgId} → ${phone}`);
      return { success: true, externalMessageId: msgId };
    } catch (error) {
      return this.handleApiError(error as AxiosError, phone);
    }
  }

  /**
   * Envía mensaje usando template aprobado por Meta.
   * Los templates deben estar aprobados antes de usar.
   * Referencia: https://developers.facebook.com/docs/whatsapp/api/messages/message-templates
   */
  async sendTemplate(
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<MessageResult> {
    const phoneNumberId = this.config.get<string>('META_WHATSAPP_PHONE_ID');
    const token = this.config.get<string>('META_WHATSAPP_TOKEN');

    if (!phoneNumberId || !token) {
      return { success: false, error: 'WhatsApp no configurado.' };
    }

    const phone = this.normalizePhone(to);

    // Construir componentes del template desde el objeto de params
    const components = Object.keys(params).length > 0
      ? [
          {
            type: 'body',
            parameters: Object.entries(params).map(([, value]) => ({
              type: 'text',
              text: value,
            })),
          },
        ]
      : [];

    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'es_LA' },
          components,
        },
      };

      const response = await axios.post(
        `${META_API_BASE}/${phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const msgId = response.data?.messages?.[0]?.id;
      this.logger.debug(`Template "${templateName}" enviado: ${msgId} → ${phone}`);
      return { success: true, externalMessageId: msgId };
    } catch (error) {
      return this.handleApiError(error as AxiosError, phone);
    }
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    // Elimina +, espacios y guiones; asegura formato E.164 sin el +
    return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
  }

  private handleApiError(error: AxiosError, destination: string): MessageResult {
    const status = error.response?.status;
    const errorData = error.response?.data as any;
    const errorCode = errorData?.error?.code;
    const errorMsg = errorData?.error?.message || error.message;

    this.logger.error(
      `Error WhatsApp → ${destination}: HTTP ${status}, code ${errorCode}: ${errorMsg}`,
    );

    return {
      success: false,
      error: `WhatsApp API error ${errorCode}: ${errorMsg}`,
    };
  }
}

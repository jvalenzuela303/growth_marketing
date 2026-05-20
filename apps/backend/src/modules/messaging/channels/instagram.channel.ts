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
const META_API_BASE    = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * InstagramChannel — implementación de IChannel para Instagram DM.
 *
 * Para enviar mensajes, necesita el Page ID y el access_token del tenant.
 * Estos se pasan en `options.metadata.pageId` y `options.metadata.accessToken`
 * desde el MessagingService o directamente desde el InstagramService.
 *
 * El flujo típico es:
 *   MessagingProcessor → MessagingService.send() → InstagramChannel.sendMessage()
 *
 * La disponibilidad global se comprueba con META_APP_ID (credenciales de la app);
 * el token por-tenant debe viajar en el campo metadata de la petición.
 */
@Injectable()
export class InstagramChannel implements IChannel {
  readonly channel: MessageChannel = 'instagram';
  private readonly logger = new Logger(InstagramChannel.name);

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    return !!this.config.get('META_APP_ID');
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    const pageId      = options.metadata?.pageId      as string | undefined;
    const accessToken = options.metadata?.accessToken as string | undefined;

    if (!pageId || !accessToken) {
      this.logger.warn('InstagramChannel: falta pageId o accessToken en metadata.');
      return { success: false, error: 'Instagram no configurado para este tenant.' };
    }

    try {
      const res = await axios.post<{ message_id: string }>(
        `${META_API_BASE}/${pageId}/messages`,
        {
          recipient: { id: options.to },
          message:   { text: options.content || '' },
        },
        {
          headers: {
            Authorization:  `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10_000,
        },
      );

      const msgId = res.data?.message_id;
      this.logger.debug(`Instagram DM enviado: ${msgId} → ${options.to}`);
      return { success: true, externalMessageId: msgId };
    } catch (error) {
      return this.handleApiError(error as AxiosError, options.to);
    }
  }

  async sendTemplate(
    to: string,
    _templateName: string,
    _params: Record<string, string>,
  ): Promise<MessageResult> {
    // Instagram DM no soporta templates de la misma forma que WhatsApp.
    // Se envía como texto plano con el contenido del template renderizado.
    this.logger.warn('Instagram no soporta templates nativos — enviar como texto.');
    return { success: false, error: 'Templates no soportados en Instagram DM.' };
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  private handleApiError(error: AxiosError, destination: string): MessageResult {
    const status   = error.response?.status;
    const errData  = error.response?.data as any;
    const errCode  = errData?.error?.code;
    const errMsg   = errData?.error?.message || error.message;

    this.logger.error(
      `Error Instagram DM → ${destination}: HTTP ${status}, code ${errCode}: ${errMsg}`,
    );

    return { success: false, error: `Instagram API error ${errCode}: ${errMsg}` };
  }
}

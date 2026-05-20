import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { EmailChannel } from './channels/email.channel';
import { InstagramChannel } from './channels/instagram.channel';
import { SmsChannel } from './channels/sms.channel';
import { PrismaService } from '../../database/prisma.service';
import type {
  IChannel,
  MessageChannel,
  SendMessageOptions,
  MessageResult,
} from '@growth-engine/shared-types';

export interface SendMessageRequest extends SendMessageOptions {
  tenantId: string;
  leadId?: string;
}

/**
 * Channel Abstraction Layer — orquestador de canales de mensajería.
 *
 * REGLA FUNDAMENTAL: Este servicio SIEMPRE interactúa con IChannel.
 * Nunca llama directamente a Meta API ni a SendGrid.
 * Cambiar de canal es cuestión de añadir/modificar la implementación de IChannel.
 *
 * Los processors de BullMQ usan este servicio para despachar mensajes.
 */
@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);
  private readonly channels: Map<MessageChannel, IChannel>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappChannel: WhatsAppChannel,
    private readonly emailChannel: EmailChannel,
    private readonly instagramChannel: InstagramChannel,
    private readonly smsChannel: SmsChannel,
  ) {
    this.channels = new Map<MessageChannel, IChannel>([
      ['whatsapp',  this.whatsappChannel],
      ['email',     this.emailChannel],
      ['instagram', this.instagramChannel],
      ['sms' as any, this.smsChannel],
    ]);
  }

  /**
   * Despacha un mensaje al canal correspondiente y persiste el resultado en DB.
   */
  async send(request: SendMessageRequest): Promise<MessageResult> {
    const channel = this.channels.get(request.channel);

    if (!channel) {
      throw new BadRequestException(`Canal no soportado: ${request.channel}`);
    }

    if (!channel.isAvailable()) {
      this.logger.warn(`Canal "${request.channel}" no disponible (credenciales faltantes).`);
      return { success: false, error: `Canal ${request.channel} no configurado.` };
    }

    const result = await channel.sendMessage(request);

    // Persistir conversación en DB si tenemos leadId
    if (request.leadId && request.tenantId) {
      await this.persistConversation(request, result).catch((err) =>
        this.logger.warn(`No se pudo persistir conversación: ${err.message}`),
      );
    }

    return result;
  }

  /**
   * Envía mensaje usando template (WhatsApp templates, SendGrid Dynamic Templates).
   */
  async sendTemplate(
    tenantId: string,
    leadId: string | undefined,
    channel: MessageChannel,
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<MessageResult> {
    const channelImpl = this.channels.get(channel);

    if (!channelImpl) {
      throw new BadRequestException(`Canal no soportado: ${channel}`);
    }

    if (!channelImpl.isAvailable()) {
      return { success: false, error: `Canal ${channel} no configurado.` };
    }

    const result = await channelImpl.sendTemplate(to, templateName, params);

    if (leadId && tenantId) {
      await this.persistConversation(
        { tenantId, leadId, channel, to, templateName, metadata: { params } },
        result,
      ).catch((err) =>
        this.logger.warn(`No se pudo persistir conversación de template: ${err.message}`),
      );
    }

    return result;
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  private async persistConversation(
    request: Partial<SendMessageRequest> & { channel: MessageChannel; tenantId: string; leadId?: string },
    result: MessageResult,
  ): Promise<void> {
    if (!request.leadId) return;

    await this.prisma.withTenant(request.tenantId, () =>
      this.prisma.conversation.create({
        data: {
          tenantId: request.tenantId,
          leadId: request.leadId,
          channel: request.channel,
          role: 'assistant',
          content: request.content || request.templateName || '(template)',
          contentType: 'text',
          status: result.success ? 'sent' : 'failed',
          externalMessageId: result.externalMessageId,
          metadata: {
            templateName: request.templateName,
            templateParams: (request.metadata as any)?.params,
          },
        },
      }),
    );
  }
}

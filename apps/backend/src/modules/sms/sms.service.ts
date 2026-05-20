import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { SmsChannel } from '../messaging/channels/sms.channel';
import { WhatsAppChannel } from '../messaging/channels/whatsapp.channel';
import type { MessageResult } from '@growth-engine/shared-types';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly smsChannel: SmsChannel,
    private readonly whatsAppChannel: WhatsAppChannel,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Send SMS directly via Twilio.
   */
  async sendSms(
    tenantId: string,
    to: string,
    message: string,
    leadId?: string,
  ): Promise<MessageResult> {
    const result = await this.smsChannel.sendMessage({ to, content: message, channel: 'sms' as any });

    if (leadId) {
      await this.persist(tenantId, leadId, 'sms', to, message, result);
    }

    return result;
  }

  /**
   * Send with WhatsApp-first fallback:
   *   1. Try WhatsApp
   *   2. If WhatsApp fails or is unavailable → send SMS
   * Returns the channel actually used plus the result.
   */
  async sendWithFallback(
    tenantId: string,
    to: string,
    message: string,
    leadId?: string,
  ): Promise<{ channel: string; result: MessageResult }> {
    // Try WhatsApp first
    if (this.whatsAppChannel.isAvailable()) {
      const waResult = await this.whatsAppChannel.sendMessage({
        to,
        content: message,
        channel: 'whatsapp',
      });

      if (waResult.success) {
        if (leadId) await this.persist(tenantId, leadId, 'whatsapp', to, message, waResult);
        return { channel: 'whatsapp', result: waResult };
      }

      this.logger.warn(`WhatsApp falló para ${to}: ${waResult.error}. Usando SMS fallback.`);
    }

    // Fallback to SMS
    if (!this.smsChannel.isAvailable()) {
      return {
        channel: 'none',
        result: { success: false, error: 'Ni WhatsApp ni SMS disponibles.' },
      };
    }

    const smsResult = await this.smsChannel.sendMessage({
      to,
      content: message,
      channel: 'sms' as any,
    });

    if (leadId) await this.persist(tenantId, leadId, 'sms', to, message, smsResult);
    return { channel: 'sms', result: smsResult };
  }

  isSmsAvailable(): boolean {
    return this.smsChannel.isAvailable();
  }

  // ── helper ────────────────────────────────────────────────────────────────

  private async persist(
    tenantId: string,
    leadId: string,
    channel: string,
    to: string,
    content: string,
    result: MessageResult,
  ): Promise<void> {
    try {
      await this.prisma.withTenant(tenantId, () =>
        this.prisma.conversation.create({
          data: {
            tenantId,
            leadId,
            channel,
            role: 'assistant',
            content,
            status: result.success ? 'sent' : 'failed',
            externalMessageId: result.externalMessageId,
          },
        }),
      );
    } catch (err: any) {
      this.logger.warn(`No se pudo persistir SMS: ${err.message}`);
    }
  }
}

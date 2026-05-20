import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type {
  IChannel,
  MessageChannel,
  SendMessageOptions,
  MessageResult,
} from '@growth-engine/shared-types';

const SENDGRID_API_BASE = 'https://api.sendgrid.com/v3';

/**
 * Implementación del Channel Abstraction Layer para email via SendGrid.
 * Siempre usar a través de MessagingService.
 */
@Injectable()
export class EmailChannel implements IChannel {
  readonly channel: MessageChannel = 'email';
  private readonly logger = new Logger(EmailChannel.name);

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    return !!this.config.get('SENDGRID_API_KEY') && !!this.config.get('SENDGRID_FROM_EMAIL');
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    const fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@thegrowthengine.com');
    const fromName = this.config.get<string>('SENDGRID_FROM_NAME', 'The Growth Engine');

    if (!apiKey) {
      this.logger.warn('Email no configurado: SENDGRID_API_KEY faltante.');
      return { success: false, error: 'Email no configurado.' };
    }

    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: options.to }],
            subject: options.subject || 'Mensaje de The Growth Engine',
          },
        ],
        from: { email: fromEmail, name: fromName },
        content: [{ type: 'text/html', value: options.content || '' }],
        ...(options.metadata?.messageId && {
          headers: { 'X-Message-ID': options.metadata.messageId as string },
        }),
      };

      const response = await axios.post(`${SENDGRID_API_BASE}/mail/send`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      // SendGrid devuelve 202 con X-Message-Id en headers para emails enviados
      const externalMessageId = response.headers['x-message-id'] as string;
      this.logger.debug(`Email enviado: ${externalMessageId} → ${options.to}`);
      return { success: true, externalMessageId };
    } catch (error) {
      return this.handleApiError(error as AxiosError, options.to);
    }
  }

  /**
   * Envía email usando template de SendGrid (Dynamic Templates).
   * templateName = template_id de SendGrid (ej: "d-abc123...")
   * params = dynamic_template_data
   */
  async sendTemplate(
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<MessageResult> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    const fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@thegrowthengine.com');
    const fromName = this.config.get<string>('SENDGRID_FROM_NAME', 'The Growth Engine');

    if (!apiKey) {
      return { success: false, error: 'Email no configurado.' };
    }

    try {
      const payload = {
        personalizations: [
          {
            to: [{ email: to }],
            dynamic_template_data: params,
          },
        ],
        from: { email: fromEmail, name: fromName },
        template_id: templateName,
      };

      const response = await axios.post(`${SENDGRID_API_BASE}/mail/send`, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const externalMessageId = response.headers['x-message-id'] as string;
      this.logger.debug(`Template email enviado: ${externalMessageId} → ${to}`);
      return { success: true, externalMessageId };
    } catch (error) {
      return this.handleApiError(error as AxiosError, to);
    }
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  private handleApiError(error: AxiosError, destination: string): MessageResult {
    const status = error.response?.status;
    const errors = (error.response?.data as any)?.errors;
    const errorMsg = errors?.[0]?.message || error.message;

    this.logger.error(`Error SendGrid → ${destination}: HTTP ${status}: ${errorMsg}`);
    return { success: false, error: `SendGrid error: ${errorMsg}` };
  }
}

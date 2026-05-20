import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IChannel,
  MessageChannel,
  SendMessageOptions,
  MessageResult,
} from '@growth-engine/shared-types';

/**
 * SMS channel via Twilio REST API.
 *
 * Used as fallback when WhatsApp is unavailable or delivery fails.
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 *
 * Uses native fetch (Node 18+) to avoid adding axios dependency overhead.
 */
@Injectable()
export class SmsChannel implements IChannel {
  readonly channel: MessageChannel = 'sms' as any;
  private readonly logger = new Logger(SmsChannel.name);

  constructor(private readonly config: ConfigService) {}

  isAvailable(): boolean {
    return (
      !!this.config.get('TWILIO_ACCOUNT_SID') &&
      !!this.config.get('TWILIO_AUTH_TOKEN') &&
      !!this.config.get('TWILIO_FROM_NUMBER')
    );
  }

  async sendMessage(options: SendMessageOptions): Promise<MessageResult> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID', '');
    const authToken  = this.config.get<string>('TWILIO_AUTH_TOKEN', '');
    const from       = this.config.get<string>('TWILIO_FROM_NUMBER', '');

    if (!accountSid || !authToken || !from) {
      return { success: false, error: 'SMS (Twilio) no configurado.' };
    }

    const to = this.normalizePhone(options.to);
    const body = options.content ?? '';

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: AbortSignal.timeout(10_000),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        const msg = data?.message ?? `HTTP ${res.status}`;
        this.logger.error(`Twilio SMS error → ${to}: ${msg}`);
        return { success: false, error: `Twilio error: ${msg}` };
      }

      this.logger.debug(`SMS enviado: ${data.sid} → ${to}`);
      return { success: true, externalMessageId: data.sid };
    } catch (err: any) {
      this.logger.error(`Twilio SMS excepción → ${to}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    params: Record<string, string>,
  ): Promise<MessageResult> {
    // SMS doesn't support rich templates — interpolate params into a plain message
    let body = templateName;
    for (const [key, val] of Object.entries(params)) {
      body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
    }
    return this.sendMessage({ to, content: body, channel: 'sms' as any });
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  }
}

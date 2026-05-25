import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface MailOptions {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Servicio de notificaciones internas por email.
 * En desarrollo usa Gmail SMTP (App Password de Google).
 * En producción puede usar cualquier transporte SMTP compatible.
 *
 * Variables de entorno requeridas:
 *   GMAIL_USER         — tu cuenta Gmail (ej: hola@gmail.com)
 *   GMAIL_APP_PASSWORD — App Password de 16 caracteres generado en
 *                        myaccount.google.com/apppasswords
 */
@Injectable()
export class MailNotifierService implements OnModuleInit {
  private readonly logger = new Logger(MailNotifierService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const user    = this.config.get<string>('GMAIL_USER');
    const pass    = this.config.get<string>('GMAIL_APP_PASSWORD');

    if (!user || !pass) {
      this.logger.warn(
        'Gmail no configurado — GMAIL_USER y/o GMAIL_APP_PASSWORD ausentes. ' +
        'Las notificaciones internas de email estarán deshabilitadas.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,           // STARTTLS en puerto 587
      auth: { user, pass },
    });

    this.logger.log(`MailNotifier listo — remitente: ${user}`);
  }

  get isAvailable(): boolean {
    return this.transporter !== null;
  }

  async send(opts: MailOptions): Promise<boolean> {
    if (!this.transporter) {
      this.logger.debug(`Email omitido (transporte no configurado): ${opts.subject}`);
      return false;
    }

    const from = `"Growth Engine" <${this.config.get('GMAIL_USER')}>`;

    try {
      const info = await this.transporter.sendMail({
        from,
        to:      Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
        subject: opts.subject,
        html:    opts.html,
        ...(opts.replyTo && { replyTo: opts.replyTo }),
      });

      this.logger.log(`Email enviado: ${info.messageId} → ${opts.to}`);
      return true;
    } catch (err) {
      this.logger.error(`Error al enviar email "${opts.subject}": ${(err as Error).message}`);
      return false;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

export interface MessengerInboundEvent {
  senderId:    string;
  recipientId: string;
  text:        string;
  timestamp:   number;
  mid:         string;
}

@Injectable()
export class MessengerService {
  private readonly logger = new Logger(MessengerService.name);
  private readonly graphUrl = 'https://graph.facebook.com/v20.0';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Webhook verification ───────────────────────────────────────────────────

  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.config.get<string>('MESSENGER_VERIFY_TOKEN', '');
    if (mode === 'subscribe' && token === verifyToken) return challenge;
    return null;
  }

  // ── Incoming message handler ───────────────────────────────────────────────

  async handleInboundMessage(event: MessengerInboundEvent, pageId: string): Promise<void> {
    const pageToken = this.config.get<string>('MESSENGER_PAGE_TOKEN', '');
    if (!pageToken) {
      this.logger.warn('MESSENGER_PAGE_TOKEN no configurado — mensaje ignorado.');
      return;
    }

    // Upsert lead por senderId (PSID de Messenger)
    // Las conversaciones de Messenger no están en un tenant específico por webhook
    // Se busca el tenant que tenga este pageId configurado
    const settings = await this.prisma.$queryRaw<Array<{ tenant_id: string }>>`
      SELECT id as tenant_id FROM tenants
      WHERE settings->>'messengerPageId' = ${pageId}
      LIMIT 1
    `;

    if (!settings.length) {
      this.logger.warn(`No se encontró tenant para Messenger Page ID: ${pageId}`);
      return;
    }

    const tenantId = settings[0].tenant_id;

    await this.prisma.withTenant(tenantId, async () => {
      // Upsert lead
      let lead = await this.prisma.lead.findFirst({
        where: { phone: event.senderId, tenantId },
      });

      if (!lead) {
        lead = await this.prisma.lead.create({
          data: {
            tenantId,
            firstName: `Messenger`,
            lastName:  event.senderId.slice(-6),
            phone:     event.senderId,
            source:    'messenger',
            email:     '',
          },
        });
        this.logger.log(`Nuevo lead Messenger creado: ${lead.id}`);
      }

      // Persistir conversación
      await this.prisma.conversation.create({
        data: {
          tenantId,
          leadId:            lead.id,
          channel:           'messenger',
          role:              'user',
          content:           event.text,
          externalMessageId: event.mid,
          metadata:          { timestamp: event.timestamp },
        },
      });
    });
  }

  // ── Send message ───────────────────────────────────────────────────────────

  async sendMessage(recipientPsid: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    const pageToken = this.config.get<string>('MESSENGER_PAGE_TOKEN', '');
    if (!pageToken) {
      this.logger.warn('MESSENGER_PAGE_TOKEN no configurado.');
      return { success: false };
    }

    try {
      const res = await fetch(
        `${this.graphUrl}/me/messages?access_token=${pageToken}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientPsid },
            message:   { text },
            messaging_type: 'RESPONSE',
          }),
        },
      );

      const data = await res.json() as any;

      if (!res.ok) {
        this.logger.error(`Messenger Graph API error: ${JSON.stringify(data)}`);
        return { success: false };
      }

      return { success: true, messageId: data.message_id };
    } catch (err: any) {
      this.logger.error(`Error enviando mensaje Messenger: ${err.message}`);
      return { success: false };
    }
  }
}

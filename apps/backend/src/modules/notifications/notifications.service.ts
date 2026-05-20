import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../../database/prisma.service';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  expirationTime?: number | null;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidEnabled = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey  = this.config.get<string>('VAPID_PUBLIC_KEY', '');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY', '');
    const subject    = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@growthengine.io');

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidEnabled = true;
      this.logger.log('Web Push (VAPID) configurado correctamente.');
    } else {
      this.logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas — push notifications desactivadas.');
    }
  }

  // ── Suscripciones ──────────────────────────────────────────────────────────

  async saveSubscription(
    tenantId: string,
    userId: string,
    dto: PushSubscriptionDto,
  ): Promise<void> {
    await this.prisma.withTenant(tenantId, async () => {
      await this.prisma.$executeRaw`
        INSERT INTO push_subscriptions (tenant_id, user_id, endpoint, p256dh, auth, expires_at)
        VALUES (${tenantId}::uuid, ${userId}::uuid, ${dto.endpoint},
                ${dto.keys.p256dh}, ${dto.keys.auth},
                ${dto.expirationTime ? new Date(dto.expirationTime) : null})
        ON CONFLICT (endpoint) DO UPDATE
          SET p256dh = EXCLUDED.p256dh,
              auth   = EXCLUDED.auth,
              user_id = EXCLUDED.user_id,
              updated_at = now()
      `;
    });
  }

  // ── Envío de notificaciones ────────────────────────────────────────────────

  async notifyHotLead(tenantId: string, lead: {
    id: string;
    name: string;
    score: number;
    phone?: string | null;
  }): Promise<void> {
    if (!this.vapidEnabled) return;

    const subs = await this.prisma.$queryRaw<Array<{
      endpoint: string; p256dh: string; auth: string
    }>>`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE tenant_id = ${tenantId}::uuid
        AND (expires_at IS NULL OR expires_at > now())
    `;

    const payload = JSON.stringify({
      title: '🔥 Lead caliente detectado',
      body:  `${lead.name} — Score ${lead.score}/100. ¡Contacta ahora!`,
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data:  { url: `/leads?highlight=${lead.id}` },
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          .catch((err) => {
            // 410 Gone = suscripción expirada, limpiar
            if (err.statusCode === 410) {
              this.prisma.$executeRaw`
                DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}
              `.catch(() => {});
            }
          }),
      ),
    );
  }

  async notifyNewMessage(tenantId: string, leadName: string, preview: string): Promise<void> {
    if (!this.vapidEnabled) return;

    const subs = await this.prisma.$queryRaw<Array<{
      endpoint: string; p256dh: string; auth: string
    }>>`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE tenant_id = ${tenantId}::uuid
        AND (expires_at IS NULL OR expires_at > now())
    `;

    const payload = JSON.stringify({
      title: `💬 Nuevo mensaje de ${leadName}`,
      body:  preview.slice(0, 100),
      icon:  '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data:  { url: '/conversations' },
    });

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ).catch(() => {}),
      ),
    );
  }
}

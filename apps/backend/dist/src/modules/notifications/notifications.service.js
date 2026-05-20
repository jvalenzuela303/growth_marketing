"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const webpush = require("web-push");
const prisma_service_1 = require("../../database/prisma.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.vapidEnabled = false;
    }
    onModuleInit() {
        const publicKey = this.config.get('VAPID_PUBLIC_KEY', '');
        const privateKey = this.config.get('VAPID_PRIVATE_KEY', '');
        const subject = this.config.get('VAPID_SUBJECT', 'mailto:admin@growthengine.io');
        if (publicKey && privateKey) {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            this.vapidEnabled = true;
            this.logger.log('Web Push (VAPID) configurado correctamente.');
        }
        else {
            this.logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY no configuradas — push notifications desactivadas.');
        }
    }
    async saveSubscription(tenantId, userId, dto) {
        await this.prisma.withTenant(tenantId, async () => {
            await this.prisma.$executeRaw `
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
    async notifyHotLead(tenantId, lead) {
        if (!this.vapidEnabled)
            return;
        const subs = await this.prisma.$queryRaw `
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE tenant_id = ${tenantId}::uuid
        AND (expires_at IS NULL OR expires_at > now())
    `;
        const payload = JSON.stringify({
            title: '🔥 Lead caliente detectado',
            body: `${lead.name} — Score ${lead.score}/100. ¡Contacta ahora!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            data: { url: `/leads?highlight=${lead.id}` },
        });
        await Promise.allSettled(subs.map((sub) => webpush
            .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
            .catch((err) => {
            if (err.statusCode === 410) {
                this.prisma.$executeRaw `
                DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}
              `.catch(() => { });
            }
        })));
    }
    async notifyNewMessage(tenantId, leadName, preview) {
        if (!this.vapidEnabled)
            return;
        const subs = await this.prisma.$queryRaw `
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE tenant_id = ${tenantId}::uuid
        AND (expires_at IS NULL OR expires_at > now())
    `;
        const payload = JSON.stringify({
            title: `💬 Nuevo mensaje de ${leadName}`,
            body: preview.slice(0, 100),
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-96x96.png',
            data: { url: '/conversations' },
        });
        await Promise.allSettled(subs.map((sub) => webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload).catch(() => { })));
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map
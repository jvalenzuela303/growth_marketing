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
var MessengerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessengerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../database/prisma.service");
let MessengerService = MessengerService_1 = class MessengerService {
    constructor(config, prisma) {
        this.config = config;
        this.prisma = prisma;
        this.logger = new common_1.Logger(MessengerService_1.name);
        this.graphUrl = 'https://graph.facebook.com/v20.0';
    }
    verifyWebhook(mode, token, challenge) {
        const verifyToken = this.config.get('MESSENGER_VERIFY_TOKEN', '');
        if (mode === 'subscribe' && token === verifyToken)
            return challenge;
        return null;
    }
    async handleInboundMessage(event, pageId) {
        const pageToken = this.config.get('MESSENGER_PAGE_TOKEN', '');
        if (!pageToken) {
            this.logger.warn('MESSENGER_PAGE_TOKEN no configurado — mensaje ignorado.');
            return;
        }
        const settings = await this.prisma.$queryRaw `
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
            let lead = await this.prisma.lead.findFirst({
                where: { phone: event.senderId, tenantId },
            });
            if (!lead) {
                lead = await this.prisma.lead.create({
                    data: {
                        tenantId,
                        firstName: `Messenger`,
                        lastName: event.senderId.slice(-6),
                        phone: event.senderId,
                        source: 'messenger',
                        email: '',
                    },
                });
                this.logger.log(`Nuevo lead Messenger creado: ${lead.id}`);
            }
            await this.prisma.conversation.create({
                data: {
                    tenantId,
                    leadId: lead.id,
                    channel: 'messenger',
                    role: 'user',
                    content: event.text,
                    externalMessageId: event.mid,
                    metadata: { timestamp: event.timestamp },
                },
            });
        });
    }
    async sendMessage(recipientPsid, text) {
        const pageToken = this.config.get('MESSENGER_PAGE_TOKEN', '');
        if (!pageToken) {
            this.logger.warn('MESSENGER_PAGE_TOKEN no configurado.');
            return { success: false };
        }
        try {
            const res = await fetch(`${this.graphUrl}/me/messages?access_token=${pageToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientPsid },
                    message: { text },
                    messaging_type: 'RESPONSE',
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                this.logger.error(`Messenger Graph API error: ${JSON.stringify(data)}`);
                return { success: false };
            }
            return { success: true, messageId: data.message_id };
        }
        catch (err) {
            this.logger.error(`Error enviando mensaje Messenger: ${err.message}`);
            return { success: false };
        }
    }
};
exports.MessengerService = MessengerService;
exports.MessengerService = MessengerService = MessengerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MessengerService);
//# sourceMappingURL=messenger.service.js.map
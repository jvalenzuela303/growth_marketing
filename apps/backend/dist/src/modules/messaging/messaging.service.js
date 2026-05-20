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
var MessagingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingService = void 0;
const common_1 = require("@nestjs/common");
const whatsapp_channel_1 = require("./channels/whatsapp.channel");
const email_channel_1 = require("./channels/email.channel");
const instagram_channel_1 = require("./channels/instagram.channel");
const sms_channel_1 = require("./channels/sms.channel");
const prisma_service_1 = require("../../database/prisma.service");
let MessagingService = MessagingService_1 = class MessagingService {
    constructor(prisma, whatsappChannel, emailChannel, instagramChannel, smsChannel) {
        this.prisma = prisma;
        this.whatsappChannel = whatsappChannel;
        this.emailChannel = emailChannel;
        this.instagramChannel = instagramChannel;
        this.smsChannel = smsChannel;
        this.logger = new common_1.Logger(MessagingService_1.name);
        this.channels = new Map([
            ['whatsapp', this.whatsappChannel],
            ['email', this.emailChannel],
            ['instagram', this.instagramChannel],
            ['sms', this.smsChannel],
        ]);
    }
    async send(request) {
        const channel = this.channels.get(request.channel);
        if (!channel) {
            throw new common_1.BadRequestException(`Canal no soportado: ${request.channel}`);
        }
        if (!channel.isAvailable()) {
            this.logger.warn(`Canal "${request.channel}" no disponible (credenciales faltantes).`);
            return { success: false, error: `Canal ${request.channel} no configurado.` };
        }
        const result = await channel.sendMessage(request);
        if (request.leadId && request.tenantId) {
            await this.persistConversation(request, result).catch((err) => this.logger.warn(`No se pudo persistir conversación: ${err.message}`));
        }
        return result;
    }
    async sendTemplate(tenantId, leadId, channel, to, templateName, params) {
        const channelImpl = this.channels.get(channel);
        if (!channelImpl) {
            throw new common_1.BadRequestException(`Canal no soportado: ${channel}`);
        }
        if (!channelImpl.isAvailable()) {
            return { success: false, error: `Canal ${channel} no configurado.` };
        }
        const result = await channelImpl.sendTemplate(to, templateName, params);
        if (leadId && tenantId) {
            await this.persistConversation({ tenantId, leadId, channel, to, templateName, metadata: { params } }, result).catch((err) => this.logger.warn(`No se pudo persistir conversación de template: ${err.message}`));
        }
        return result;
    }
    async persistConversation(request, result) {
        if (!request.leadId)
            return;
        await this.prisma.withTenant(request.tenantId, () => this.prisma.conversation.create({
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
                    templateParams: request.metadata?.params,
                },
            },
        }));
    }
};
exports.MessagingService = MessagingService;
exports.MessagingService = MessagingService = MessagingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_channel_1.WhatsAppChannel,
        email_channel_1.EmailChannel,
        instagram_channel_1.InstagramChannel,
        sms_channel_1.SmsChannel])
], MessagingService);
//# sourceMappingURL=messaging.service.js.map
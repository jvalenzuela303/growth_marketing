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
var SmsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../database/prisma.service");
const sms_channel_1 = require("../messaging/channels/sms.channel");
const whatsapp_channel_1 = require("../messaging/channels/whatsapp.channel");
let SmsService = SmsService_1 = class SmsService {
    constructor(smsChannel, whatsAppChannel, prisma, config) {
        this.smsChannel = smsChannel;
        this.whatsAppChannel = whatsAppChannel;
        this.prisma = prisma;
        this.config = config;
        this.logger = new common_1.Logger(SmsService_1.name);
    }
    async sendSms(tenantId, to, message, leadId) {
        const result = await this.smsChannel.sendMessage({ to, content: message, channel: 'sms' });
        if (leadId) {
            await this.persist(tenantId, leadId, 'sms', to, message, result);
        }
        return result;
    }
    async sendWithFallback(tenantId, to, message, leadId) {
        if (this.whatsAppChannel.isAvailable()) {
            const waResult = await this.whatsAppChannel.sendMessage({
                to,
                content: message,
                channel: 'whatsapp',
            });
            if (waResult.success) {
                if (leadId)
                    await this.persist(tenantId, leadId, 'whatsapp', to, message, waResult);
                return { channel: 'whatsapp', result: waResult };
            }
            this.logger.warn(`WhatsApp falló para ${to}: ${waResult.error}. Usando SMS fallback.`);
        }
        if (!this.smsChannel.isAvailable()) {
            return {
                channel: 'none',
                result: { success: false, error: 'Ni WhatsApp ni SMS disponibles.' },
            };
        }
        const smsResult = await this.smsChannel.sendMessage({
            to,
            content: message,
            channel: 'sms',
        });
        if (leadId)
            await this.persist(tenantId, leadId, 'sms', to, message, smsResult);
        return { channel: 'sms', result: smsResult };
    }
    isSmsAvailable() {
        return this.smsChannel.isAvailable();
    }
    async persist(tenantId, leadId, channel, to, content, result) {
        try {
            await this.prisma.withTenant(tenantId, () => this.prisma.conversation.create({
                data: {
                    tenantId,
                    leadId,
                    channel,
                    role: 'assistant',
                    content,
                    status: result.success ? 'sent' : 'failed',
                    externalMessageId: result.externalMessageId,
                },
            }));
        }
        catch (err) {
            this.logger.warn(`No se pudo persistir SMS: ${err.message}`);
        }
    }
};
exports.SmsService = SmsService;
exports.SmsService = SmsService = SmsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sms_channel_1.SmsChannel,
        whatsapp_channel_1.WhatsAppChannel,
        prisma_service_1.PrismaService,
        config_1.ConfigService])
], SmsService);
//# sourceMappingURL=sms.service.js.map
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
var WhatsAppChannel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppChannel = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const META_API_VERSION = 'v19.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
let WhatsAppChannel = WhatsAppChannel_1 = class WhatsAppChannel {
    constructor(config) {
        this.config = config;
        this.channel = 'whatsapp';
        this.logger = new common_1.Logger(WhatsAppChannel_1.name);
    }
    isAvailable() {
        return !!this.config.get('META_WHATSAPP_TOKEN');
    }
    async sendMessage(options) {
        const phoneNumberId = this.config.get('META_WHATSAPP_PHONE_ID');
        const token = this.config.get('META_WHATSAPP_TOKEN');
        if (!phoneNumberId || !token) {
            this.logger.warn('WhatsApp no configurado: META_WHATSAPP_PHONE_ID o META_WHATSAPP_TOKEN faltantes.');
            return { success: false, error: 'WhatsApp no configurado.' };
        }
        const phone = this.normalizePhone(options.to);
        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'text',
                text: { body: options.content || '' },
            };
            const response = await axios_1.default.post(`${META_API_BASE}/${phoneNumberId}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            const msgId = response.data?.messages?.[0]?.id;
            this.logger.debug(`WhatsApp enviado: ${msgId} → ${phone}`);
            return { success: true, externalMessageId: msgId };
        }
        catch (error) {
            return this.handleApiError(error, phone);
        }
    }
    async sendTemplate(to, templateName, params) {
        const phoneNumberId = this.config.get('META_WHATSAPP_PHONE_ID');
        const token = this.config.get('META_WHATSAPP_TOKEN');
        if (!phoneNumberId || !token) {
            return { success: false, error: 'WhatsApp no configurado.' };
        }
        const phone = this.normalizePhone(to);
        const components = Object.keys(params).length > 0
            ? [
                {
                    type: 'body',
                    parameters: Object.entries(params).map(([, value]) => ({
                        type: 'text',
                        text: value,
                    })),
                },
            ]
            : [];
        try {
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'es_LA' },
                    components,
                },
            };
            const response = await axios_1.default.post(`${META_API_BASE}/${phoneNumberId}/messages`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000,
            });
            const msgId = response.data?.messages?.[0]?.id;
            this.logger.debug(`Template "${templateName}" enviado: ${msgId} → ${phone}`);
            return { success: true, externalMessageId: msgId };
        }
        catch (error) {
            return this.handleApiError(error, phone);
        }
    }
    normalizePhone(phone) {
        return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    }
    handleApiError(error, destination) {
        const status = error.response?.status;
        const errorData = error.response?.data;
        const errorCode = errorData?.error?.code;
        const errorMsg = errorData?.error?.message || error.message;
        this.logger.error(`Error WhatsApp → ${destination}: HTTP ${status}, code ${errorCode}: ${errorMsg}`);
        return {
            success: false,
            error: `WhatsApp API error ${errorCode}: ${errorMsg}`,
        };
    }
};
exports.WhatsAppChannel = WhatsAppChannel;
exports.WhatsAppChannel = WhatsAppChannel = WhatsAppChannel_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], WhatsAppChannel);
//# sourceMappingURL=whatsapp.channel.js.map
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
var EmailChannel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailChannel = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const SENDGRID_API_BASE = 'https://api.sendgrid.com/v3';
let EmailChannel = EmailChannel_1 = class EmailChannel {
    constructor(config) {
        this.config = config;
        this.channel = 'email';
        this.logger = new common_1.Logger(EmailChannel_1.name);
    }
    isAvailable() {
        return !!this.config.get('SENDGRID_API_KEY') && !!this.config.get('SENDGRID_FROM_EMAIL');
    }
    async sendMessage(options) {
        const apiKey = this.config.get('SENDGRID_API_KEY');
        const fromEmail = this.config.get('SENDGRID_FROM_EMAIL', 'noreply@thegrowthengine.com');
        const fromName = this.config.get('SENDGRID_FROM_NAME', 'The Growth Engine');
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
                    headers: { 'X-Message-ID': options.metadata.messageId },
                }),
            };
            const response = await axios_1.default.post(`${SENDGRID_API_BASE}/mail/send`, payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });
            const externalMessageId = response.headers['x-message-id'];
            this.logger.debug(`Email enviado: ${externalMessageId} → ${options.to}`);
            return { success: true, externalMessageId };
        }
        catch (error) {
            return this.handleApiError(error, options.to);
        }
    }
    async sendTemplate(to, templateName, params) {
        const apiKey = this.config.get('SENDGRID_API_KEY');
        const fromEmail = this.config.get('SENDGRID_FROM_EMAIL', 'noreply@thegrowthengine.com');
        const fromName = this.config.get('SENDGRID_FROM_NAME', 'The Growth Engine');
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
            const response = await axios_1.default.post(`${SENDGRID_API_BASE}/mail/send`, payload, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 15000,
            });
            const externalMessageId = response.headers['x-message-id'];
            this.logger.debug(`Template email enviado: ${externalMessageId} → ${to}`);
            return { success: true, externalMessageId };
        }
        catch (error) {
            return this.handleApiError(error, to);
        }
    }
    handleApiError(error, destination) {
        const status = error.response?.status;
        const errors = error.response?.data?.errors;
        const errorMsg = errors?.[0]?.message || error.message;
        this.logger.error(`Error SendGrid → ${destination}: HTTP ${status}: ${errorMsg}`);
        return { success: false, error: `SendGrid error: ${errorMsg}` };
    }
};
exports.EmailChannel = EmailChannel;
exports.EmailChannel = EmailChannel = EmailChannel_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailChannel);
//# sourceMappingURL=email.channel.js.map
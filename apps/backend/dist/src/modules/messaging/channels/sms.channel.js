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
var SmsChannel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsChannel = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let SmsChannel = SmsChannel_1 = class SmsChannel {
    constructor(config) {
        this.config = config;
        this.channel = 'sms';
        this.logger = new common_1.Logger(SmsChannel_1.name);
    }
    isAvailable() {
        return (!!this.config.get('TWILIO_ACCOUNT_SID') &&
            !!this.config.get('TWILIO_AUTH_TOKEN') &&
            !!this.config.get('TWILIO_FROM_NUMBER'));
    }
    async sendMessage(options) {
        const accountSid = this.config.get('TWILIO_ACCOUNT_SID', '');
        const authToken = this.config.get('TWILIO_AUTH_TOKEN', '');
        const from = this.config.get('TWILIO_FROM_NUMBER', '');
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
                method: 'POST',
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
                signal: AbortSignal.timeout(10_000),
            });
            const data = await res.json();
            if (!res.ok) {
                const msg = data?.message ?? `HTTP ${res.status}`;
                this.logger.error(`Twilio SMS error → ${to}: ${msg}`);
                return { success: false, error: `Twilio error: ${msg}` };
            }
            this.logger.debug(`SMS enviado: ${data.sid} → ${to}`);
            return { success: true, externalMessageId: data.sid };
        }
        catch (err) {
            this.logger.error(`Twilio SMS excepción → ${to}: ${err.message}`);
            return { success: false, error: err.message };
        }
    }
    async sendTemplate(to, templateName, params) {
        let body = templateName;
        for (const [key, val] of Object.entries(params)) {
            body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val);
        }
        return this.sendMessage({ to, content: body, channel: 'sms' });
    }
    normalizePhone(phone) {
        const cleaned = phone.replace(/[\s\-\(\)]/g, '');
        return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
    }
};
exports.SmsChannel = SmsChannel;
exports.SmsChannel = SmsChannel = SmsChannel_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SmsChannel);
//# sourceMappingURL=sms.channel.js.map
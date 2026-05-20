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
var InstagramChannel_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramChannel = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("axios");
const META_API_VERSION = 'v19.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
let InstagramChannel = InstagramChannel_1 = class InstagramChannel {
    constructor(config) {
        this.config = config;
        this.channel = 'instagram';
        this.logger = new common_1.Logger(InstagramChannel_1.name);
    }
    isAvailable() {
        return !!this.config.get('META_APP_ID');
    }
    async sendMessage(options) {
        const pageId = options.metadata?.pageId;
        const accessToken = options.metadata?.accessToken;
        if (!pageId || !accessToken) {
            this.logger.warn('InstagramChannel: falta pageId o accessToken en metadata.');
            return { success: false, error: 'Instagram no configurado para este tenant.' };
        }
        try {
            const res = await axios_1.default.post(`${META_API_BASE}/${pageId}/messages`, {
                recipient: { id: options.to },
                message: { text: options.content || '' },
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10_000,
            });
            const msgId = res.data?.message_id;
            this.logger.debug(`Instagram DM enviado: ${msgId} → ${options.to}`);
            return { success: true, externalMessageId: msgId };
        }
        catch (error) {
            return this.handleApiError(error, options.to);
        }
    }
    async sendTemplate(to, _templateName, _params) {
        this.logger.warn('Instagram no soporta templates nativos — enviar como texto.');
        return { success: false, error: 'Templates no soportados en Instagram DM.' };
    }
    handleApiError(error, destination) {
        const status = error.response?.status;
        const errData = error.response?.data;
        const errCode = errData?.error?.code;
        const errMsg = errData?.error?.message || error.message;
        this.logger.error(`Error Instagram DM → ${destination}: HTTP ${status}, code ${errCode}: ${errMsg}`);
        return { success: false, error: `Instagram API error ${errCode}: ${errMsg}` };
    }
};
exports.InstagramChannel = InstagramChannel;
exports.InstagramChannel = InstagramChannel = InstagramChannel_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], InstagramChannel);
//# sourceMappingURL=instagram.channel.js.map
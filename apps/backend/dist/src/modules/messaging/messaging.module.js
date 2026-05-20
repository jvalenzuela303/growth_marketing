"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingModule = void 0;
const common_1 = require("@nestjs/common");
const messaging_service_1 = require("./messaging.service");
const whatsapp_channel_1 = require("./channels/whatsapp.channel");
const email_channel_1 = require("./channels/email.channel");
const instagram_channel_1 = require("./channels/instagram.channel");
const sms_channel_1 = require("./channels/sms.channel");
let MessagingModule = class MessagingModule {
};
exports.MessagingModule = MessagingModule;
exports.MessagingModule = MessagingModule = __decorate([
    (0, common_1.Module)({
        providers: [messaging_service_1.MessagingService, whatsapp_channel_1.WhatsAppChannel, email_channel_1.EmailChannel, instagram_channel_1.InstagramChannel, sms_channel_1.SmsChannel],
        exports: [messaging_service_1.MessagingService, sms_channel_1.SmsChannel, whatsapp_channel_1.WhatsAppChannel],
    })
], MessagingModule);
//# sourceMappingURL=messaging.module.js.map
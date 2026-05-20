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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MessengerController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessengerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const messenger_service_1 = require("./messenger.service");
let MessengerController = MessengerController_1 = class MessengerController {
    constructor(service) {
        this.service = service;
        this.logger = new common_1.Logger(MessengerController_1.name);
    }
    verify(mode, token, challenge, res) {
        const result = this.service.verifyWebhook(mode, token, challenge);
        if (result) {
            res.status(200).send(result);
        }
        else {
            res.status(403).send('Forbidden');
        }
    }
    async receive(body) {
        if (body.object !== 'page')
            return { ok: false };
        for (const entry of body.entry ?? []) {
            const pageId = entry.id;
            for (const event of entry.messaging ?? []) {
                if (event.message?.text) {
                    this.service.handleInboundMessage({
                        senderId: event.sender.id,
                        recipientId: event.recipient.id,
                        text: event.message.text,
                        timestamp: event.timestamp,
                        mid: event.message.mid,
                    }, pageId).catch((err) => this.logger.error(`handleInboundMessage error: ${err.message}`));
                }
            }
        }
        return { ok: true };
    }
};
exports.MessengerController = MessengerController;
__decorate([
    (0, common_1.Get)('webhook'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MessengerController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook Facebook Messenger' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessengerController.prototype, "receive", null);
exports.MessengerController = MessengerController = MessengerController_1 = __decorate([
    (0, swagger_1.ApiTags)('messenger'),
    (0, common_1.Controller)('messenger'),
    __metadata("design:paramtypes", [messenger_service_1.MessengerService])
], MessengerController);
//# sourceMappingURL=messenger.controller.js.map
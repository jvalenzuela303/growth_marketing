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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const chat_message_dto_1 = require("./dto/chat-message.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    sendMessage(tenantId, dto) {
        return this.chatService.sendMessage(tenantId, dto.leadId, dto.message, dto.channel ?? 'chat');
    }
    async streamMessage(tenantId, leadId, message, model, res) {
        await this.chatService.streamMessage(tenantId, leadId, message, res, model);
    }
    getModels() {
        return [
            { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', provider: 'anthropic', icon: 'claude' },
            { id: 'claude-opus-4-6', label: 'Claude Opus 4.6', provider: 'anthropic', icon: 'claude' },
            { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', provider: 'anthropic', icon: 'claude' },
            { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', icon: 'openai' },
            { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', icon: 'openai' },
            { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'google', icon: 'google' },
        ];
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('message'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, chat_message_dto_1.ChatMessageDto]),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('stream'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('leadId')),
    __param(2, (0, common_1.Query)('message')),
    __param(3, (0, common_1.Query)('model')),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "streamMessage", null);
__decorate([
    (0, common_1.Get)('models'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ChatController.prototype, "getModels", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map
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
exports.QuizController = void 0;
const common_1 = require("@nestjs/common");
const quiz_service_1 = require("./quiz.service");
const submit_quiz_dto_1 = require("./dto/submit-quiz.dto");
const throttler_1 = require("@nestjs/throttler");
let QuizController = class QuizController {
    constructor(quizService) {
        this.quizService = quizService;
    }
    async getPublicResult(leadId) {
        return this.quizService.getPublicResult(leadId);
    }
    async getPublicConfig(tenantSlug, funnelSlug) {
        return this.quizService.getPublicQuizConfig(tenantSlug, funnelSlug);
    }
    async submit(tenantSlug, funnelSlug, dto, req) {
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress;
        return this.quizService.submitQuiz(tenantSlug, funnelSlug, dto, ipAddress);
    }
};
exports.QuizController = QuizController;
__decorate([
    (0, common_1.Get)('result/:leadId'),
    __param(0, (0, common_1.Param)('leadId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "getPublicResult", null);
__decorate([
    (0, common_1.Get)(':tenantSlug/:funnelSlug'),
    __param(0, (0, common_1.Param)('tenantSlug')),
    __param(1, (0, common_1.Param)('funnelSlug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "getPublicConfig", null);
__decorate([
    (0, common_1.Post)(':tenantSlug/:funnelSlug/submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Param)('tenantSlug')),
    __param(1, (0, common_1.Param)('funnelSlug')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, submit_quiz_dto_1.SubmitQuizDto, Object]),
    __metadata("design:returntype", Promise)
], QuizController.prototype, "submit", null);
exports.QuizController = QuizController = __decorate([
    (0, common_1.Controller)('quiz'),
    __metadata("design:paramtypes", [quiz_service_1.QuizService])
], QuizController);
//# sourceMappingURL=quiz.controller.js.map
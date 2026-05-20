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
var QuizService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const leads_service_1 = require("../leads/leads.service");
let QuizService = QuizService_1 = class QuizService {
    constructor(prisma, leadsService) {
        this.prisma = prisma;
        this.leadsService = leadsService;
        this.logger = new common_1.Logger(QuizService_1.name);
    }
    async getPublicQuizConfig(tenantSlug, funnelSlug) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
            select: { id: true, isActive: true },
        });
        if (!tenant || !tenant.isActive) {
            throw new common_1.NotFoundException('Funnel no encontrado.');
        }
        const funnel = await this.prisma.funnel.findFirst({
            where: {
                tenantId: tenant.id,
                slug: funnelSlug,
                status: 'active',
            },
            select: {
                id: true,
                name: true,
                description: true,
                quizConfig: true,
                landingConfig: true,
                resultsConfig: true,
                status: true,
            },
        });
        if (!funnel) {
            throw new common_1.NotFoundException('Funnel no encontrado o no está activo.');
        }
        this.prisma.leadEvent.create({
            data: {
                tenantId: tenant.id,
                funnelId: funnel.id,
                eventType: 'page_view',
                eventData: { source: 'quiz_public' },
            },
        }).catch((err) => this.logger.warn(`No se pudo registrar page_view: ${err.message}`));
        return {
            funnelId: funnel.id,
            tenantSlug,
            name: funnel.name,
            description: funnel.description,
            quizConfig: funnel.quizConfig,
            landingConfig: funnel.landingConfig,
            resultsConfig: funnel.resultsConfig,
        };
    }
    async submitQuiz(tenantSlug, funnelSlug, dto, ipAddress) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug: tenantSlug },
            select: { id: true, isActive: true, maxLeadsPerMonth: true },
        });
        if (!tenant || !tenant.isActive) {
            throw new common_1.NotFoundException('Tenant no encontrado.');
        }
        const funnel = await this.prisma.funnel.findFirst({
            where: { tenantId: tenant.id, slug: funnelSlug, status: 'active' },
            select: { id: true, quizConfig: true },
        });
        if (!funnel) {
            throw new common_1.NotFoundException('Funnel no encontrado o no está activo.');
        }
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const leadsThisMonth = await this.prisma.lead.count({
            where: {
                tenantId: tenant.id,
                createdAt: { gte: startOfMonth },
                deletedAt: null,
            },
        });
        if (leadsThisMonth >= tenant.maxLeadsPerMonth) {
            throw new common_1.BadRequestException('El límite mensual de leads ha sido alcanzado.');
        }
        const lead = await this.leadsService.captureFromQuiz({
            funnelId: funnel.id,
            tenantSlug,
            answers: dto.answers,
            leadData: dto.leadData,
            completionPercentage: dto.completionPercentage,
            sessionId: dto.sessionId,
            metadata: dto.metadata,
        }, tenant.id, ipAddress);
        this.prisma.funnel.update({
            where: { id: funnel.id },
            data: { totalCompletions: { increment: 1 } },
        }).catch((err) => this.logger.warn(`No se pudo incrementar totalCompletions: ${err.message}`));
        return {
            leadId: lead.id,
            status: 'processing',
            message: 'Tus resultados están siendo calculados.',
        };
    }
    async getPublicResult(leadId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                id: true,
                segment: true,
                quizScore: true,
                behaviorScore: true,
                engagementScore: true,
                demographicScore: true,
                funnelId: true,
            },
        });
        if (!lead) {
            throw new common_1.NotFoundException('Lead no encontrado.');
        }
        if (lead.segment === null) {
            return {
                segment: null,
                totalScore: null,
                status: 'processing',
                resultConfig: null,
            };
        }
        const funnel = await this.prisma.funnel.findUnique({
            where: { id: lead.funnelId },
            select: { resultsConfig: true },
        });
        const resultsConfig = funnel?.resultsConfig ?? null;
        let segmentConfig = null;
        if (resultsConfig && typeof resultsConfig === 'object') {
            const entry = resultsConfig[lead.segment];
            segmentConfig = entry && typeof entry === 'object'
                ? entry
                : null;
        }
        const totalScore = lead.quizScore + lead.behaviorScore + lead.engagementScore + lead.demographicScore;
        return {
            segment: lead.segment,
            totalScore,
            status: 'ready',
            resultConfig: segmentConfig,
        };
    }
};
exports.QuizService = QuizService;
exports.QuizService = QuizService = QuizService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        leads_service_1.LeadsService])
], QuizService);
//# sourceMappingURL=quiz.service.js.map
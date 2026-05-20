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
var ScoringProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScoringProcessor = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const axios_1 = require("axios");
const leads_service_1 = require("../modules/leads/leads.service");
const prisma_service_1 = require("../database/prisma.service");
const notifications_service_1 = require("../modules/notifications/notifications.service");
const shared_types_1 = require("@growth-engine/shared-types");
let ScoringProcessor = ScoringProcessor_1 = class ScoringProcessor {
    constructor(config, leadsService, prisma, notifications) {
        this.config = config;
        this.leadsService = leadsService;
        this.prisma = prisma;
        this.notifications = notifications;
        this.logger = new common_1.Logger(ScoringProcessor_1.name);
    }
    onModuleInit() {
        this.worker = new bullmq_1.Worker('scoring', async (job) => this.process(job), {
            connection: {
                host: this.config.get('REDIS_HOST', 'localhost'),
                port: this.config.get('REDIS_PORT', 6379),
                password: this.config.get('REDIS_PASSWORD'),
                db: this.config.get('REDIS_DB', 0),
            },
            concurrency: Number(this.config.get('SCORING_WORKER_CONCURRENCY', 5)),
        });
        this.worker.on('completed', (job) => this.logger.debug(`Job scoring completado: ${job.id} (lead: ${job.data.leadId})`));
        this.worker.on('failed', (job, err) => this.logger.error(`Job scoring fallido: ${job?.id} — ${err.message}`));
        this.logger.log('ScoringProcessor iniciado.');
    }
    async onModuleDestroy() {
        await this.worker?.close();
    }
    async process(job) {
        const { leadId, tenantId } = job.data;
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: {
                id: true,
                quizAnswers: true,
                behaviorData: true,
                funnelId: true,
                source: true,
                utmCampaign: true,
                quizCompletionPercentage: true,
            },
        }));
        if (!lead) {
            this.logger.warn(`Lead no encontrado para scoring: ${leadId}`);
            return;
        }
        let scoreResult;
        const aiEngineUrl = this.config.get('AI_ENGINE_URL', 'http://localhost:8000');
        try {
            const response = await axios_1.default.post(`${aiEngineUrl}/score`, {
                lead_id: leadId,
                tenant_id: tenantId,
                quiz_answers: lead.quizAnswers,
                behavior_data: lead.behaviorData,
                metadata: {
                    source: lead.source,
                    utm_campaign: lead.utmCampaign,
                    completion_percentage: lead.quizCompletionPercentage,
                },
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': this.config.get('INTERNAL_API_SECRET', ''),
                },
            });
            scoreResult = response.data;
            this.logger.debug(`AI Engine respondió para ${leadId}: score=${scoreResult.total_score}, segment=${scoreResult.segment}`);
        }
        catch (error) {
            this.logger.warn(`AI Engine no disponible para ${leadId}: ${error.message}. Usando scoring fallback.`);
            scoreResult = this.calculateFallbackScore(lead);
        }
        await this.leadsService.calculateAndUpdateScore(tenantId, leadId, {
            quizScore: Math.min(scoreResult.quiz_score, 40),
            behaviorScore: Math.min(scoreResult.behavior_score, 30),
            engagementScore: Math.min(scoreResult.engagement_score, 20),
            demographicScore: Math.min(scoreResult.demographic_score, 10),
        }, {
            segment: scoreResult.segment,
            pathology: scoreResult.pathology,
            pathologyConfidence: scoreResult.pathology_confidence,
            classifiedModel: scoreResult.model,
        });
        try {
            const behaviorData = lead.behaviorData || {};
            const predictRes = await axios_1.default.post(`${aiEngineUrl}/predict`, {
                lead_id: leadId,
                total_score: scoreResult.total_score,
                quiz_score: scoreResult.quiz_score,
                behavior_score: scoreResult.behavior_score,
                engagement_score: scoreResult.engagement_score,
                demographic_score: scoreResult.demographic_score,
                visits: behaviorData.visits ?? 0,
                asked_price: behaviorData.asked_price_question ?? false,
                requested_demo: behaviorData.requested_demo ?? false,
                conversation_rounds: behaviorData.conversation_rounds ?? 0,
            }, { timeout: 10000 });
            await this.prisma.withTenant(tenantId, () => this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    conversionProbability: predictRes.data.conversion_probability,
                    conversionLabel: predictRes.data.label,
                    predictionUpdatedAt: new Date(),
                },
            }));
            this.logger.debug(`Predicción guardada para ${leadId}: prob=${predictRes.data.conversion_probability}, label=${predictRes.data.label}`);
        }
        catch (err) {
            this.logger.warn(`Predicción fallida para ${leadId}: ${err.message}`);
        }
        if (scoreResult.total_score >= 80) {
            const leadRecord = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findUnique({
                where: { id: leadId },
                select: { id: true, firstName: true, lastName: true, phone: true },
            }));
            if (leadRecord) {
                const fullName = [leadRecord.firstName, leadRecord.lastName].filter(Boolean).join(' ') || 'Lead';
                this.notifications.notifyHotLead(tenantId, {
                    id: leadRecord.id,
                    name: fullName,
                    score: scoreResult.total_score,
                    phone: leadRecord.phone,
                }).catch(() => { });
            }
        }
    }
    calculateFallbackScore(lead) {
        const completionPct = lead.quizCompletionPercentage || 0;
        const quizScore = Math.floor((completionPct / 100) * 40);
        const behaviorData = lead.behaviorData || {};
        const behaviorScore = Math.min((behaviorData.visits || 0) * 3 +
            (behaviorData.pricing_page_clicks || 0) * 5 +
            Math.min((behaviorData.total_time_seconds || 0) / 30, 10), 30);
        const totalScore = quizScore + behaviorScore;
        const segment = (0, shared_types_1.getSegmentFromScore)(totalScore);
        return {
            quiz_score: quizScore,
            behavior_score: behaviorScore,
            engagement_score: 0,
            demographic_score: 0,
            total_score: totalScore,
            segment,
            model: 'fallback-v1',
        };
    }
};
exports.ScoringProcessor = ScoringProcessor;
exports.ScoringProcessor = ScoringProcessor = ScoringProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        leads_service_1.LeadsService,
        prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService])
], ScoringProcessor);
//# sourceMappingURL=scoring.processor.js.map
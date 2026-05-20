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
var FollowUpScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowUpScheduler = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const inject_queue_decorator_1 = require("./inject-queue.decorator");
const prisma_service_1 = require("../database/prisma.service");
let FollowUpScheduler = FollowUpScheduler_1 = class FollowUpScheduler {
    constructor(config, prisma, messagingQueue) {
        this.config = config;
        this.prisma = prisma;
        this.messagingQueue = messagingQueue;
        this.logger = new common_1.Logger(FollowUpScheduler_1.name);
        this.ELIGIBLE_SEGMENTS = ['caliente', 'tibio', 'frio'];
        this.SILENCE_HOURS = 48;
        this.MAX_FOLLOWUPS_30D = 4;
    }
    async onModuleInit() {
        await this.messagingQueue.add('followup-scan', {}, {
            repeat: { every: 24 * 60 * 60 * 1000 },
            jobId: 'followup-scan-daily',
            priority: 5,
        });
        this.logger.log('FollowUpScheduler registrado — escaneando leads cada 24h.');
    }
    async onModuleDestroy() {
        await this.messagingQueue.removeRepeatable('followup-scan', { every: 24 * 60 * 60 * 1000 })
            .catch(() => { });
    }
    async runScan() {
        const silenceCutoff = new Date(Date.now() - this.SILENCE_HOURS * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        this.logger.log('Iniciando escaneo de follow-ups automáticos…');
        const tenants = await this.prisma.tenant.findMany({
            select: { id: true, name: true },
        });
        let totalEnqueued = 0;
        for (const tenant of tenants) {
            try {
                const enqueued = await this.scanTenant(tenant.id, silenceCutoff, thirtyDaysAgo);
                totalEnqueued += enqueued;
            }
            catch (err) {
                this.logger.error(`Error escaneando tenant ${tenant.id}: ${err.message}`);
            }
        }
        this.logger.log(`Follow-up scan completo. ${totalEnqueued} mensajes encolados.`);
    }
    async scanTenant(tenantId, silenceCutoff, thirtyDaysAgo) {
        const leads = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findMany({
            where: {
                tenantId,
                deletedAt: null,
                segment: { in: this.ELIGIBLE_SEGMENTS },
                phone: { not: null },
                pipelineStage: { notIn: ['cerrado_ganado', 'cerrado_perdido'] },
            },
            select: {
                id: true,
                phone: true,
                email: true,
                firstName: true,
                segment: true,
            },
        }));
        const leadIds = leads.map((l) => l.id);
        if (leadIds.length === 0)
            return 0;
        const [recentOutbound, recentFollowups] = await Promise.all([
            this.prisma.withTenant(tenantId, () => this.prisma.conversation.findMany({
                where: {
                    tenantId,
                    leadId: { in: leadIds },
                    role: { in: ['assistant', 'human_agent'] },
                    createdAt: { gte: silenceCutoff },
                },
                select: { leadId: true },
                distinct: ['leadId'],
            })),
            this.prisma.withTenant(tenantId, () => this.prisma.leadEvent.groupBy({
                by: ['leadId'],
                where: {
                    tenantId,
                    leadId: { in: leadIds },
                    eventType: 'auto_followup',
                    createdAt: { gte: thirtyDaysAgo },
                },
                _count: { id: true },
            })),
        ]);
        const silencedIds = new Set(recentOutbound.map((c) => c.leadId));
        const followupCounts = new Map(recentFollowups.map((r) => [r.leadId, r._count.id]));
        let enqueued = 0;
        for (const lead of leads) {
            if (silencedIds.has(lead.id))
                continue;
            const count = followupCounts.get(lead.id) ?? 0;
            if (count >= this.MAX_FOLLOWUPS_30D)
                continue;
            const templateName = this.pickTemplate(lead.segment);
            if (!templateName)
                continue;
            await this.messagingQueue.add('auto-followup', {
                leadId: lead.id,
                tenantId,
                phone: lead.phone,
                templateName,
                params: { name: lead.firstName || 'ahí' },
            }, { priority: 4 });
            enqueued++;
        }
        return enqueued;
    }
    pickTemplate(segment) {
        const templates = {
            caliente: 'ge_warm_nurture_2',
            tibio: 'ge_warm_nurture_1',
            frio: 'ge_reengagement',
        };
        return templates[segment] ?? null;
    }
};
exports.FollowUpScheduler = FollowUpScheduler;
exports.FollowUpScheduler = FollowUpScheduler = FollowUpScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, inject_queue_decorator_1.InjectQueue)('messaging')),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        bullmq_1.Queue])
], FollowUpScheduler);
//# sourceMappingURL=followup.scheduler.js.map
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
var AnalyticsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const plan_guard_1 = require("../../common/guards/plan.guard");
const tenant_decorator_1 = require("../../common/decorators/tenant.decorator");
const prisma_service_1 = require("../../database/prisma.service");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = AnalyticsController_1 = class AnalyticsController {
    constructor(prisma, analyticsService) {
        this.prisma = prisma;
        this.analyticsService = analyticsService;
        this.logger = new common_1.Logger(AnalyticsController_1.name);
    }
    async getKpis(tenantId, funnelId) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return this.prisma.withTenant(tenantId, async () => {
            const baseWhere = {
                tenantId,
                deletedAt: null,
                ...(funnelId && { funnelId }),
            };
            const [leadsToday, leadsWeek, leadsMonth, segmentCounts, stageCounts, scoreAgg, topFunnels,] = await Promise.all([
                this.prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfToday } } }),
                this.prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfWeek } } }),
                this.prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfMonth } } }),
                this.prisma.lead.groupBy({
                    by: ['segment'],
                    where: { ...baseWhere, createdAt: { gte: startOfMonth } },
                    _count: { id: true },
                }),
                this.prisma.lead.groupBy({
                    by: ['pipelineStage'],
                    where: baseWhere,
                    _count: { id: true },
                }),
                this.prisma.lead.aggregate({
                    where: { ...baseWhere, createdAt: { gte: startOfMonth } },
                    _avg: {
                        quizScore: true,
                        behaviorScore: true,
                        engagementScore: true,
                        demographicScore: true,
                    },
                }),
                this.prisma.funnel.findMany({
                    where: { tenantId },
                    orderBy: { totalCompletions: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        totalViews: true,
                        totalStarts: true,
                        totalCompletions: true,
                        status: true,
                    },
                }),
            ]);
            const leadsWithCompletedQuiz = await this.prisma.lead.count({
                where: {
                    ...baseWhere,
                    createdAt: { gte: startOfMonth },
                    quizCompletionPercentage: { gte: 80 },
                },
            });
            const completionRate = leadsMonth > 0 ? leadsWithCompletedQuiz / leadsMonth : 0;
            const avg = scoreAgg._avg;
            const avgScore = avg.quizScore && avg.behaviorScore
                ? (avg.quizScore + avg.behaviorScore + (avg.engagementScore || 0) + (avg.demographicScore || 0))
                : 0;
            const segmentDistribution = segmentCounts.reduce((acc, item) => {
                acc[item.segment] = item._count.id;
                return acc;
            }, {});
            const pipelineDistribution = stageCounts.reduce((acc, item) => {
                acc[item.pipelineStage] = item._count.id;
                return acc;
            }, {});
            return {
                leads: {
                    today: leadsToday,
                    week: leadsWeek,
                    month: leadsMonth,
                },
                completionRate: Math.round(completionRate * 100) / 100,
                avgScore: Math.round(avgScore * 10) / 10,
                segmentDistribution,
                pipelineDistribution,
                topFunnels: topFunnels.map((f) => ({
                    ...f,
                    completionRate: f.totalStarts > 0
                        ? Math.round((f.totalCompletions / f.totalStarts) * 100) / 100
                        : 0,
                })),
                generatedAt: now.toISOString(),
            };
        });
    }
    async getEventTimeSeries(tenantId, eventType, from, to) {
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const toDate = to ? new Date(to) : new Date();
        return this.prisma.withTenant(tenantId, () => this.prisma.leadEvent.groupBy({
            by: ['eventType', 'createdAt'],
            where: {
                tenantId,
                ...(eventType && { eventType }),
                createdAt: { gte: fromDate, lte: toDate },
            },
            _count: { id: true },
            orderBy: { createdAt: 'asc' },
        }));
    }
    getFunnelAbandonmentStats(tenantId, funnelId) {
        return this.analyticsService.getFunnelAbandonmentStats(tenantId, funnelId);
    }
    getFinancialKpis(tenantId, range = '30d') {
        return this.analyticsService.getFinancialKpis(tenantId, range);
    }
    getAttribution(tenantId, range = '30d') {
        return this.analyticsService.getAttributionByChannel(tenantId, range);
    }
    async streamConversionAdvisor(tenantId, range = '30d', question, res) {
        return this.analyticsService.streamConversionAdvisor(res, tenantId, range, question);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('kpis'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('funnelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getKpis", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('eventType')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getEventTimeSeries", null);
__decorate([
    (0, common_1.Get)('funnels/:funnelId/abandonment'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Param)('funnelId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getFunnelAbandonmentStats", null);
__decorate([
    (0, common_1.Get)('financial-kpis'),
    (0, common_1.UseGuards)(plan_guard_1.PlanGuard),
    (0, plan_guard_1.RequiresPlan)('growth'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getFinancialKpis", null);
__decorate([
    (0, common_1.Get)('attribution'),
    (0, common_1.UseGuards)(plan_guard_1.PlanGuard),
    (0, plan_guard_1.RequiresPlan)('growth'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAttribution", null);
__decorate([
    (0, common_1.Post)('conversion-advisor'),
    (0, common_1.UseGuards)(plan_guard_1.PlanGuard),
    (0, plan_guard_1.RequiresPlan)('growth'),
    __param(0, (0, tenant_decorator_1.TenantId)()),
    __param(1, (0, common_1.Body)('range')),
    __param(2, (0, common_1.Body)('question')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "streamConversionAdvisor", null);
exports.AnalyticsController = AnalyticsController = AnalyticsController_1 = __decorate([
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map
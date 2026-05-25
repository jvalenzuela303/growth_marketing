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
var BudgetOptimizerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetOptimizerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let BudgetOptimizerService = BudgetOptimizerService_1 = class BudgetOptimizerService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(BudgetOptimizerService_1.name);
        this.ROAS_EXCELLENT = 4;
        this.ROAS_GOOD = 2;
        this.ROAS_BREAK_EVEN = 1;
        this.MIN_SPEND_SIGNIFICANCE = 10_000;
    }
    async getRecommendations(tenantId, days = 30) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const spendByCampaign = await this.prisma.$queryRaw `
      SELECT
        COALESCE(campaign_name, 'Sin nombre') AS campaign_name,
        LOWER(source) AS platform,
        COALESCE(SUM(spend_amount), 0) AS spend
      FROM ad_spend
      WHERE tenant_id = ${tenantId}::uuid
        AND period_start >= ${since}
      GROUP BY campaign_name, source
      ORDER BY spend DESC
    `;
        const dealsByCampaign = await this.prisma.$queryRaw `
      SELECT
        COALESCE(d.campaign_name, 'Sin nombre') AS campaign_name,
        COUNT(d.id) AS deals,
        COALESCE(SUM(d.amount), 0) AS revenue
      FROM deals d
      WHERE d.tenant_id = ${tenantId}::uuid
        AND d.stage = 'won'
        AND d.created_at >= ${since}
      GROUP BY d.campaign_name
    `;
        const leadsByCampaign = await this.prisma.$queryRaw `
      SELECT
        COALESCE(utm_campaign, 'Sin nombre') AS campaign_name,
        COUNT(*) AS leads
      FROM leads
      WHERE tenant_id = ${tenantId}::uuid
        AND deleted_at IS NULL
        AND created_at >= ${since}
        AND utm_campaign IS NOT NULL
      GROUP BY utm_campaign
    `;
        const toNum = (v) => parseFloat(String(v ?? 0)) || 0;
        const dealsMap = new Map();
        for (const d of dealsByCampaign) {
            dealsMap.set(d.campaign_name, { deals: toNum(d.deals), revenue: toNum(d.revenue) });
        }
        const leadsMap = new Map();
        for (const l of leadsByCampaign) {
            leadsMap.set(l.campaign_name, toNum(l.leads));
        }
        const recommendations = spendByCampaign
            .filter((s) => toNum(s.spend) >= this.MIN_SPEND_SIGNIFICANCE)
            .map((s) => {
            const spend = toNum(s.spend);
            const deal = dealsMap.get(s.campaign_name) ?? { deals: 0, revenue: 0 };
            const leads = leadsMap.get(s.campaign_name) ?? 0;
            const roas = spend > 0 ? Number((deal.revenue / spend).toFixed(2)) : 0;
            const cpl = leads > 0 && spend > 0 ? Math.round(spend / leads) : null;
            let action;
            let recommendation;
            let suggestedDelta;
            let confidence;
            if (roas >= this.ROAS_EXCELLENT) {
                action = 'increase';
                suggestedDelta = 40;
                confidence = deal.deals >= 3 ? 'high' : 'medium';
                recommendation = `ROAS ${roas}× — canal excelente. Aumenta presupuesto un 40% para escalar resultados.`;
            }
            else if (roas >= this.ROAS_GOOD) {
                action = 'increase';
                suggestedDelta = 20;
                confidence = 'medium';
                recommendation = `ROAS ${roas}× — rentable. Incremento moderado del 20% para validar el escalamiento.`;
            }
            else if (roas >= this.ROAS_BREAK_EVEN) {
                action = 'maintain';
                suggestedDelta = 0;
                confidence = 'medium';
                recommendation = `ROAS ${roas}× — punto de equilibrio. Optimiza creativos y segmentación antes de escalar.`;
            }
            else if (deal.deals === 0 && spend >= 50_000) {
                action = 'pause';
                suggestedDelta = -100;
                confidence = 'high';
                recommendation = `Sin conversiones con ${this.formatCLP(spend)} invertido. Pausa y revisa la segmentación.`;
            }
            else {
                action = 'decrease';
                suggestedDelta = -30;
                confidence = 'low';
                recommendation = `ROAS ${roas}× — por debajo de break-even. Reduce presupuesto un 30% y optimiza el embudo.`;
            }
            return {
                campaignName: s.campaign_name,
                platform: s.platform,
                currentSpend: spend,
                revenue: deal.revenue,
                roas,
                deals: deal.deals,
                cpl,
                action,
                recommendation,
                suggestedDelta,
                confidence,
            };
        })
            .sort((a, b) => b.roas - a.roas);
        const totalSpend = recommendations.reduce((s, r) => s + r.currentSpend, 0);
        const totalRevenue = recommendations.reduce((s, r) => s + r.revenue, 0);
        const globalRoas = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;
        const toIncrease = recommendations.filter((r) => r.action === 'increase').length;
        const toPause = recommendations.filter((r) => r.action === 'pause').length;
        const summary = recommendations.length === 0
            ? 'No hay campañas con gasto suficiente para analizar en este período.'
            : `${toIncrease} campaña${toIncrease !== 1 ? 's' : ''} listas para escalar, ` +
                `${toPause} campaña${toPause !== 1 ? 's' : ''} recomendada${toPause !== 1 ? 's' : ''} para pausar. ` +
                `ROAS global: ${globalRoas}×.`;
        return {
            generatedAt: new Date().toISOString(),
            periodDays: days,
            totalSpend,
            totalRevenue,
            globalRoas,
            recommendations,
            summary,
        };
    }
    formatCLP(n) {
        if (n >= 1_000_000)
            return `$${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000)
            return `$${Math.round(n / 1000)}K`;
        return `$${Math.round(n)}`;
    }
};
exports.BudgetOptimizerService = BudgetOptimizerService;
exports.BudgetOptimizerService = BudgetOptimizerService = BudgetOptimizerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BudgetOptimizerService);
//# sourceMappingURL=budget-optimizer.service.js.map
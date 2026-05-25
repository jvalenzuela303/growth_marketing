import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export type RecommendationAction = 'increase' | 'decrease' | 'pause' | 'maintain';

export interface BudgetRecommendation {
  campaignName:    string
  platform:        string
  currentSpend:    number
  revenue:         number
  roas:            number
  deals:           number
  cpl:             number | null
  action:          RecommendationAction
  recommendation:  string
  suggestedDelta:  number   // % change suggested (e.g. +30 or -50)
  confidence:      'high' | 'medium' | 'low'
}

export interface BudgetOptimizerResult {
  generatedAt:     string
  periodDays:      number
  totalSpend:      number
  totalRevenue:    number
  globalRoas:      number
  recommendations: BudgetRecommendation[]
  summary:         string
}

/**
 * BudgetOptimizerService — AI-driven budget redistribution recommendations.
 *
 * Analyzes actual spend, leads, and won deals per campaign over the last 30 days.
 * Produces ranked recommendations: scale winners, cut losers, pause zero-return.
 *
 * Phase 2 (future): auto-apply via Google Ads & Meta Marketing API.
 */
@Injectable()
export class BudgetOptimizerService {
  private readonly logger = new Logger(BudgetOptimizerService.name);

  // ROAS thresholds for categorization
  private readonly ROAS_EXCELLENT = 4;
  private readonly ROAS_GOOD      = 2;
  private readonly ROAS_BREAK_EVEN = 1;
  private readonly MIN_SPEND_SIGNIFICANCE = 10_000; // CLP — ignore micro campaigns

  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(tenantId: string, days = 30): Promise<BudgetOptimizerResult> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Spend per campaign
    const spendByCampaign = await this.prisma.$queryRaw<Array<{
      campaign_name: string
      platform:      string
      spend:         number
    }>>`
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

    // Won deals per campaign (join via campaign_name on deals)
    const dealsByCampaign = await this.prisma.$queryRaw<Array<{
      campaign_name: string
      deals:         bigint
      revenue:       number
    }>>`
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

    // Leads per campaign (via utm_campaign)
    const leadsByCampaign = await this.prisma.$queryRaw<Array<{
      campaign_name: string
      leads:         bigint
    }>>`
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

    // Prisma $queryRaw returns NUMERIC/DECIMAL as Decimal objects and COUNT as BigInt.
    // Use parseFloat(String()) for reliable coercion of both types.
    const toNum = (v: unknown): number => parseFloat(String(v ?? 0)) || 0;

    // Build lookup maps
    const dealsMap = new Map<string, { deals: number; revenue: number }>();
    for (const d of dealsByCampaign) {
      dealsMap.set(d.campaign_name, { deals: toNum(d.deals), revenue: toNum(d.revenue) });
    }

    const leadsMap = new Map<string, number>();
    for (const l of leadsByCampaign) {
      leadsMap.set(l.campaign_name, toNum(l.leads));
    }

    // Build recommendations
    const recommendations: BudgetRecommendation[] = spendByCampaign
      .filter((s) => toNum(s.spend) >= this.MIN_SPEND_SIGNIFICANCE)
      .map((s) => {
        const spend   = toNum(s.spend);
        const deal    = dealsMap.get(s.campaign_name) ?? { deals: 0, revenue: 0 };
        const leads   = leadsMap.get(s.campaign_name) ?? 0;
        const roas    = spend > 0 ? Number((deal.revenue / spend).toFixed(2)) : 0;
        const cpl     = leads > 0 && spend > 0 ? Math.round(spend / leads) : null;

        let action:        RecommendationAction;
        let recommendation: string;
        let suggestedDelta: number;
        let confidence:    'high' | 'medium' | 'low';

        if (roas >= this.ROAS_EXCELLENT) {
          action          = 'increase';
          suggestedDelta  = 40;
          confidence      = deal.deals >= 3 ? 'high' : 'medium';
          recommendation  = `ROAS ${roas}× — canal excelente. Aumenta presupuesto un 40% para escalar resultados.`;
        } else if (roas >= this.ROAS_GOOD) {
          action          = 'increase';
          suggestedDelta  = 20;
          confidence      = 'medium';
          recommendation  = `ROAS ${roas}× — rentable. Incremento moderado del 20% para validar el escalamiento.`;
        } else if (roas >= this.ROAS_BREAK_EVEN) {
          action          = 'maintain';
          suggestedDelta  = 0;
          confidence      = 'medium';
          recommendation  = `ROAS ${roas}× — punto de equilibrio. Optimiza creativos y segmentación antes de escalar.`;
        } else if (deal.deals === 0 && spend >= 50_000) {
          action          = 'pause';
          suggestedDelta  = -100;
          confidence      = 'high';
          recommendation  = `Sin conversiones con ${this.formatCLP(spend)} invertido. Pausa y revisa la segmentación.`;
        } else {
          action          = 'decrease';
          suggestedDelta  = -30;
          confidence      = 'low';
          recommendation  = `ROAS ${roas}× — por debajo de break-even. Reduce presupuesto un 30% y optimiza el embudo.`;
        }

        return {
          campaignName:   s.campaign_name,
          platform:       s.platform,
          currentSpend:   spend,
          revenue:        deal.revenue,
          roas,
          deals:          deal.deals,
          cpl,
          action,
          recommendation,
          suggestedDelta,
          confidence,
        };
      })
      .sort((a, b) => b.roas - a.roas);

    // Totals
    const totalSpend   = recommendations.reduce((s, r) => s + r.currentSpend, 0);
    const totalRevenue = recommendations.reduce((s, r) => s + r.revenue, 0);
    const globalRoas   = totalSpend > 0 ? Number((totalRevenue / totalSpend).toFixed(2)) : 0;

    // Summary insight
    const toIncrease = recommendations.filter((r) => r.action === 'increase').length;
    const toPause    = recommendations.filter((r) => r.action === 'pause').length;
    const summary = recommendations.length === 0
      ? 'No hay campañas con gasto suficiente para analizar en este período.'
      : `${toIncrease} campaña${toIncrease !== 1 ? 's' : ''} listas para escalar, ` +
        `${toPause} campaña${toPause !== 1 ? 's' : ''} recomendada${toPause !== 1 ? 's' : ''} para pausar. ` +
        `ROAS global: ${globalRoas}×.`;

    return {
      generatedAt:     new Date().toISOString(),
      periodDays:      days,
      totalSpend,
      totalRevenue,
      globalRoas,
      recommendations,
      summary,
    };
  }

  private formatCLP(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${Math.round(n / 1000)}K`;
    return `$${Math.round(n)}`;
  }
}

import { PrismaService } from '../../database/prisma.service';
export type RecommendationAction = 'increase' | 'decrease' | 'pause' | 'maintain';
export interface BudgetRecommendation {
    campaignName: string;
    platform: string;
    currentSpend: number;
    revenue: number;
    roas: number;
    deals: number;
    cpl: number | null;
    action: RecommendationAction;
    recommendation: string;
    suggestedDelta: number;
    confidence: 'high' | 'medium' | 'low';
}
export interface BudgetOptimizerResult {
    generatedAt: string;
    periodDays: number;
    totalSpend: number;
    totalRevenue: number;
    globalRoas: number;
    recommendations: BudgetRecommendation[];
    summary: string;
}
export declare class BudgetOptimizerService {
    private readonly prisma;
    private readonly logger;
    private readonly ROAS_EXCELLENT;
    private readonly ROAS_GOOD;
    private readonly ROAS_BREAK_EVEN;
    private readonly MIN_SPEND_SIGNIFICANCE;
    constructor(prisma: PrismaService);
    getRecommendations(tenantId: string, days?: number): Promise<BudgetOptimizerResult>;
    private formatCLP;
}

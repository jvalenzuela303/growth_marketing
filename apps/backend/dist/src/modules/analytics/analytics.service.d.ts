import { PrismaService } from '../../database/prisma.service';
import { DealsService } from '../deals/deals.service';
import type { Response } from 'express';
export declare class AnalyticsService {
    private readonly prisma;
    private readonly deals;
    private readonly logger;
    constructor(prisma: PrismaService, deals: DealsService);
    getFunnelAbandonmentStats(tenantId: string, funnelId: string): Promise<{
        funnelId: string;
        funnelName: string;
        totalStarts: number;
        totalCompletions: number;
        completionRate: number;
        steps: {
            questionIndex: number;
            questionText: string;
            views: number;
            completions: number;
            dropOffRate: number;
        }[];
    }>;
    getFinancialKpis(tenantId: string, range: string): Promise<{
        range: string;
        since: string;
        totalSpend: number;
        totalLeads: number;
        cpl: number;
        roas: number;
        totalRevenue: number;
        dealCount: number;
        currency: string;
    }>;
    getAttributionByChannel(tenantId: string, range: string): Promise<{
        range: string;
        since: string;
        channels: {
            source: string;
            leads: number;
            avgScore: number;
            adSpend: number;
            deals: number;
            revenue: number;
            cpl: number;
            conversionRate: number;
            roas: number;
        }[];
        totals: {
            leads: number;
            adSpend: number;
            deals: number;
            revenue: number;
        };
    }>;
    streamConversionAdvisor(res: Response, tenantId: string, range: string, question?: string): Promise<void>;
    private buildRuleBasedAnalysis;
    private parseDays;
}

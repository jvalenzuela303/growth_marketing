import type { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly prisma;
    private readonly analyticsService;
    private readonly logger;
    constructor(prisma: PrismaService, analyticsService: AnalyticsService);
    getKpis(tenantId: string, funnelId?: string): Promise<{
        leads: {
            today: number;
            week: number;
            month: number;
        };
        completionRate: number;
        avgScore: number;
        segmentDistribution: Record<string, number>;
        pipelineDistribution: Record<string, number>;
        topFunnels: {
            completionRate: number;
            name: string;
            id: string;
            slug: string;
            status: string;
            totalViews: number;
            totalStarts: number;
            totalCompletions: number;
        }[];
        generatedAt: string;
    }>;
    getEventTimeSeries(tenantId: string, eventType?: string, from?: string, to?: string): Promise<(import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.LeadEventGroupByOutputType, ("createdAt" | "eventType")[]> & {
        _count: {
            id: number;
        };
    })[]>;
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
    getFinancialKpis(tenantId: string, range?: string): Promise<{
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
    getAttribution(tenantId: string, range?: string): Promise<{
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
    streamConversionAdvisor(tenantId: string, range: string, question: string | undefined, res: Response): Promise<void>;
}

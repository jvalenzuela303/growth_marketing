import { PrismaService } from '../../database/prisma.service';
export declare class AdCampaignsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, adsAccountId?: string): Promise<{
        source: string;
        impressions: number;
        clicks: number;
        spend: number;
        leads: number;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        externalId: string;
        status: string;
        adsAccountId: string | null;
        objective: string | null;
        budgetDaily: import("@prisma/client/runtime/library").Decimal | null;
        budgetTotal: import("@prisma/client/runtime/library").Decimal | null;
        lastSyncedAt: Date | null;
    }[]>;
    syncCampaigns(tenantId: string): Promise<{
        synced: number;
        message: string;
    }>;
    getMetrics(tenantId: string, campaignId: string, range: string): Promise<{
        campaign: {
            name: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            externalId: string;
            status: string;
            adsAccountId: string | null;
            platform: string;
            objective: string | null;
            budgetDaily: import("@prisma/client/runtime/library").Decimal | null;
            budgetTotal: import("@prisma/client/runtime/library").Decimal | null;
            lastSyncedAt: Date | null;
        };
        metrics: {
            id: string;
            leads: number;
            tenantId: string;
            date: Date;
            impressions: number;
            clicks: number;
            campaignId: string;
            spend: import("@prisma/client/runtime/library").Decimal;
            reach: number;
            frequency: import("@prisma/client/runtime/library").Decimal;
            cpm: import("@prisma/client/runtime/library").Decimal;
            cpc: import("@prisma/client/runtime/library").Decimal;
            ctr: import("@prisma/client/runtime/library").Decimal;
        }[];
        range: string;
        days: number;
    }>;
    private parseDays;
}

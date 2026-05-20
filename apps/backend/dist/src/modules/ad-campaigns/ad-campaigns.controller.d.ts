import { AdCampaignsService } from './ad-campaigns.service';
export declare class AdCampaignsController {
    private readonly adCampaignsService;
    constructor(adCampaignsService: AdCampaignsService);
    findAll(tenantId: string, accountId?: string): Promise<{
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
    getMetrics(tenantId: string, id: string, range?: string): Promise<{
        campaign: {
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
            platform: string;
            lastSyncedAt: Date | null;
        };
        metrics: {
            id: string;
            leads: number;
            tenantId: string;
            impressions: number;
            clicks: number;
            date: Date;
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
}

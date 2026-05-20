import { AdSpendService } from './ad-spend.service';
import { CreateAdSpendDto } from './ad-spend.dto';
export declare class AdSpendController {
    private readonly adSpendService;
    constructor(adSpendService: AdSpendService);
    findAll(tenantId: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            currency: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            funnelId: string | null;
            source: string;
            campaignName: string | null;
            spendAmount: import("@prisma/client/runtime/library").Decimal;
            impressions: number;
            clicks: number;
            periodStart: Date;
            periodEnd: Date;
            campaignId: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    create(tenantId: string, dto: CreateAdSpendDto): Promise<{
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        source: string;
        campaignName: string | null;
        spendAmount: import("@prisma/client/runtime/library").Decimal;
        impressions: number;
        clicks: number;
        periodStart: Date;
        periodEnd: Date;
        campaignId: string | null;
    }>;
}

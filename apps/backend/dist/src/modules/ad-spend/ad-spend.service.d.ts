import { PrismaService } from '../../database/prisma.service';
import { CreateAdSpendDto } from './ad-spend.dto';
export declare class AdSpendService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(tenantId: string, page: number, limit: number): Promise<{
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

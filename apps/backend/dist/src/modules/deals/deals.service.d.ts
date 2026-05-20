import { PrismaService } from '../../database/prisma.service';
import { MetaCapiService } from '../webhooks/meta-capi.service';
import { CreateDealDto } from './dto/create-deal.dto';
export declare class DealsService {
    private readonly prisma;
    private readonly metaCapi;
    constructor(prisma: PrismaService, metaCapi: MetaCapiService);
    create(tenantId: string, userId: string, dto: CreateDealDto): Promise<{
        lead: {
            email: string;
            phone: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        source: string;
        notes: string | null;
        leadId: string;
        closedAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        adsAccountId: string | null;
        campaignName: string | null;
        stage: string;
        createdBy: string | null;
    }>;
    findAll(tenantId: string, params: {
        stage?: string;
        leadId?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            lead: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            currency: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            funnelId: string | null;
            source: string;
            notes: string | null;
            leadId: string;
            closedAt: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            adsAccountId: string | null;
            campaignName: string | null;
            stage: string;
            createdBy: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
            revenue: number;
        };
    }>;
    findOne(tenantId: string, id: string): Promise<{
        lead: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        source: string;
        notes: string | null;
        leadId: string;
        closedAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        adsAccountId: string | null;
        campaignName: string | null;
        stage: string;
        createdBy: string | null;
    }>;
    update(tenantId: string, id: string, dto: Partial<CreateDealDto>): Promise<{
        lead: {
            email: string;
            phone: string;
        };
    } & {
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        source: string;
        notes: string | null;
        leadId: string;
        closedAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        adsAccountId: string | null;
        campaignName: string | null;
        stage: string;
        createdBy: string | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        id: string;
        currency: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        funnelId: string | null;
        source: string;
        notes: string | null;
        leadId: string;
        closedAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        adsAccountId: string | null;
        campaignName: string | null;
        stage: string;
        createdBy: string | null;
    }>;
    aggregateRevenue(tenantId: string, since: Date): Promise<{
        totalRevenue: number;
        dealCount: number;
    }>;
    exportCsv(tenantId: string, filters: {
        stage?: string;
        leadId?: string;
    }): Promise<string>;
    private toCsv;
}

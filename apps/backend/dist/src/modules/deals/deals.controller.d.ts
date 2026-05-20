import { Response } from 'express';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { CurrentUserPayload } from '../../common/decorators/tenant.decorator';
export declare class DealsController {
    private readonly dealsService;
    constructor(dealsService: DealsService);
    create(tenantId: string, user: CurrentUserPayload, dto: CreateDealDto): Promise<{
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
    findAll(tenantId: string, stage?: string, leadId?: string, page?: string, limit?: string): Promise<{
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
    exportCsv(tenantId: string, res: Response, stage?: string, leadId?: string): Promise<void>;
}

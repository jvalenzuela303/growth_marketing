import { PrismaService } from '../../database/prisma.service';
import { CreateAdAccountDto } from './dto/create-ad-account.dto';
import { UpdateAdAccountDto } from './dto/update-ad-account.dto';
export declare class AdAccountsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<{
        accessToken: string;
        campaignCount: number;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        platform: string;
        lastSyncedAt: Date | null;
        externalAccountId: string;
        isDefault: boolean;
        syncErrorMessage: string | null;
    }[]>;
    findOne(tenantId: string, id: string): Promise<{
        accessToken: string;
        campaignCount: number;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        platform: string;
        lastSyncedAt: Date | null;
        externalAccountId: string;
        isDefault: boolean;
        syncErrorMessage: string | null;
    }>;
    create(tenantId: string, dto: CreateAdAccountDto): Promise<{
        accessToken: string;
        campaignCount: number;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        platform: string;
        lastSyncedAt: Date | null;
        externalAccountId: string;
        isDefault: boolean;
        syncErrorMessage: string | null;
    }>;
    update(tenantId: string, id: string, dto: UpdateAdAccountDto): Promise<{
        accessToken: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        status: string;
        platform: string;
        lastSyncedAt: Date | null;
        externalAccountId: string;
        isDefault: boolean;
        syncErrorMessage: string | null;
    }>;
    remove(tenantId: string, id: string): Promise<{
        message: string;
    }>;
    syncAccount(tenantId: string, id: string): Promise<{
        synced: number;
        accountId: string;
        message: string;
    }>;
    private buildMockCampaigns;
}

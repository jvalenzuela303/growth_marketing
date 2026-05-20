import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export declare class GoogleAdsService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService);
    buildOAuthUrl(tenantId: string): string;
    handleOAuthCallback(code: string, tenantId: string, customerId: string): Promise<void>;
    disconnect(tenantId: string, adsAccountId: string): Promise<void>;
    getCampaigns(tenantId: string, customerId: string, adsAccountId?: string, days?: number): Promise<{
        id: string;
        name: string;
        status: string;
        platform: string;
        channelType: string;
        budgetDaily: number;
        impressions: number;
        clicks: number;
        spend: number;
        conversions: number;
        ctr: number;
        cpc: number;
        cpm: number;
    }[]>;
    private getFreshAccessToken;
    private resolveAccount;
    private parseTokens;
    private fetchCustomerInfo;
    private requireConfig;
}

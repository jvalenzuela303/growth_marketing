import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export declare class TikTokAdsService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private readonly baseUrl;
    private readonly authUrl;
    private readonly tokenUrl;
    constructor(config: ConfigService, prisma: PrismaService);
    buildOAuthUrl(state: string): string;
    handleOAuthCallback(authCode: string, tenantId: string, advertiserId: string): Promise<void>;
    disconnect(tenantId: string, accountId: string): Promise<void>;
    getCampaigns(tenantId: string, advertiserId: string, accountId?: string): Promise<{
        campaigns: {
            id: any;
            name: any;
            status: any;
            objective: any;
            budgetDaily: number;
            spend: number;
            impressions: number;
            clicks: number;
            conversions: number;
            ctr: number;
            cpc: number;
            cpm: number;
            platform: "tiktok";
        }[];
        account: {
            id: string;
            name: string;
            advertiserId: string;
        };
        warning?: undefined;
    } | {
        campaigns: {
            id: string;
            name: string;
            status: string;
            objective: string;
            budgetDaily: number;
            spend: number;
            impressions: number;
            clicks: number;
            conversions: number;
            ctr: number;
            cpc: number;
            cpm: number;
            platform: "tiktok";
        }[];
        account: {
            id: string;
            name: string;
            advertiserId: string;
        };
        warning: string;
    }>;
    private fetchCampaigns;
    private fetchMetrics;
    private today;
    private daysAgo;
}

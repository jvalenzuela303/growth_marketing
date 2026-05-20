import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { TikTokAdsService } from './tiktok-ads.service';
export declare class TikTokAdsController {
    private readonly tiktokAdsService;
    private readonly config;
    private readonly logger;
    constructor(tiktokAdsService: TikTokAdsService, config: ConfigService);
    initOAuth(tenantId: string, advertiserId: string, res: Response): void;
    oauthCallback(authCode: string, state: string, error: string, res: Response): Promise<void>;
    disconnect(tenantId: string, accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
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
}

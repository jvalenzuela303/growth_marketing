import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { GoogleAdsService } from './google-ads.service';
export declare class GoogleAdsController {
    private readonly googleAdsService;
    private readonly config;
    private readonly logger;
    constructor(googleAdsService: GoogleAdsService, config: ConfigService);
    initOAuth(tenantId: string, customerId: string, res: Response): void;
    oauthCallback(code: string, state: string, error: string, res: Response): Promise<void>;
    disconnect(tenantId: string, accountId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getCampaigns(tenantId: string, customerId: string, daysStr?: string, accountId?: string): Promise<{
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
}

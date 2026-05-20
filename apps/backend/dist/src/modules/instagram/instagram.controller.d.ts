import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { InstagramService } from './instagram.service';
export declare class InstagramController {
    private readonly instagramService;
    private readonly config;
    private readonly logger;
    constructor(instagramService: InstagramService, config: ConfigService);
    initOAuth(tenantId: string, res: Response): void;
    getStatus(tenantId: string): Promise<{
        connected: boolean;
        pageId: string | null;
        username: string | null;
    }>;
    disconnect(tenantId: string): Promise<{
        success: boolean;
    }>;
    oauthCallback(code: string, state: string, error: string, res: Response): Promise<void>;
    verifyWebhook(mode: string, verifyToken: string, challenge: string): number;
    receiveWebhook(payload: any, req: Request): Promise<{
        status: string;
    }>;
    sendDM(tenantId: string, body: {
        igUserId: string;
        text: string;
    }): Promise<{
        messageId?: string;
    }>;
}

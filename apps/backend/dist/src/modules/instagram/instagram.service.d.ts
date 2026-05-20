import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export declare class InstagramService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    constructor(config: ConfigService, prisma: PrismaService);
    buildOAuthUrl(tenantId: string): string;
    handleOAuthCallback(code: string, tenantId: string): Promise<void>;
    disconnect(tenantId: string): Promise<void>;
    getStatus(tenantId: string): Promise<{
        connected: boolean;
        pageId: string | null;
        username: string | null;
    }>;
    sendDM(tenantId: string, igUserId: string, text: string): Promise<{
        messageId?: string;
    }>;
    processWebhook(payload: any): Promise<void>;
    private findOrCreateInstagramLead;
}

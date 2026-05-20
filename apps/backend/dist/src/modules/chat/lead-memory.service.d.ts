import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class LeadMemoryService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private readonly anthropic;
    constructor(prisma: PrismaService, config: ConfigService);
    buildContext(tenantId: string, leadId: string): Promise<string>;
    updateMemoryAsync(tenantId: string, leadId: string): Promise<void>;
}

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
export interface CapiPurchasePayload {
    tenantId: string;
    email?: string;
    phone?: string;
    amount: number;
    currency: string;
    eventId: string;
    sourceUrl: string;
}
export declare class MetaCapiService {
    private readonly config;
    private readonly prisma;
    private readonly logger;
    private readonly graphBase;
    constructor(config: ConfigService, prisma: PrismaService);
    sendPurchaseEvent(payload: CapiPurchasePayload): Promise<void>;
    private sha256;
}

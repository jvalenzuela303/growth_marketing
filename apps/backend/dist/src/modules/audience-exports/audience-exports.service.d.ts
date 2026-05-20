import { PrismaService } from '../../database/prisma.service';
export declare class AudienceExportsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    findAll(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        segment: string;
        status: string;
        type: string;
        metaAudienceId: string | null;
        leadCount: number;
        errorMessage: string | null;
        exportedAt: Date;
    }[]>;
    create(tenantId: string, segment: string, type: string): Promise<{
        id: string;
        tenantId: string;
        segment: string;
        status: string;
        type: string;
        metaAudienceId: string | null;
        leadCount: number;
        errorMessage: string | null;
        exportedAt: Date;
    }>;
}

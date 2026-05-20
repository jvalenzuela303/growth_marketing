import { PrismaService } from '../../database/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    liveness(): {
        status: string;
        timestamp: string;
    };
    readiness(): Promise<{
        status: string;
        db: string;
        timestamp: string;
    }>;
}

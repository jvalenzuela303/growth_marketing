import { OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    withTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T>;
    setTenantConfig(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, tenantId: string): Promise<void>;
}

import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '@growth-engine/shared-types';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly config;
    private readonly prisma;
    constructor(config: ConfigService, prisma: PrismaService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        tenantId: string;
        role: string;
        plan: import("@growth-engine/shared-types").TenantPlan;
    }>;
}
export {};

import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
export declare class FollowUpScheduler implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly prisma;
    private readonly messagingQueue;
    private readonly logger;
    private readonly ELIGIBLE_SEGMENTS;
    private readonly SILENCE_HOURS;
    private readonly MAX_FOLLOWUPS_30D;
    constructor(config: ConfigService, prisma: PrismaService, messagingQueue: Queue);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    runScan(): Promise<void>;
    private scanTenant;
    private pickTemplate;
}

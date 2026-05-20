import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { MessagingService } from '../modules/messaging/messaging.service';
import { PrismaService } from '../database/prisma.service';
import { FollowUpScheduler } from './followup.scheduler';
export declare class MessagingProcessor implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly messagingService;
    private readonly prisma;
    private readonly messagingQueue;
    private readonly followUpScheduler;
    private readonly logger;
    private worker;
    constructor(config: ConfigService, messagingService: MessagingService, prisma: PrismaService, messagingQueue: Queue, followUpScheduler: FollowUpScheduler);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    private processLeadScored;
    private processAutoFollowup;
    private processSequenceStep;
    private processHotLeadAlert;
}

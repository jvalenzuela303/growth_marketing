import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LeadsService } from '../modules/leads/leads.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
export declare class ScoringProcessor implements OnModuleInit, OnModuleDestroy {
    private readonly config;
    private readonly leadsService;
    private readonly prisma;
    private readonly notifications;
    private readonly logger;
    private worker;
    constructor(config: ConfigService, leadsService: LeadsService, prisma: PrismaService, notifications: NotificationsService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    private process;
    private calculateFallbackScore;
}

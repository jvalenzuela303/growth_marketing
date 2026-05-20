import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { LeadMemoryService } from './lead-memory.service';
import type { Response } from 'express';
export declare class ChatService {
    private readonly prisma;
    private readonly config;
    private readonly memory;
    private readonly logger;
    private readonly anthropic;
    constructor(prisma: PrismaService, config: ConfigService, memory: LeadMemoryService);
    sendMessage(tenantId: string, leadId: string, message: string, channel: string): Promise<{
        messageId: string;
        response: string;
        leadId: string;
    }>;
    streamMessage(tenantId: string, leadId: string, message: string, res: Response, model?: string): Promise<void>;
    private streamOpenAI;
    private streamGemini;
    private getHistory;
}

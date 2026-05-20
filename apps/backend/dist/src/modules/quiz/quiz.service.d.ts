import { PrismaService } from '../../database/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import type { QuizConfig } from '@growth-engine/shared-types';
export declare class QuizService {
    private readonly prisma;
    private readonly leadsService;
    private readonly logger;
    constructor(prisma: PrismaService, leadsService: LeadsService);
    getPublicQuizConfig(tenantSlug: string, funnelSlug: string): Promise<{
        funnelId: string;
        tenantSlug: string;
        name: string;
        description: string;
        quizConfig: QuizConfig;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
    }>;
    submitQuiz(tenantSlug: string, funnelSlug: string, dto: SubmitQuizDto, ipAddress?: string): Promise<{
        leadId: string;
        status: string;
        message: string;
    }>;
    getPublicResult(leadId: string): Promise<{
        segment: string | null;
        totalScore: number | null;
        status: 'processing' | 'ready';
        resultConfig: Record<string, unknown> | null;
    }>;
}

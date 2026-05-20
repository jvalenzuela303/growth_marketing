import { Request } from 'express';
import { QuizService } from './quiz.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
export declare class QuizController {
    private readonly quizService;
    constructor(quizService: QuizService);
    getPublicResult(leadId: string): Promise<{
        segment: string | null;
        totalScore: number | null;
        status: "processing" | "ready";
        resultConfig: Record<string, unknown> | null;
    }>;
    getPublicConfig(tenantSlug: string, funnelSlug: string): Promise<{
        funnelId: string;
        tenantSlug: string;
        name: string;
        description: string;
        quizConfig: import("@growth-engine/shared-types").QuizConfig;
        landingConfig: import("@prisma/client/runtime/library").JsonValue;
        resultsConfig: import("@prisma/client/runtime/library").JsonValue;
    }>;
    submit(tenantSlug: string, funnelSlug: string, dto: SubmitQuizDto, req: Request): Promise<{
        leadId: string;
        status: string;
        message: string;
    }>;
}

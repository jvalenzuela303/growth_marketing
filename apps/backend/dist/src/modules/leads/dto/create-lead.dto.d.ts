export declare class CreateLeadDto {
    funnelId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    quizAnswers?: Record<string, unknown>;
    quizCompletionPercentage?: number;
    tags?: string[];
}

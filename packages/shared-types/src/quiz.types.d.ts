export type QuestionType = 'single_choice' | 'multiple_choice' | 'scale' | 'text' | 'email' | 'phone' | 'number';
export interface QuizOption {
    id: string;
    text: string;
    points: number;
    skipToStep?: number;
    scoreModifiers?: Array<{
        questionIndex: number;
        triggerOptionId: string;
        bonus: number;
    }>;
    metadata?: Record<string, unknown>;
}
export interface BranchingRule {
    id: string;
    triggerQuestionId: string;
    triggerOptionId: string;
    targetQuestionId: string | null;
}
export interface QuizQuestion {
    id: string;
    index: number;
    type: QuestionType;
    text: string;
    subtitle?: string;
    options?: QuizOption[];
    maxPoints: number;
    weight: number;
    required: boolean;
    scoringCategory: 'quiz' | 'behavior' | 'engagement' | 'demographic';
    mediaUrl?: string;
    layout?: 'list' | 'grid' | 'image_grid';
    branchingRules?: BranchingRule[];
}
export interface QuizConfig {
    title: string;
    description?: string;
    questions: QuizQuestion[];
    leadGatePosition: number;
    completionRedirect?: string;
    branchingRules?: BranchingRule[];
}
export interface QuizAnswer {
    questionId: string;
    questionIndex: number;
    optionId?: string;
    optionIds?: string[];
    textValue?: string;
    numberValue?: number;
}
export interface LeadGateData {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    company?: string;
}
export interface QuizSubmission {
    funnelId: string;
    tenantSlug: string;
    answers: QuizAnswer[];
    leadData: LeadGateData;
    completionPercentage: number;
    sessionId: string;
    metadata?: {
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
        fbclid?: string;
        userAgent?: string;
        ipAddress?: string;
    };
}
//# sourceMappingURL=quiz.types.d.ts.map
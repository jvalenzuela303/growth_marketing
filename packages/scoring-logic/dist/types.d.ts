import type { BehaviorData, LeadSegment, ScoreComponents } from '@growth-engine/shared-types';
export type { BehaviorData, LeadSegment, ScoreComponents };
export interface QuizAnswer {
    questionId: string;
    /** Índice base-0 de la pregunta (0 = q1, 9 = q10) */
    questionIndex: number;
    optionId: string | null;
}
export interface ScoreRequest {
    leadId: string;
    tenantId: string;
    quizAnswers: QuizAnswer[];
    behaviorData: BehaviorData;
    /** Porcentaje de completado del quiz (0–100) */
    quizCompletionPercentage: number;
}
export interface ScoreResult {
    leadId: string;
    scores: ScoreComponents;
    segment: LeadSegment;
    hotLeadAlert: boolean;
}
//# sourceMappingURL=types.d.ts.map
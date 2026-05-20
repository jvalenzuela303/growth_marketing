export type LeadSegment = 'fuego' | 'caliente' | 'tibio' | 'frio' | 'motor_detenido' | 'sin_clasificar';
export type LeadPathology = 'listo_para_comprar' | 'buscando_solucion' | 'consciente_del_problema' | 'explorando_opciones' | 'necesita_base';
export interface ScoreComponents {
    quizScore: number;
    behaviorScore: number;
    engagementScore: number;
    demographicScore: number;
    totalScore: number;
}
export interface ScoreResult extends ScoreComponents {
    segment: LeadSegment;
    pathology?: LeadPathology;
    confidence?: number;
    recommendations?: string[];
}
export interface BehaviorData {
    visits: number;
    pricingPageClicks: number;
    totalTimeSeconds: number;
    emailOpens: number;
    emailClicks: number;
    whatsappReplies: number;
    askedPriceQuestion?: boolean;
    requestedDemo?: boolean;
    conversationRounds?: number;
    sharedContent?: boolean;
    linkedinInteraction?: boolean;
    isDecisionMaker?: boolean;
    hasExistingCrm?: boolean;
    companySize?: number;
    industry?: string;
}
export declare const SEGMENT_THRESHOLDS: Record<LeadSegment, [number, number]>;
export declare function getSegmentFromScore(score: number): LeadSegment;
//# sourceMappingURL=scoring.types.d.ts.map
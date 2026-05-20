import type { LeadSegment, LeadPathology, ScoreComponents } from './scoring.types';
export type PipelineStage = 'nuevo' | 'calificado' | 'contactado' | 'propuesta' | 'negociacion' | 'cerrado_ganado' | 'cerrado_perdido';
export type LeadSource = 'meta_ads' | 'instagram' | 'facebook' | 'organic' | 'referral' | 'email' | 'whatsapp' | 'landing_page' | 'api' | 'direct';
export interface Lead {
    id: string;
    tenantId: string;
    funnelId?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    scores: ScoreComponents;
    scoreUpdatedAt: Date;
    segment: LeadSegment;
    pathology?: LeadPathology;
    pathologyConfidence?: number;
    classifiedAt?: Date;
    source: LeadSource;
    utmCampaign?: string;
    utmSource?: string;
    pipelineStage: PipelineStage;
    assignedTo?: string;
    createdAt: Date;
    updatedAt: Date;
    lastSeenAt: Date;
}
export interface LeadWithScore extends Lead {
    quizAnswers?: Record<string, unknown>;
    behaviorData?: Record<string, unknown>;
}
export interface LeadCapturedEvent {
    leadId: string;
    tenantId: string;
    funnelId: string;
    totalScore: number;
    segment: LeadSegment;
    timestamp: string;
}
export interface HotLeadEvent extends LeadCapturedEvent {
    leadEmail?: string;
    leadPhone?: string;
    leadName?: string;
    alertSentAt: string;
}
//# sourceMappingURL=lead.types.d.ts.map
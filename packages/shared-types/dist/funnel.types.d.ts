import type { QuizConfig } from './quiz.types';
export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived';
export interface SegmentResultConfig {
    headline: string;
    subheadline?: string;
    cta: string;
    ctaUrl?: string;
    urgency?: string;
    recommendations?: string[];
    videoUrl?: string;
    calendlyUrl?: string;
    socialProofText?: string;
    imageUrl?: string;
}
export interface FunnelResultsConfig {
    segments: {
        fuego: SegmentResultConfig;
        caliente: SegmentResultConfig;
        tibio: SegmentResultConfig;
        frio: SegmentResultConfig;
        motor_detenido: SegmentResultConfig;
    };
}
export interface LandingSection {
    id: string;
    type: 'hero' | 'benefits' | 'social_proof' | 'faq' | 'cta_bottom';
    enabled: boolean;
    content: Record<string, unknown>;
}
export interface LandingConfig {
    headline: string;
    subheadline?: string;
    ctaText: string;
    theme: string;
    logoUrl?: string;
    customCss?: string;
    socialProof?: {
        count: number;
        label: string;
    };
    trustSignals?: string[];
    sections?: LandingSection[];
    primaryColor?: string;
    fontFamily?: string;
}
export interface Funnel {
    id: string;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    quizConfig: QuizConfig;
    landingConfig: LandingConfig;
    resultsConfig: FunnelResultsConfig;
    status: FunnelStatus;
    publishedAt?: Date;
    abTestEnabled: boolean;
    totalViews: number;
    totalStarts: number;
    totalCompletions: number;
    completionRate?: number;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=funnel.types.d.ts.map
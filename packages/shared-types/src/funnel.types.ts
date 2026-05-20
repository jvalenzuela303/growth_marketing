import type { QuizConfig } from './quiz.types';

export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface SegmentResultConfig {
  headline: string;
  subheadline?: string;
  cta: string;
  ctaUrl?: string;
  urgency?: string;
  recommendations?: string[];
  // Rich media / social proof additions (Iteration 3)
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

// A single content section on the landing page.
// Renderer maps `type` to the appropriate React component.
export interface LandingSection {
  id: string;
  type: 'hero' | 'benefits' | 'social_proof' | 'faq' | 'cta_bottom';
  enabled: boolean;
  // Free-form content keyed by section type (headlines, items[], questions[], etc.)
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
  // Iteration 3: structured section list for visual page builder
  sections?: LandingSection[];
  // Global brand overrides (applied when customCss is not sufficient)
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
  // A/B testing flag (Iteration 3)
  abTestEnabled: boolean;
  // Métricas
  totalViews: number;
  totalStarts: number;
  totalCompletions: number;
  completionRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

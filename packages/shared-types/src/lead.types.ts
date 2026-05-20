import type { LeadSegment, LeadPathology, ScoreComponents } from './scoring.types';

export type PipelineStage =
  | 'nuevo'
  | 'calificado'
  | 'contactado'
  | 'propuesta'
  | 'negociacion'
  | 'cerrado_ganado'
  | 'cerrado_perdido';

export type LeadSource =
  | 'meta_ads'
  | 'instagram'
  | 'facebook'
  | 'organic'
  | 'referral'
  | 'email'
  | 'whatsapp'
  | 'landing_page'
  | 'api'
  | 'direct';

export interface Lead {
  id: string;
  tenantId: string;
  funnelId?: string;
  // Datos personales
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  // Scoring
  scores: ScoreComponents;
  scoreUpdatedAt: Date;
  // Clasificación
  segment: LeadSegment;
  pathology?: LeadPathology;
  pathologyConfidence?: number;
  classifiedAt?: Date;
  // Origen
  source: LeadSource;
  utmCampaign?: string;
  utmSource?: string;
  // CRM
  pipelineStage: PipelineStage;
  assignedTo?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date;
}

export interface LeadWithScore extends Lead {
  quizAnswers?: Record<string, unknown>;
  behaviorData?: Record<string, unknown>;
}

// Payload del evento Pub/Sub cuando se captura un lead
export interface LeadCapturedEvent {
  leadId: string;
  tenantId: string;
  funnelId: string;
  totalScore: number;
  segment: LeadSegment;
  timestamp: string;
}

// Payload del evento cuando un lead alcanza score de hot
export interface HotLeadEvent extends LeadCapturedEvent {
  leadEmail?: string;
  leadPhone?: string;
  leadName?: string;
  alertSentAt: string;
}

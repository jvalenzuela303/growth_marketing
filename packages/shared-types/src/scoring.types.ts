export type LeadSegment = 'fuego' | 'caliente' | 'tibio' | 'frio' | 'motor_detenido' | 'sin_clasificar';

export type LeadPathology =
  | 'listo_para_comprar'
  | 'buscando_solucion'
  | 'consciente_del_problema'
  | 'explorando_opciones'
  | 'necesita_base';

export interface ScoreComponents {
  quizScore: number;       // max 40
  behaviorScore: number;   // max 30
  engagementScore: number; // max 20
  demographicScore: number;// max 10
  totalScore: number;      // sum, max 100
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
  // Señales de engagement adicionales
  sharedContent?: boolean;
  linkedinInteraction?: boolean;
  // Perfil firmográfico (demographic score)
  isDecisionMaker?: boolean;
  hasExistingCrm?: boolean;
  companySize?: number;
  industry?: string;
}

// Fórmula: B×30 + Q×40 + E×20 + D×10 = 0-100
export const SEGMENT_THRESHOLDS: Record<LeadSegment, [number, number]> = {
  fuego:          [80, 100],
  caliente:       [60, 79],
  tibio:          [40, 59],
  frio:           [20, 39],
  motor_detenido: [0, 19],
  sin_clasificar: [0, 0],
};

export function getSegmentFromScore(score: number): LeadSegment {
  if (score >= 80) return 'fuego';
  if (score >= 60) return 'caliente';
  if (score >= 40) return 'tibio';
  if (score >= 20) return 'frio';
  return 'motor_detenido';
}

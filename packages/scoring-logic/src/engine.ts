/**
 * Lead Scoring Engine — The Growth Engine (TypeScript)
 * =====================================================
 * Fórmula: B(30) + Q(40) + E(20) + D(10) = 100 puntos
 *
 *     B = Behavior score     (comportamiento digital)
 *     Q = Quiz score         (respuestas al Termómetro de Eficiencia de Ventas)
 *     E = Engagement score   (señales de intención de compra)
 *     D = Demographic score  (perfil firmográfico)
 *
 * Puerto fiel del scoring_engine.py del AI Engine para uso en TypeScript.
 * Garantiza resultados idénticos al motor Python cuando el AI Engine no está disponible.
 */

import { getSegmentFromScore } from '@growth-engine/shared-types';
import type { BehaviorData, LeadSegment, ScoreComponents } from '@growth-engine/shared-types';
import { QUIZ_SCORING_MAP, QUESTION_WEIGHTS, HIGH_VALUE_INDUSTRIES } from './quiz-map';
import type { QuizAnswer, ScoreRequest, ScoreResult } from './types';

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Punto de entrada del scoring engine.
 * Aplica la fórmula B+Q+E+D y retorna el score con segmento y alerta hot lead.
 */
export function calculateScore(request: ScoreRequest): ScoreResult {
  const b = calculateBehaviorScore(request.behaviorData);
  const q = calculateQuizScore(request.quizAnswers, request.quizCompletionPercentage);
  const e = calculateEngagementScore(request.behaviorData);
  const d = calculateDemographicScore(request.behaviorData);

  const total = Math.round((b + q + e + d) * 10) / 10;
  const segment = getSegmentFromScore(total);
  const hotLeadAlert = checkHotLeadAlert(total, request.quizAnswers, request.behaviorData);

  return {
    leadId: request.leadId,
    scores: {
      behaviorScore: Math.round(b * 100) / 100,
      quizScore: Math.round(q * 100) / 100,
      engagementScore: Math.round(e * 100) / 100,
      demographicScore: Math.round(d * 100) / 100,
      totalScore: total,
    },
    segment,
    hotLeadAlert,
  };
}

// ─── Sub-calculadoras ─────────────────────────────────────────────────────────

/**
 * Comportamiento digital observado — máximo 30 puntos.
 *
 * Distribución interna:
 *   Visitas de retorno    → hasta 10 pts (escala logarítmica para evitar gaming)
 *   Clics en precios      → hasta  8 pts (señal de intención alta)
 *   Tiempo en página      → hasta  5 pts (máximo en 300 segundos)
 *   Email clicks          → hasta  3 pts
 *   WhatsApp replies      → hasta  2 pts
 *   Email opens           → hasta  1 pt
 */
export function calculateBehaviorScore(data: BehaviorData): number {
  let score = 0;

  // Escala log: 1 visita = ~3.1, 3 visitas = ~5.5, 10 visitas = ~10
  score += Math.min(10, Math.log(Math.max(data.visits, 1) + 1) * 4.5);

  // Cada clic en precios aporta 2.67 pts, tope 3 clics → 8 pts
  score += Math.min(8, data.pricingPageClicks * 2.67);

  // Tiempo: 300 s = 5 minutos de lectura real → puntaje máximo
  score += Math.min(5, (Math.min(data.totalTimeSeconds, 300) / 300) * 5);

  // Email engagement
  score += Math.min(3, data.emailClicks * 0.75);
  score += Math.min(2, data.whatsappReplies * 0.5);
  score += Math.min(1, data.emailOpens * 0.2);

  return Math.min(30, score);
}

/**
 * Respuestas al quiz — máximo 40 puntos.
 *
 * La normalización compensa quizzes parcialmente completados:
 *   completionFactor = 0.5 + (pct / 100) * 0.5
 *   → 0% completado  = factor 0.5  (penalización máxima)
 *   → 100% completado = factor 1.0 (sin penalización)
 */
export function calculateQuizScore(answers: QuizAnswer[], completionPct: number): number {
  if (answers.length === 0) return 0;

  let rawScore = 0;
  let maxPossible = 0;

  for (const answer of answers) {
    const qKey = `q${answer.questionIndex + 1}`;
    const weight = QUESTION_WEIGHTS[qKey] ?? 1.0;
    const qMap = QUIZ_SCORING_MAP[qKey] ?? {};

    const optionPoints = qMap[answer.optionId ?? ''] ?? 0;
    const weightedPoints = optionPoints * weight;
    const maxWeighted = (Math.max(...Object.values(qMap), 10)) * weight;

    rawScore += weightedPoints;
    maxPossible += maxWeighted;
  }

  if (maxPossible === 0) return 0;

  const normalized = (rawScore / maxPossible) * 40;
  const completionFactor = 0.5 + (completionPct / 100) * 0.5;
  return Math.min(40, normalized * completionFactor);
}

/**
 * Señales de intención de compra — máximo 20 puntos.
 *
 * Jerarquía por valor de intención:
 *   Preguntó precio        → 7 pts  (intención directa)
 *   Solicitó demo          → 6 pts  (intención directa)
 *   3+ rondas de chat      → 4 pts  (conversación activa)
 *   1-2 rondas de chat     → 2 pts
 *   Compartió contenido    → 2 pts  (advocacy)
 *   Interacción LinkedIn   → 1 pt   (research profesional)
 */
export function calculateEngagementScore(data: BehaviorData): number {
  let score = 0;

  if (data.askedPriceQuestion) score += 7;
  if (data.requestedDemo) score += 6;

  const rounds = data.conversationRounds ?? 0;
  if (rounds >= 3) {
    score += 4;
  } else if (rounds >= 1) {
    score += 2;
  }

  if (data.sharedContent) score += 2;
  if (data.linkedinInteraction) score += 1;

  return Math.min(20, score);
}

/**
 * Perfil firmográfico — máximo 10 puntos.
 *
 * Factores:
 *   Decision maker         → 4 pts  (autoridad de compra)
 *   CRM existente          → 2 pts  (presupuesto tech demostrado)
 *   Empresa >= 50 personas → 2 pts  (empresa mediana-grande)
 *   Empresa 10-49 personas → 1 pt   (empresa pequeña)
 *   Industria de alto valor → 2 pts
 */
export function calculateDemographicScore(data: BehaviorData): number {
  let score = 0;

  if (data.isDecisionMaker) score += 4;
  if (data.hasExistingCrm) score += 2;

  const companySize = data.companySize ?? 0;
  if (companySize >= 50) {
    score += 2;
  } else if (companySize >= 10) {
    score += 1;
  }

  const industry = (data.industry ?? '').toLowerCase();
  if (HIGH_VALUE_INDUSTRIES.has(industry)) score += 2;

  return Math.min(10, score);
}

// ─── Segmentación y alerta hot lead ──────────────────────────────────────────

export { getSegmentFromScore };

/**
 * Alerta multicriteria para hot lead — requiere las 3 condiciones:
 *
 * 1. Score >= 80
 * 2. Q9 (urgencia) = "menos_1_mes" o "ya"
 * 3. Q10 (presupuesto) != "no_tengo" ni null
 */
export function checkHotLeadAlert(
  total: number,
  answers: QuizAnswer[],
  _behavior: BehaviorData,
): boolean {
  if (total < 80) return false;

  const q9Urgent = answers.some(
    (a) => a.questionIndex === 8 && (a.optionId === 'menos_1_mes' || a.optionId === 'ya'),
  );

  const q10HasBudget = answers.some(
    (a) => a.questionIndex === 9 && a.optionId !== 'no_tengo' && a.optionId !== null,
  );

  return q9Urgent && q10HasBudget;
}

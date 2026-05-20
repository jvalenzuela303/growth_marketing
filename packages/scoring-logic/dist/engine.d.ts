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
import type { BehaviorData } from '@growth-engine/shared-types';
import type { QuizAnswer, ScoreRequest, ScoreResult } from './types';
/**
 * Punto de entrada del scoring engine.
 * Aplica la fórmula B+Q+E+D y retorna el score con segmento y alerta hot lead.
 */
export declare function calculateScore(request: ScoreRequest): ScoreResult;
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
export declare function calculateBehaviorScore(data: BehaviorData): number;
/**
 * Respuestas al quiz — máximo 40 puntos.
 *
 * La normalización compensa quizzes parcialmente completados:
 *   completionFactor = 0.5 + (pct / 100) * 0.5
 *   → 0% completado  = factor 0.5  (penalización máxima)
 *   → 100% completado = factor 1.0 (sin penalización)
 */
export declare function calculateQuizScore(answers: QuizAnswer[], completionPct: number): number;
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
export declare function calculateEngagementScore(data: BehaviorData): number;
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
export declare function calculateDemographicScore(data: BehaviorData): number;
export { getSegmentFromScore };
/**
 * Alerta multicriteria para hot lead — requiere las 3 condiciones:
 *
 * 1. Score >= 80
 * 2. Q9 (urgencia) = "menos_1_mes" o "ya"
 * 3. Q10 (presupuesto) != "no_tengo" ni null
 */
export declare function checkHotLeadAlert(total: number, answers: QuizAnswer[], _behavior: BehaviorData): boolean;
//# sourceMappingURL=engine.d.ts.map
/**
 * Mapa de puntos por opción para cada pregunta del quiz.
 * Espeja el QUIZ_SCORING_MAP del AI Engine Python para consistencia.
 *
 * Los puntos van de 0 a 10 antes de aplicar el peso de la pregunta.
 */
export declare const QUIZ_SCORING_MAP: Record<string, Record<string, number>>;
/**
 * Pesos por pregunta — determinan la influencia relativa en el score final.
 * Q9 (urgencia) y Q10 (presupuesto) son los predictores más fuertes de cierre.
 */
export declare const QUESTION_WEIGHTS: Record<string, number>;
/** Industrias de alto valor para el scoring demográfico */
export declare const HIGH_VALUE_INDUSTRIES: Set<string>;
//# sourceMappingURL=quiz-map.d.ts.map
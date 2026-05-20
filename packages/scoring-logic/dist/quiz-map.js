"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIGH_VALUE_INDUSTRIES = exports.QUESTION_WEIGHTS = exports.QUIZ_SCORING_MAP = void 0;
/**
 * Mapa de puntos por opción para cada pregunta del quiz.
 * Espeja el QUIZ_SCORING_MAP del AI Engine Python para consistencia.
 *
 * Los puntos van de 0 a 10 antes de aplicar el peso de la pregunta.
 */
exports.QUIZ_SCORING_MAP = {
    // Q1: Facturación mensual — proxy de tamaño de empresa
    q1: {
        menos_500k: 0,
        '500k_2m': 3,
        '2m_5m': 6,
        '5m_15m': 8,
        mas_15m: 10,
    },
    // Q2: Leads por mes — volumen de pipeline
    q2: {
        menos_10: 0,
        '10_50': 3,
        '50_200': 6,
        '200_500': 8,
        mas_500: 10,
    },
    // Q3: Mayor cuello de botella — pain point primario (peso alto)
    q3: {
        falta_leads: 4,
        baja_conversion: 8,
        procesos_manuales: 7,
        seguimiento_ineficiente: 9,
        no_se: 1,
    },
    // Q4: Tiempo de conversión — madurez del proceso de ventas
    q4: {
        mas_90_dias: 2,
        '30_90_dias': 5,
        '15_30_dias': 7,
        menos_15_dias: 9,
        no_mido: 0,
    },
    // Q5: Canales actuales — sofisticación de marketing
    q5: {
        solo_referidos: 2,
        redes_sociales: 4,
        publicidad_pagada: 6,
        email_marketing: 7,
        sistema_integrado: 9,
    },
    // Q6: Inversión en publicidad — presupuesto disponible (peso muy alto)
    q6: {
        cero: 0,
        menos_200k: 2,
        '200k_500k': 5,
        '500k_1m': 7,
        mas_1m: 10,
    },
    // Q7: Herramientas actuales — madurez tecnológica
    q7: {
        ninguna: 0,
        excel_whatsapp: 2,
        crm_basico: 5,
        crm_avanzado: 7,
        suite_completa: 9,
    },
    // Q8: Tasa de conversión actual — alto predictor de ROI percibido
    q8: {
        menos_2pct: 2,
        '2_5pct': 4,
        '5_10pct': 6,
        '10_20pct': 8,
        mas_20pct: 10,
    },
    // Q9: Timeline para resultados — predictor #1 de urgencia
    q9: {
        mas_6_meses: 1,
        '3_6_meses': 4,
        '1_3_meses': 7,
        menos_1_mes: 10,
        ya: 10,
    },
    // Q10: Presupuesto para la solución — predictor #2 de cierre
    q10: {
        no_tengo: 0,
        menos_100k: 2,
        '100k_300k': 5,
        '300k_600k': 8,
        mas_600k: 10,
    },
};
/**
 * Pesos por pregunta — determinan la influencia relativa en el score final.
 * Q9 (urgencia) y Q10 (presupuesto) son los predictores más fuertes de cierre.
 */
exports.QUESTION_WEIGHTS = {
    q1: 1.0,
    q2: 1.2,
    q3: 1.4,
    q4: 1.3,
    q5: 1.0,
    q6: 1.5,
    q7: 1.1,
    q8: 1.6,
    q9: 2.0, // Mayor predictor: urgencia
    q10: 1.8, // Segundo mayor predictor: presupuesto
};
/** Industrias de alto valor para el scoring demográfico */
exports.HIGH_VALUE_INDUSTRIES = new Set([
    'saas', 'fintech', 'ecommerce', 'retail', 'educacion', 'salud',
]);
//# sourceMappingURL=quiz-map.js.map
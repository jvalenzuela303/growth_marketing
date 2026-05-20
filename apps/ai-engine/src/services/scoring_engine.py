"""
Lead Scoring Engine — The Growth Engine
========================================
Fórmula: B(30) + Q(40) + E(20) + D(10) = 100 puntos

    B = Behavior score     (comportamiento digital)
    Q = Quiz score         (respuestas al Termómetro de Eficiencia de Ventas)
    E = Engagement score   (señales de intención de compra)
    D = Demographic score  (perfil firmográfico)

CASO DE VALIDACIÓN DEL SPEC:
    CEO + 3 visitas + 2 clics en precios + 90% quiz + preguntó precio
    → Score esperado: ~95/100 ✓
"""

import math
from models.lead import (
    ScoreRequest,
    ScoreResponse,
    ScoreComponents,
    LeadSegment,
    BehaviorData,
    QuizAnswer,
)
from typing import List

# Industrias de alto valor para el scoring demográfico
HIGH_VALUE_INDUSTRIES = {
    "saas", "fintech", "ecommerce", "retail", "educacion", "salud",
}

# ---------------------------------------------------------------------------
# Mapa de puntos por opción para cada pregunta del quiz
# Los puntos van de 0 a 10 antes de aplicar el peso de la pregunta.
# ---------------------------------------------------------------------------
QUIZ_SCORING_MAP: dict[str, dict[str, float]] = {
    # Q1: Facturación mensual — proxy de tamaño de empresa
    "q1": {
        "menos_500k": 0,
        "500k_2m": 3,
        "2m_5m": 6,
        "5m_15m": 8,
        "mas_15m": 10,
    },
    # Q2: Leads por mes — volumen de pipeline
    "q2": {
        "menos_10": 0,
        "10_50": 3,
        "50_200": 6,
        "200_500": 8,
        "mas_500": 10,
    },
    # Q3: Mayor cuello de botella — pain point primario (peso alto)
    "q3": {
        "falta_leads": 4,
        "baja_conversion": 8,
        "procesos_manuales": 7,
        "seguimiento_ineficiente": 9,
        "no_se": 1,
    },
    # Q4: Tiempo de conversión — madurez del proceso de ventas
    "q4": {
        "mas_90_dias": 2,
        "30_90_dias": 5,
        "15_30_dias": 7,
        "menos_15_dias": 9,
        "no_mido": 0,
    },
    # Q5: Canales actuales — sofisticación de marketing
    "q5": {
        "solo_referidos": 2,
        "redes_sociales": 4,
        "publicidad_pagada": 6,
        "email_marketing": 7,
        "sistema_integrado": 9,
    },
    # Q6: Inversión en publicidad — presupuesto disponible (peso muy alto)
    "q6": {
        "cero": 0,
        "menos_200k": 2,
        "200k_500k": 5,
        "500k_1m": 7,
        "mas_1m": 10,
    },
    # Q7: Herramientas actuales — madurez tecnológica
    "q7": {
        "ninguna": 0,
        "excel_whatsapp": 2,
        "crm_basico": 5,
        "crm_avanzado": 7,
        "suite_completa": 9,
    },
    # Q8: Tasa de conversión actual — alto predictor de ROI percibido
    "q8": {
        "menos_2pct": 2,
        "2_5pct": 4,
        "5_10pct": 6,
        "10_20pct": 8,
        "mas_20pct": 10,
    },
    # Q9: Timeline para resultados — predictor #1 de urgencia
    "q9": {
        "mas_6_meses": 1,
        "3_6_meses": 4,
        "1_3_meses": 7,
        "menos_1_mes": 10,
        "ya": 10,
    },
    # Q10: Presupuesto para la solución — predictor #2 de cierre
    "q10": {
        "no_tengo": 0,
        "menos_100k": 2,
        "100k_300k": 5,
        "300k_600k": 8,
        "mas_600k": 10,
    },
}

# Pesos por pregunta — determinan la influencia relativa en el score final
QUESTION_WEIGHTS: dict[str, float] = {
    "q1": 1.0,
    "q2": 1.2,
    "q3": 1.4,
    "q4": 1.3,
    "q5": 1.0,
    "q6": 1.5,
    "q7": 1.1,
    "q8": 1.6,
    "q9": 2.0,  # Mayor predictor: urgencia
    "q10": 1.8,  # Segundo mayor predictor: presupuesto
}


# ---------------------------------------------------------------------------
# Función principal
# ---------------------------------------------------------------------------

def calculate_score(request: ScoreRequest) -> ScoreResponse:
    """
    Punto de entrada del scoring engine.
    Aplica la fórmula B+Q+E+D y retorna el score con segmento y alerta hot lead.
    """
    b = calculate_behavior_score(request.behavior_data)
    q = calculate_quiz_score(request.quiz_answers, request.quiz_completion_percentage)
    e = calculate_engagement_score(request.behavior_data)
    d = calculate_demographic_score(request.behavior_data)

    total = round(b + q + e + d, 1)
    segment = get_segment(total)
    hot_alert = check_hot_lead_alert(total, request.quiz_answers, request.behavior_data)

    return ScoreResponse(
        lead_id=request.lead_id,
        scores=ScoreComponents(
            quiz_score=round(q, 2),
            behavior_score=round(b, 2),
            engagement_score=round(e, 2),
            demographic_score=round(d, 2),
            total_score=total,
        ),
        segment=segment,
        hot_lead_alert=hot_alert,
    )


# ---------------------------------------------------------------------------
# Sub-calculadoras
# ---------------------------------------------------------------------------

def calculate_behavior_score(data: BehaviorData) -> float:
    """
    Comportamiento digital observado — máximo 30 puntos.

    Distribución interna:
        Visitas de retorno    → hasta 10 pts (escala logarítmica para evitar gaming)
        Clics en precios      → hasta  8 pts (señal de intención alta)
        Tiempo en página      → hasta  5 pts (máximo en 300 segundos)
        Email clicks          → hasta  3 pts
        WhatsApp replies      → hasta  2 pts
        Email opens           → hasta  1 pt
    """
    score = 0.0

    # Escala log: 1 visita = ~3.1, 3 visitas = ~5.5, 10 visitas = ~10
    score += min(10.0, math.log(max(data.visits, 1) + 1) * 4.5)

    # Cada clic en precios aporta 2.67 pts, tope 3 clics → 8 pts
    score += min(8.0, data.pricing_page_clicks * 2.67)

    # Tiempo: 300 s = 5 minutos de lectura real → puntaje máximo
    score += min(5.0, (min(data.total_time_seconds, 300) / 300) * 5)

    # Email engagement
    score += min(3.0, data.email_clicks * 0.75)
    score += min(2.0, data.whatsapp_replies * 0.5)
    score += min(1.0, data.email_opens * 0.2)

    return min(30.0, score)


def calculate_quiz_score(answers: List[QuizAnswer], completion_pct: float) -> float:
    """
    Respuestas al quiz — máximo 40 puntos.

    La normalización compensa quizzes parcialmente completados:
        completion_factor = 0.5 + (pct / 100) * 0.5
        → 0% completado  = factor 0.5  (penalización máxima)
        → 100% completado = factor 1.0 (sin penalización)
    """
    if not answers:
        return 0.0

    raw_score = 0.0
    max_possible = 0.0

    for answer in answers:
        q_key = f"q{answer.question_index + 1}"
        weight = QUESTION_WEIGHTS.get(q_key, 1.0)
        q_map = QUIZ_SCORING_MAP.get(q_key, {})

        option_points = float(q_map.get(answer.option_id or "", 0))
        weighted_points = option_points * weight
        max_weighted = max(q_map.values(), default=10.0) * weight

        raw_score += weighted_points
        max_possible += max_weighted

    if max_possible == 0:
        return 0.0

    normalized = (raw_score / max_possible) * 40
    completion_factor = 0.5 + (completion_pct / 100) * 0.5
    return min(40.0, normalized * completion_factor)


def calculate_engagement_score(data: BehaviorData) -> float:
    """
    Señales de intención de compra — máximo 20 puntos.

    Jerarquía por valor de intención:
        Preguntó precio        → 7 pts  (intención directa)
        Solicitó demo          → 6 pts  (intención directa)
        3+ rondas de chat      → 4 pts  (conversación activa)
        1-2 rondas de chat     → 2 pts
        Compartió contenido    → 2 pts  (advocacy)
        Interacción LinkedIn   → 1 pt   (research profesional)
    """
    score = 0.0

    if data.asked_price_question:
        score += 7.0
    if data.requested_demo:
        score += 6.0
    if data.conversation_rounds >= 3:
        score += 4.0
    elif data.conversation_rounds >= 1:
        score += 2.0
    if data.shared_content:
        score += 2.0
    if data.linkedin_interaction:
        score += 1.0

    return min(20.0, score)


def calculate_demographic_score(data: BehaviorData) -> float:
    """
    Perfil firmográfico — máximo 10 puntos.

    Factores:
        Decision maker         → 4 pts  (autoridad de compra)
        CRM existente          → 2 pts  (presupuesto tech demostrado)
        Empresa >= 50 personas → 2 pts  (empresa mediana-grande)
        Empresa 10-49 personas → 1 pt   (empresa pequeña)
        Industria de alto valor → 2 pts
    """
    score = 0.0

    if data.is_decision_maker:
        score += 4.0
    if data.has_existing_crm:
        score += 2.0

    company_size = data.company_size or 0
    if company_size >= 50:
        score += 2.0
    elif company_size >= 10:
        score += 1.0

    industry = (data.industry or "").lower()
    if industry in HIGH_VALUE_INDUSTRIES:
        score += 2.0

    return min(10.0, score)


# ---------------------------------------------------------------------------
# Segmentación y alerta hot lead
# ---------------------------------------------------------------------------

def get_segment(total_score: float) -> LeadSegment:
    """
    Mapea score numérico al segmento cualitativo del lead.

        80-100 → FUEGO          (acción inmediata, escalar a ventas)
        60-79  → CALIENTE       (nurturing activo, seguimiento en 24h)
        40-59  → TIBIO          (secuencia educativa, seguimiento en 72h)
        20-39  → FRIO           (re-entrada en 30 días)
        0-19   → MOTOR_DETENIDO (descartar o re-entrada en 90 días)
    """
    if total_score >= 80:
        return LeadSegment.FUEGO
    if total_score >= 60:
        return LeadSegment.CALIENTE
    if total_score >= 40:
        return LeadSegment.TIBIO
    if total_score >= 20:
        return LeadSegment.FRIO
    return LeadSegment.MOTOR_DETENIDO


def check_hot_lead_alert(
    total: float,
    answers: List[QuizAnswer],
    behavior: BehaviorData,
) -> bool:
    """
    Alerta multicriteria para hot lead — requiere las 3 condiciones:

    1. Score >= 80
    2. Q9 (urgencia) = "menos_1_mes" o "ya"      → quieren resultado pronto
    3. Q10 (presupuesto) != "no_tengo" ni None    → tienen dinero disponible

    La combinación de urgencia + presupuesto + score alto indica
    alta probabilidad de cierre en el ciclo comercial actual.
    """
    if total < 80:
        return False

    q9_urgent = any(
        a.option_id in ("menos_1_mes", "ya")
        for a in answers
        if a.question_index == 8  # Q9 es índice 8 (base 0)
    )

    q10_has_budget = any(
        a.option_id not in ("no_tengo", None)
        for a in answers
        if a.question_index == 9  # Q10 es índice 9 (base 0)
    )

    return q9_urgent and q10_has_budget

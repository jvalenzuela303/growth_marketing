"""
Predictive Scoring Engine — The Growth Engine
==============================================

Calculates the predicted probability that a lead will close (convert)
within the next 30 days using a lightweight logistic regression approach.

Features used:
    x1  — total_score          (0–100), normalized → (0–1)
    x2  — quiz_score           (0–40), normalized  → (0–1)
    x3  — behavior_score       (0–30), normalized  → (0–1)
    x4  — engagement_score     (0–20), normalized  → (0–1)
    x5  — demographic_score    (0–10), normalized  → (0–1)
    x6  — recency_factor       1.0 if last_seen < 7d, 0.6 if < 30d, 0.3 if ≥ 30d
    x7  — asked_price          binary (0/1)
    x8  — requested_demo       binary (0/1)
    x9  — visits_factor        min(visits, 10) / 10

Weights are hand-calibrated from the domain knowledge encoded in the
scoring formula. When real conversion data is available these can be
replaced with sklearn LogisticRegression.fit() coefficients.

Output: probability in [0, 1], label (alto/medio/bajo) and top_factors.
"""

import math
from dataclasses import dataclass
from typing import Optional


@dataclass
class PredictRequest:
    lead_id: str
    total_score: float
    quiz_score: float
    behavior_score: float
    engagement_score: float
    demographic_score: float
    days_since_last_seen: Optional[int] = None   # None = unknown
    visits: int = 0
    asked_price: bool = False
    requested_demo: bool = False
    conversation_rounds: int = 0


@dataclass
class PredictResponse:
    lead_id: str
    conversion_probability: float    # 0.0 – 1.0
    label: str                       # alto | medio | bajo
    top_factors: list[str]
    interpretation: str


# ── Calibrated weights (logistic regression coefficients) ────────────────────
# Bias term is set so that a score=50 with no signals yields prob ≈ 0.15
# (most leads without strong signals don't convert)

BIAS            = -3.5
W_TOTAL         =  4.0   # dominant predictor
W_QUIZ          =  1.5   # quiz completion matters
W_BEHAVIOR      =  1.2
W_ENGAGEMENT    =  2.0   # high-intent signals
W_DEMOGRAPHIC   =  1.0
W_RECENCY       =  1.5   # recency is strong — stale leads drop sharply
W_PRICE_ASK     =  1.8   # strongest single signal after total score
W_DEMO_REQ      =  1.6
W_VISITS        =  0.8


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def predict(req: PredictRequest) -> PredictResponse:
    # Normalize features to [0, 1]
    x_total      = req.total_score / 100.0
    x_quiz       = req.quiz_score / 40.0
    x_behavior   = req.behavior_score / 30.0
    x_engagement = req.engagement_score / 20.0
    x_demo       = req.demographic_score / 10.0

    # Recency factor: more recent = higher weight
    if req.days_since_last_seen is None:
        x_recency = 0.5
    elif req.days_since_last_seen <= 7:
        x_recency = 1.0
    elif req.days_since_last_seen <= 30:
        x_recency = 0.6
    else:
        x_recency = 0.2

    x_visits   = min(req.visits, 10) / 10.0
    x_price    = 1.0 if req.asked_price    else 0.0
    x_demo_req = 1.0 if req.requested_demo else 0.0

    # Linear combination
    z = (
        BIAS
        + W_TOTAL      * x_total
        + W_QUIZ       * x_quiz
        + W_BEHAVIOR   * x_behavior
        + W_ENGAGEMENT * x_engagement
        + W_DEMOGRAPHIC * x_demo
        + W_RECENCY    * x_recency
        + W_PRICE_ASK  * x_price
        + W_DEMO_REQ   * x_demo_req
        + W_VISITS     * x_visits
    )

    prob = round(sigmoid(z), 4)

    # Label
    if prob >= 0.65:
        label = "alto"
    elif prob >= 0.35:
        label = "medio"
    else:
        label = "bajo"

    # Top factors — contributions sorted by absolute weight × value
    factors = {
        "Score total alto": W_TOTAL      * x_total,
        "Alta completitud del quiz": W_QUIZ       * x_quiz,
        "Comportamiento en sitio": W_BEHAVIOR   * x_behavior,
        "Señales de intención": W_ENGAGEMENT * x_engagement,
        "Perfil demográfico": W_DEMOGRAPHIC * x_demo,
        "Visto recientemente": W_RECENCY    * x_recency,
        "Preguntó por precio": W_PRICE_ASK  * x_price,
        "Solicitó demo": W_DEMO_REQ   * x_demo_req,
        "Múltiples visitas": W_VISITS     * x_visits,
    }
    # Take top 3 non-zero contributors
    top_factors = [
        k for k, v in sorted(factors.items(), key=lambda kv: -kv[1])
        if v > 0.05
    ][:3]

    # Human-readable interpretation
    pct = round(prob * 100)
    if label == "alto":
        interpretation = f"{pct}% probabilidad de cierre — Lead prioritario, contactar en menos de 24 h."
    elif label == "medio":
        interpretation = f"{pct}% probabilidad de cierre — Lead en nurturing, seguimiento en 3–5 días."
    else:
        interpretation = f"{pct}% probabilidad de cierre — Lead frío, mantener en secuencia automática."

    return PredictResponse(
        lead_id=req.lead_id,
        conversion_probability=prob,
        label=label,
        top_factors=top_factors,
        interpretation=interpretation,
    )

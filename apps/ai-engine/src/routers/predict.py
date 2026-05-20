"""
POST /predict — Predictive conversion probability for a lead.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from services.predictive_engine import predict, PredictRequest

router = APIRouter(tags=["predict"])


class PredictRequestBody(BaseModel):
    lead_id: str
    total_score: float = Field(..., ge=0, le=100)
    quiz_score: float = Field(0.0, ge=0, le=40)
    behavior_score: float = Field(0.0, ge=0, le=30)
    engagement_score: float = Field(0.0, ge=0, le=20)
    demographic_score: float = Field(0.0, ge=0, le=10)
    days_since_last_seen: Optional[int] = Field(None, ge=0)
    visits: int = Field(0, ge=0)
    asked_price: bool = False
    requested_demo: bool = False
    conversation_rounds: int = Field(0, ge=0)


class PredictResponseBody(BaseModel):
    lead_id: str
    conversion_probability: float
    label: str
    top_factors: list[str]
    interpretation: str


@router.post("/", response_model=PredictResponseBody)
async def predict_conversion(body: PredictRequestBody) -> PredictResponseBody:
    """
    Predicts conversion probability for a lead using a calibrated
    logistic regression model over scoring components.

    Returns:
    - conversion_probability: 0.0–1.0
    - label: "alto" | "medio" | "bajo"
    - top_factors: up to 3 main drivers
    - interpretation: human-readable summary
    """
    try:
        req = PredictRequest(
            lead_id=body.lead_id,
            total_score=body.total_score,
            quiz_score=body.quiz_score,
            behavior_score=body.behavior_score,
            engagement_score=body.engagement_score,
            demographic_score=body.demographic_score,
            days_since_last_seen=body.days_since_last_seen,
            visits=body.visits,
            asked_price=body.asked_price,
            requested_demo=body.requested_demo,
            conversation_rounds=body.conversation_rounds,
        )
        result = predict(req)
        return PredictResponseBody(
            lead_id=result.lead_id,
            conversion_probability=result.conversion_probability,
            label=result.label,
            top_factors=result.top_factors,
            interpretation=result.interpretation,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

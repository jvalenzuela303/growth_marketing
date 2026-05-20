from pydantic import BaseModel, Field, computed_field
from typing import Optional, List
from enum import Enum


class LeadSegment(str, Enum):
    FUEGO = "fuego"
    CALIENTE = "caliente"
    TIBIO = "tibio"
    FRIO = "frio"
    MOTOR_DETENIDO = "motor_detenido"


class LeadPathology(str, Enum):
    LISTO_PARA_COMPRAR = "listo_para_comprar"
    BUSCANDO_SOLUCION = "buscando_solucion"
    CONSCIENTE_DEL_PROBLEMA = "consciente_del_problema"
    EXPLORANDO_OPCIONES = "explorando_opciones"
    NECESITA_BASE = "necesita_base"


class QuizAnswer(BaseModel):
    question_id: str
    question_index: int
    option_id: Optional[str] = None
    option_ids: Optional[List[str]] = None
    text_value: Optional[str] = None
    number_value: Optional[float] = None


class BehaviorData(BaseModel):
    visits: int = 0
    pricing_page_clicks: int = 0
    total_time_seconds: int = 0
    email_opens: int = 0
    email_clicks: int = 0
    whatsapp_replies: int = 0
    asked_price_question: bool = False
    requested_demo: bool = False
    conversation_rounds: int = 0
    shared_content: bool = False
    linkedin_interaction: bool = False
    is_decision_maker: bool = False
    has_existing_crm: bool = False
    company_size: Optional[int] = None
    industry: Optional[str] = None


class ScoreRequest(BaseModel):
    lead_id: str
    tenant_id: str
    quiz_answers: List[QuizAnswer]
    behavior_data: BehaviorData
    quiz_completion_percentage: float = Field(ge=0, le=100)


class ScoreComponents(BaseModel):
    quiz_score: float = Field(ge=0, le=40)
    behavior_score: float = Field(ge=0, le=30)
    engagement_score: float = Field(ge=0, le=20)
    demographic_score: float = Field(ge=0, le=10)
    total_score: float = Field(ge=0, le=100)


class ScoreResponse(BaseModel):
    lead_id: str
    scores: ScoreComponents
    segment: LeadSegment
    # True si score >= 80 y condiciones multicriteria (urgencia + presupuesto)
    hot_lead_alert: bool

    @computed_field
    @property
    def total_score(self) -> float:
        return self.scores.total_score


class ClassifyRequest(BaseModel):
    lead_id: str
    tenant_id: str
    quiz_answers: List[QuizAnswer]
    behavior_summary: str
    total_score: float
    segment: LeadSegment


class ClassifyResponse(BaseModel):
    lead_id: str
    pathology: LeadPathology
    confidence: float = Field(ge=0, le=1)
    primary_pain: str
    recommended_approach: str
    model_used: str

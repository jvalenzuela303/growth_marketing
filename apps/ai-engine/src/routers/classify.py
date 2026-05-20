from fastapi import APIRouter, HTTPException
from models.lead import ClassifyRequest, ClassifyResponse
from services.ai_classifier import classify_lead

router = APIRouter(tags=["classification"])


@router.post("/", response_model=ClassifyResponse)
async def classify_lead_endpoint(request: ClassifyRequest) -> ClassifyResponse:
    """
    Clasifica la patologia del lead usando Claude claude-sonnet-4-6 con prompt caching.

    Retorna:
        - pathology      : Arquetipo psicologico (listo_para_comprar, buscando_solucion, etc.)
        - confidence     : Certeza de la clasificacion (0.0 a 1.0)
        - primary_pain   : Dolor principal del lead (max 20 palabras)
        - recommended_approach : Tactica comercial recomendada (max 30 palabras)
        - model_used     : Modelo que realizo la clasificacion

    Si el provider falla, el sistema hace fallback automatico a GPT-4o-mini.
    Si el JSON de respuesta no es valido, retorna valores seguros de fallback.
    """
    try:
        return await classify_lead(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

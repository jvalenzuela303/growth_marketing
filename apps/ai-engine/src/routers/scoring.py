from fastapi import APIRouter, HTTPException
from models.lead import ScoreRequest, ScoreResponse
from services.scoring_engine import calculate_score

router = APIRouter(tags=["scoring"])


@router.post("/", response_model=ScoreResponse)
async def score_lead(request: ScoreRequest) -> ScoreResponse:
    """
    Calcula el score de un lead usando la fórmula B(30) + Q(40) + E(20) + D(10).

    Retorna el score por componente, el segmento cualitativo y una bandera
    hot_lead_alert cuando se cumplen las condiciones multicriteria:
        - Score >= 80
        - Urgencia alta (Q9 = "menos_1_mes" o "ya")
        - Presupuesto disponible (Q10 != "no_tengo")

    CASO DE VALIDACION del spec:
        CEO + 3 visitas + 2 clics en precios + 90% quiz + pregunto precio
        Score esperado: ~95/100 con segmento FUEGO y hot_lead_alert True
    """
    try:
        return calculate_score(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

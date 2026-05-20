"""
AI Classifier — Clasificación de patología del lead con Claude claude-sonnet-4-6
==========================================================================
Usa Anthropic claude-sonnet-4-6 con prompt caching para clasificar el arquetipo
de cada lead según sus respuestas al quiz y comportamiento digital.

Por qué claude-sonnet-4-6 y no GPT-4o-mini para esta tarea:
    - El análisis de patología requiere razonamiento contextual en español LATAM
    - La clasificación impacta directamente el flujo de nurturing → error = lead perdido
    - Con prompt caching el costo real es ~$0.003 por clasificación (aceptable)
    - GPT-4o-mini se reserva para respuestas conversacionales de alto volumen
"""

import json
import logging

from services.ai_provider import ai_provider
from prompts.classification import CLASSIFICATION_SYSTEM_PROMPT, build_classification_prompt
from models.lead import ClassifyRequest, ClassifyResponse, LeadPathology

logger = logging.getLogger(__name__)

# Valores de fallback cuando Claude no devuelve JSON válido
_FALLBACK_PATHOLOGY = LeadPathology.CONSCIENTE_DEL_PROBLEMA
_FALLBACK_CONFIDENCE = 0.4
_FALLBACK_PAIN = "No determinado — datos insuficientes"
_FALLBACK_APPROACH = "Seguimiento educativo estándar con secuencia de nurturing"


async def classify_lead(request: ClassifyRequest) -> ClassifyResponse:
    """
    Clasifica el arquetipo psicológico del lead usando Claude claude-sonnet-4-6.

    Flujo:
    1. Construye el prompt con los datos del lead
    2. Llama a Claude con temperature baja (0.2) para maximizar consistencia
    3. Parsea el JSON de respuesta
    4. Si el parseo falla, aplica valores de fallback seguros (no falla la API)

    Args:
        request: Datos del lead incluyendo quiz_answers, behavior_summary y score

    Returns:
        ClassifyResponse con pathology, confidence, primary_pain, recommended_approach
    """
    prompt = build_classification_prompt(request)

    result = await ai_provider.complete(
        prompt=prompt,
        system=CLASSIFICATION_SYSTEM_PROMPT,
        provider="anthropic",
        model="claude-sonnet-4-6",
        max_tokens=512,
        temperature=0.2,  # Baja temperatura = más determinístico y consistente
        use_cache=True,   # El system prompt es fijo → prompt caching ahorra ~90% costo
    )

    pathology, confidence, primary_pain, recommended_approach = _parse_claude_response(
        result["content"], request.lead_id
    )

    return ClassifyResponse(
        lead_id=request.lead_id,
        pathology=pathology,
        confidence=confidence,
        primary_pain=primary_pain,
        recommended_approach=recommended_approach,
        model_used=result["model"],
    )


def _parse_claude_response(
    content: str,
    lead_id: str,
) -> tuple[LeadPathology, float, str, str]:
    """
    Parsea la respuesta JSON de Claude y valida los campos requeridos.

    En caso de error retorna valores de fallback seguros para no interrumpir
    el flujo del sistema. El error queda registrado en los logs para revisión.

    Returns:
        Tuple (pathology, confidence, primary_pain, recommended_approach)
    """
    try:
        # Claude puede envolver el JSON en whitespace — strip lo limpia
        data = json.loads(content.strip())

        archetype_raw = data.get("archetype", "")
        pathology = LeadPathology(archetype_raw)

        confidence = float(data.get("confidence", _FALLBACK_CONFIDENCE))
        # Clamp al rango válido por si Claude devuelve valores fuera de [0,1]
        confidence = max(0.0, min(1.0, confidence))

        primary_pain = str(data.get("primary_pain", _FALLBACK_PAIN))
        recommended_approach = str(data.get("recommended_approach", _FALLBACK_APPROACH))

        return pathology, confidence, primary_pain, recommended_approach

    except (json.JSONDecodeError, ValueError, KeyError) as exc:
        logger.warning(
            "classify_lead: failed to parse Claude response for lead %s — %r. "
            "Raw content: %.200s. Applying fallback.",
            lead_id, exc, content,
        )
        return (
            _FALLBACK_PATHOLOGY,
            _FALLBACK_CONFIDENCE,
            _FALLBACK_PAIN,
            _FALLBACK_APPROACH,
        )

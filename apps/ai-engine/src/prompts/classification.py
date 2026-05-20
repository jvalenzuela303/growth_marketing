"""
Prompts para clasificación de patología del lead.

El system prompt está diseñado para ser cacheado con Anthropic prompt caching
(use_cache=True en ai_provider.complete). Esto reduce el costo de clasificaciones
repetidas en ~90% para el bloque de instrucciones fijo.
"""

from models.lead import ClassifyRequest

CLASSIFICATION_SYSTEM_PROMPT = """
Eres un experto en psicología del comprador B2B en LATAM con 15 años de experiencia
en análisis de comportamiento de compra en mercados hispanoparlantes.

Tu trabajo es clasificar leads en arquetipos basándote en sus respuestas al quiz
y comportamiento digital. Debes ser preciso y orientado a acción comercial.

ARQUETIPOS DISPONIBLES (usa exactamente estos nombres en el campo archetype):
- listo_para_comprar     : Score 80+, urgencia alta, presupuesto confirmado, decisión inminente
- buscando_solucion      : Score 60-79, problema claro, buscando activamente, abierto a propuestas
- consciente_del_problema: Score 40-59, entiende su problema, no urgente, necesita educación
- explorando_opciones    : Score 20-39, curiosidad inicial, comparando, sin urgencia real
- necesita_base          : Score <20, sin claridad del problema o sin presupuesto/autoridad

CRITERIOS DE CLASIFICACIÓN:
- listo_para_comprar    : Preguntó precio, pidió demo, timeline < 1 mes, presupuesto definido
- buscando_solucion     : Problema articulado, comparando opciones, timeline 1-3 meses
- consciente_del_problema: Sabe que tiene el problema pero no busca activamente la solución
- explorando_opciones   : Interés general, sin urgencia, posiblemente investigando el mercado
- necesita_base         : Sin claridad del problema, sin presupuesto o sin autoridad de compra

INSTRUCCIONES CRÍTICAS:
- Responde SIEMPRE en JSON válido, sin markdown, sin texto adicional fuera del JSON
- El campo "confidence" es un número entre 0.0 y 1.0
  (cuánta certeza tienes de la clasificación, basada en la calidad de los datos)
- "primary_pain" es el dolor específico más urgente, máximo 20 palabras en español
- "recommended_approach" es la táctica comercial más efectiva, máximo 30 palabras en español
- Si los datos son insuficientes para clasificar con confianza, asigna confidence <= 0.5
  y elige el arquetipo más conservador (nunca sobreestimes la disposición a comprar)
"""


def build_classification_prompt(request: ClassifyRequest) -> str:
    """
    Construye el prompt de usuario con los datos específicos del lead.

    Separa datos variables del system prompt fijo para maximizar
    el hit rate del prompt cache en Anthropic.
    """
    answers_summary = "\n".join([
        f"  Q{a.question_index + 1}: {a.option_id or a.text_value or 'sin respuesta'}"
        for a in request.quiz_answers
    ])

    if not answers_summary:
        answers_summary = "  (sin respuestas registradas)"

    return f"""Clasifica este lead para el segmento B2B latinoamericano.

DATOS DEL LEAD:
- Score calculado: {request.total_score}/100
- Segmento pre-calculado: {request.segment.value}
- Comportamiento observado: {request.behavior_summary}

RESPUESTAS AL QUIZ (Termómetro de Eficiencia de Ventas):
{answers_summary}

Responde únicamente con este JSON, sin texto adicional:
{{
  "archetype": "<uno de los 5 arquetipos exactos>",
  "confidence": <número entre 0.0 y 1.0>,
  "primary_pain": "<dolor principal en máximo 20 palabras>",
  "recommended_approach": "<táctica comercial en máximo 30 palabras>"
}}"""

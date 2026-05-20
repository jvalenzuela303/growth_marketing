---
name: Arquitectura de scoring normalizado para quizzes de diagnóstico
description: Fórmula de scoring, sistema de pesos por tipo de pregunta, normalización a 100 puntos, y lógica de alertas condicionales multicriteria
type: reference
---

## Fórmula base de scoring

SCORE_BRUTO = Suma de (Puntos_respuesta × Peso_pregunta)
SCORE_MAXIMO_POSIBLE = Suma de (Puntaje_máximo × Peso) para cada pregunta
SCORE_NORMALIZADO = (SCORE_BRUTO / SCORE_MAXIMO_POSIBLE) × 100

Resultado siempre entre 0 y 100. Permite comparar quizzes con distinto número de preguntas.

## Pesos recomendados por tipo de pregunta (diagnóstico de ventas/marketing)

| Tipo de pregunta | Peso recomendado | Razón |
|---|---|---|
| Situación base / contexto | 1.0x | Calibrador, no discrimina intención |
| Madurez del proceso | 1.3x - 1.5x | Diagnóstico central |
| Urgencia y dolor económico | 1.8x - 2.0x | Determina receptividad a la oferta |
| Budget / intención de inversión | 1.8x | Calificación de lead |
| Timing / horizonte de decisión | 1.6x | Prioridad de contacto |

## Sistema de alertas condicionales (hot lead detection)

Las alertas NO deben basarse solo en score total — usar condiciones multicriteria para mayor precisión:

Condición A: urgencia económica alta (Q7>=4) AND timing corto (Q10>=4)
Condición B: ausencia total de sistema (Q3=sin medición AND Q6=prospectos perdidos AND Q8=sin herramientas)
Condición C: budget alto (Q9>=4 puntos) AND score >= umbral mínimo de seriedad (>=25)
Condición D: score extremadamente bajo (<20) — máxima receptividad por dolor agudo

Cualquier condición activa alerta_vendedor=TRUE y protocolo de contacto en <15 minutos.

## Configuración de rangos de segmento para quiz de 10 preguntas

Para un quiz bien calibrado con 5 segmentos y score máximo 100:
- Segmento 1 (crítico): 0-24
- Segmento 2 (bajo): 25-44
- Segmento 3 (medio): 45-64
- Segmento 4 (alto): 65-79
- Segmento 5 (élite): 80-100

La distribución esperada en audiencia fría desde Meta Ads:
~30% en S1, ~35% en S2, ~25% en S3, ~8% en S4, ~2% en S5

## Preguntas de mayor peso diagnóstico en contexto de ventas

Las preguntas que más discriminan entre leads de alta y baja calidad en contexto de ventas B2B/PyME:
1. "¿Cuánto estimas que pierdes mensualmente?" (cuantifica el dolor — peso 2.0x)
2. "¿Qué pasa con los prospectos que no compran al primer contacto?" (seguimiento — peso 1.5x)
3. "¿Cuál es tu tasa de conversión?" (medición activa — peso 1.4x)
4. "¿En qué momento estás para resolver este problema?" (timing — peso 1.6x)

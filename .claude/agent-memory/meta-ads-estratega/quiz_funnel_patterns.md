---
name: Patrones de Alto Rendimiento - Quiz Funnels
description: Insights y mejores practicas especificas para funnels de captacion basados en quiz diagnostico
type: reference
---

## Por que un quiz mejora el CPL vs landing page directa
- Genera micro-compromisos progresivos (cada pregunta es un "si" pequeno)
- El resultado del score crea inversion emocional antes del opt-in
- Leads pre-clasificados reducen el costo de calificacion del equipo de ventas
- "Sneak peek" del score antes de pedir email aumenta el completion rate

## Estructura optima del quiz para B2B SaaS LATAM
- Maximo 10-12 preguntas
- Preguntas de seleccion multiple (no texto abierto)
- Barra de progreso visible siempre
- Mostrar score parcial o "preview" antes del email
- Segmentar por tipo de negocio en las primeras 2 preguntas para personalizar resultado

## Custom Events recomendados (orden de implementacion)
1. QuizStarted (minimo viable)
2. QuizCompleted + Lead (para optimizacion de campanas)
3. HighScoreLead (para remarketing y LAL de calidad)
4. Scheduled (para medir el valor real del funnel)

## Segmentacion por Score (tiers)
- Score > 70: HighScoreLead - contacto comercial inmediato (< 24 horas)
- Score 40-70: Lead medio - secuencia de nurturing 7-14 dias
- Score < 40: Lead frio - educacion de largo plazo o excluir del ad spend

## Remarketing post-quiz mas efectivo
- Mayor ROI: abandono de quiz (QuizStarted menos QuizCompleted) - CPL 50-60% menor que cold
- Segunda prioridad: HighScoreLead sin Scheduled - mayor valor por lead
- Ventana de urgencia: 0-3 dias post abandono es critica; despues el costo de recuperacion sube

## Integracion tecnica recomendada para quiz con IA
- Landing page externa (no Lead Ads) por necesidad de logica condicional
- CAPI via Zapier/Make como MVP; luego migrar a SDK directo
- eventID en cada evento del pixel para deduplicacion CAPI-browser
- Capturar fbp y fbc cookies desde el browser para maximizar EMQ

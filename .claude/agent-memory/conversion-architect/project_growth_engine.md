---
name: Proyecto The Growth Engine
description: Detalles del producto SaaS: quiz diagnóstico como núcleo, tráfico desde Meta Ads, integración CRM con automatizaciones post-quiz
type: project
---

The Growth Engine es una plataforma SaaS de embudos inteligentes.

Arquitectura del producto:
- Quiz diagnóstico tipo ScoreApp (10 preguntas) es el corazón del embudo
- Tráfico de entrada: Meta Ads principalmente
- Output del quiz: score numérico (0-100) + segmento + tags CRM
- Post-quiz: automatizaciones de seguimiento activadas por score range y tags condicionales
- Nombre del quiz principal: "Termómetro de Eficiencia de Ventas"

Caso de uso principal trabajado: diagnóstico de marketing/ventas para empresas con equipo comercial activo.

Segmentos de resultado diseñados (con nombres y score ranges):
1. Motor Detenido (0-24)
2. Motor en Ralentí (25-44)
3. Motor con Fugas (45-64)
4. Motor Afinado (65-79)
5. Motor de Alta Performance (80-100)

Sistema de alertas implementado: condición multicriteria para activar notificación inmediata a vendedor humano (alerta_vendedor = TRUE).

**Why:** El quiz es el punto de entrada al funnel — todo el sistema depende de la calidad del scoring y segmentación.

**How to apply:** Al sugerir mejoras o variantes, siempre conectar con el impacto en el scoring, la segmentación o las automatizaciones post-quiz. No sugerir cambios aislados.

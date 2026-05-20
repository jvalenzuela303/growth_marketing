---
name: Project Overview — The Growth Engine
description: Descripción del producto, objetivos de negocio, y arquitectura general del sistema
type: project
---

The Growth Engine es una plataforma SaaS de embudos inteligentes con IA para el mercado LATAM, con foco inicial en México.

**Producto:** Quiz-based funnel builder con automatización multicanal (email + WhatsApp), analytics avanzado conectado a Meta Ads.

**Objetivo principal:** Reducir CAC y maximizar ROAS mediante un feedback loop donde los datos de conversión alimentan las campañas de Meta Ads continuamente.

**Arquitectura central:**
- Frontend Quiz → API Backend → BigQuery → Looker Studio → Meta Ads Algorithm
- Meta Pixel (browser) + Meta CAPI (server-side) en paralelo con deduplicación
- n8n para automatización de flujos lead lifecycle → audiencias → CAPI events

**ICP (Ideal Customer Profile):**
- Agencias digitales 5-50 personas en LATAM
- MRR propio USD 15K-200K
- Startups growth-stage con foco en performance marketing

**Why:** El sistema fue diseñado para cerrar la brecha entre datos de conversión del CRM y el algoritmo de Meta Ads, que en implementaciones típicas opera con señales incompletas.

**How to apply:** Toda decisión técnica debe justificarse en términos de impacto en CAC o tasa de conversión. Si una integración no mueve estas métricas, cuestionar su prioridad.

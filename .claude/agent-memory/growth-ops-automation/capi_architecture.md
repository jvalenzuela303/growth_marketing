---
name: Meta CAPI Architecture — The Growth Engine
description: Configuración de Meta Conversions API, eventos definidos, estrategia de deduplicación y targets de EMQ
type: project
---

Arquitectura CAPI definida en sesión 2026-05-08:

**Eventos a trackear (7 eventos):**
1. QuizStarted — custom event, funnelStage: 'tofu'
2. QuizCompleted — custom event, incluye leadScore y quiz answers, funnelStage: 'mofu'
3. Lead — estándar Meta, se dispara al capturar datos de contacto
4. HighScoreLead — custom event, SOLO si leadScore >= 70, value = score * 15 MXN
5. CompleteRegistration — estándar Meta
6. Schedule — estándar Meta, cuando agenda demo
7. Purchase — estándar Meta, incluye MRR como value, currency MXN

**Deduplicación:**
- event_id formato: `{eventName}_{userId}_{timestampSegundos}`
- Frontend llama al backend PRIMERO para obtener el event_id
- Luego dispara fbq('track') con ese mismo event_id
- CAPI envía simultáneamente con el mismo event_id
- Meta deduplica automáticamente con ventana de 48h

**EMQ Score:**
- Target: > 7.5
- Campos que maximizan EMQ: email (hasheado) + phone (hasheado) + fbc + fbp + client_ip + user_agent
- Normalización de teléfono: agregar código de país 52 (MX) si son 10 dígitos

**Retry mechanism:** 3 intentos con backoff exponencial (1s, 2s, 4s)
**Fallback:** Cola de reintentos en Redis/BullMQ para eventos que fallan las 3 veces

**API endpoint:** `https://graph.facebook.com/v21.0/{PIXEL_ID}/events`
**Autenticación:** `?access_token={META_CAPI_ACCESS_TOKEN}` (query param)

**Variables de entorno requeridas:**
- META_PIXEL_ID
- META_CAPI_ACCESS_TOKEN

**Why:** La calidad de señal CAPI impacta directamente en la eficiencia del algoritmo de Meta. EMQ > 7.0 puede reducir CPL hasta 25-40% vs. señales browser-only.

**How to apply:** Nunca escalar gasto en Meta Ads antes de confirmar EMQ > 7.0 operativo. Cada evento debe incluir todos los campos PII disponibles hasheados con SHA-256.

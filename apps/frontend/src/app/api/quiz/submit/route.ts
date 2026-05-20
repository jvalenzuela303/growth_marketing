import { NextRequest, NextResponse } from 'next/server'
import type { QuizSubmission } from '@growth-engine/shared-types'

// ---------------------------------------------------------------------------
// SHA-256 hash helper — Web Crypto API (edge-compatible)
// ---------------------------------------------------------------------------

async function hashSHA256(value: string): Promise<string> {
  const normalized = value.toLowerCase().trim()
  const buffer     = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized),
  )
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// Meta CAPI server-side event
// ---------------------------------------------------------------------------

interface CAPIParams {
  event:    string
  value:    number
  userData: {
    hashedEmail?: string
    hashedPhone?: string
  }
  eventId:  string
  request:  NextRequest
}

async function sendMetaCAPIEvent({
  event,
  value,
  userData,
  eventId,
  request,
}: CAPIParams): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID
  const token   = process.env.META_CAPI_TOKEN
  if (!pixelId || !token) {
    console.warn('[CAPI] META_PIXEL_ID or META_CAPI_TOKEN not set — skipping CAPI event')
    return
  }

  // Extract fbp / fbc cookies for attribution accuracy
  const cookies = request.headers.get('cookie') ?? ''
  const fbp     = cookies.match(/_fbp=([^;]+)/)?.[1]
  const fbc     = cookies.match(/_fbc=([^;]+)/)?.[1]

  const payload = {
    data: [
      {
        event_name:     event,
        event_time:     Math.floor(Date.now() / 1000),
        event_id:       eventId,
        action_source:  'website',
        event_source_url: request.headers.get('referer') ?? undefined,
        user_data: {
          em:                  userData.hashedEmail    ? [userData.hashedEmail]  : undefined,
          ph:                  userData.hashedPhone    ? [userData.hashedPhone]  : undefined,
          client_ip_address:   request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
          client_user_agent:   request.headers.get('user-agent')       ?? undefined,
          fbp:                 fbp ?? undefined,
          fbc:                 fbc ?? undefined,
        },
        custom_data: {
          value,
          currency: 'USD',
          content_name: 'QuizCompleted',
        },
      },
    ],
    // Test event code only in development
    ...(process.env.META_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_TEST_EVENT_CODE }
      : {}),
  }

  // Fire and forget — CAPI must never block the user response
  await fetch(
    `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    },
  ).catch((err) =>
    console.error('[CAPI] Failed to send event:', err),
  )
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse and validate request body
  let body: QuizSubmission & { funnelSlug: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Cuerpo de solicitud inválido' },
      { status: 400 },
    )
  }

  const { tenantSlug, funnelSlug, answers, leadData, sessionId } = body

  // Basic required fields validation
  if (!tenantSlug || !funnelSlug || !Array.isArray(answers) || !leadData?.email) {
    return NextResponse.json(
      { error: 'Datos incompletos. Se requieren tenantSlug, funnelSlug, answers y leadData.email.' },
      { status: 422 },
    )
  }

  // 2. Forward submission to NestJS backend
  const apiUrl = process.env.API_URL ?? 'http://localhost:3001'
  let backendData: {
    leadId:     string
    totalScore: number
    segment:    string
    pathology?: string
  }

  try {
    const backendRes = await fetch(
      `${apiUrl}/api/v1/quiz/${tenantSlug}/${funnelSlug}/submit`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        // 10-second timeout — score computation should never hang longer
        signal: AbortSignal.timeout(10_000),
      },
    )

    if (!backendRes.ok) {
      const errText = await backendRes.text().catch(() => 'Unknown backend error')
      console.error(`[quiz/submit] Backend error ${backendRes.status}:`, errText)
      return NextResponse.json(
        { error: 'Error al procesar el quiz. Por favor intenta de nuevo.' },
        { status: 502 },
      )
    }

    backendData = await backendRes.json()
  } catch (err) {
    // Network errors or timeout
    console.error('[quiz/submit] Backend unreachable:', err)
    return NextResponse.json(
      { error: 'No se pudo conectar al servidor. Por favor intenta de nuevo.' },
      { status: 503 },
    )
  }

  // 3. Fire Meta CAPI event server-side (async, non-blocking)
  //    Deduplication: event_id matches any browser-side pixel event for this submission
  const eventId = `quiz_${backendData.leadId}_${Date.now()}`

  const [hashedEmail, hashedPhone] = await Promise.all([
    hashSHA256(leadData.email),
    leadData.phone ? hashSHA256(leadData.phone) : Promise.resolve(undefined),
  ])

  // Non-awaited so CAPI latency never affects the user
  sendMetaCAPIEvent({
    event:    'QuizCompleted',
    value:    backendData.totalScore,
    userData: { hashedEmail, hashedPhone },
    eventId,
    request:  req,
  }).catch((err) => console.error('[quiz/submit] CAPI fire failed:', err))

  // 4. Return result to frontend
  return NextResponse.json(
    {
      leadId:     backendData.leadId,
      totalScore: backendData.totalScore,
      segment:    backendData.segment,
      pathology:  backendData.pathology,
      eventId,   // pass to client for pixel deduplication
    },
    { status: 200 },
  )
}

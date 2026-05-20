/**
 * API client — thin wrapper around fetch with typed responses.
 * All requests go through the Next.js API route or directly to the
 * NestJS backend depending on context (server vs. client).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = 'UNKNOWN_ERROR'
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      code = body.code ?? code
      message = body.message ?? message
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, code, message)
  }
  return res.json() as Promise<T>
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  serverSide = false,
): Promise<T> {
  const base = serverSide ? (process.env.API_URL ?? API_BASE) : API_BASE
  const url = `${base}${path}`

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  return handleResponse<T>(res)
}

// ---------------------------------------------------------------------------
// Funnel
// ---------------------------------------------------------------------------

import type { Funnel, QuizConfig } from '@growth-engine/shared-types'
export type { Funnel }

export async function getFunnelConfig(
  tenantSlug: string,
  funnelSlug: string,
  serverSide = false,
): Promise<Funnel> {
  return apiFetch<Funnel>(
    `/api/v1/funnels/${tenantSlug}/${funnelSlug}`,
    { cache: 'no-store' },
    serverSide,
  )
}

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------

// Shape returned by the backend /analytics/kpis endpoint
interface AnalyticsKPIsRaw {
  leads: { today: number; week: number; month: number }
  completionRate: number
  avgScore: number
  segmentDistribution: Record<string, number>
  pipelineDistribution: Record<string, number>
  topFunnels: unknown[]
  generatedAt: string
}

// Shape expected by MetricsDashboard
export interface DashboardKPIs {
  cpl: { value: number; target: number; trend: number }
  cac: { value: number; target: number; trend: number }
  roas: { value: number; target: number; trend: number }
  quizCompletionRate: { value: number; target: number; trend: number }
  automationRate: { value: number; target: number; trend: number }
  totalLeads: number
  hotLeads: number
}

export async function getDashboardKPIs(
  tenantId: string,
  range: '7d' | '30d' | '90d' = '30d',
  token: string,
): Promise<DashboardKPIs> {
  const raw = await apiFetch<AnalyticsKPIsRaw>(
    `/api/v1/analytics/kpis?range=${range}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    true,
  )

  const fuego = raw.segmentDistribution?.['fuego'] ?? 0

  // Map backend response to dashboard shape using available data.
  // CPL, CAC, ROAS are not yet calculated by the backend — shown as 0 until implemented.
  return {
    cpl:              { value: 0, target: 0, trend: 0 },
    cac:              { value: 0, target: 0, trend: 0 },
    roas:             { value: 0, target: 0, trend: 0 },
    quizCompletionRate: { value: raw.completionRate ?? 0, target: 60, trend: 0 },
    automationRate:   { value: 0, target: 0, trend: 0 },
    totalLeads:       raw.leads?.month ?? 0,
    hotLeads:         fuego,
  }
}

export interface LeadRow {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  totalScore: number
  segment: string
  pipelineStage: string
  source: string
  createdAt: string
  conversionProbability?: number | null
  conversionLabel?: string | null
}

export interface LeadsPage {
  data: LeadRow[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export async function getLeads(
  tenantId: string,
  params: {
    page?: number
    pageSize?: number
    segment?: string
    stage?: string
    search?: string
  },
  token: string,
): Promise<LeadsPage> {
  const qs = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.pageSize ?? 25),
    ...(params.segment ? { segment: params.segment } : {}),
    ...(params.stage ? { pipelineStage: params.stage } : {}),
    ...(params.search ? { search: params.search } : {}),
  }).toString()

  return apiFetch<LeadsPage>(
    `/api/v1/leads?${qs}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    true,
  )
}

export async function getFunnels(tenantId: string, token: string): Promise<Funnel[]> {
  return apiFetch<Funnel[]>(
    `/api/v1/funnels`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    true,
  )
}

export async function getFunnelById(funnelId: string, token: string): Promise<Funnel> {
  return apiFetch<Funnel>(
    `/api/v1/funnels/${funnelId}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function updateFunnelQuizConfig(
  funnelId: string,
  quizConfig: QuizConfig,
  token: string,
): Promise<Funnel> {
  return apiFetch<Funnel>(
    `/api/v1/funnels/${funnelId}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quizConfig }),
    },
  )
}

// ---------------------------------------------------------------------------
// Module #3 — Personalized quiz results (public endpoint, no auth required)
// ---------------------------------------------------------------------------

export interface PublicQuizResult {
  segment:      string | null
  score:        number | null
  status:       'processing' | 'ready'
  leadName?:    string
  resultConfig: {
    headline:        string
    subheadline?:    string
    cta:             string
    ctaUrl?:         string
    urgency?:        string
    recommendations?: string[]
    videoUrl?:       string
    calendlyUrl?:    string
  } | null
}

export async function getPublicQuizResult(leadId: string): Promise<PublicQuizResult> {
  return apiFetch<PublicQuizResult>(
    `/api/v1/quiz/result/${leadId}`,
    { cache: 'no-store' },
  )
}

// ---------------------------------------------------------------------------
// Module #5 — Conversations
// ---------------------------------------------------------------------------

export interface ConversationSummary {
  leadId:        string
  firstName?:    string
  lastName?:     string
  email?:        string
  lastMessage?:  string
  lastMessageAt: string
  lastChannel?:  string
  channels?:     string[]
  unreadCount?:  number
}

export interface Message {
  id:         string
  leadId:     string
  role:       'user' | 'assistant' | 'human_agent'
  channel:    'whatsapp' | 'email' | 'chat'
  content:    string
  agentName?: string
  createdAt:  string
}

export async function getConversations(token: string): Promise<ConversationSummary[]> {
  return apiFetch<ConversationSummary[]>(
    '/api/v1/conversations',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function getConversationMessages(leadId: string, token: string): Promise<Message[]> {
  return apiFetch<Message[]>(
    `/api/v1/conversations/${leadId}/messages`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function sendConversationReply(
  leadId: string,
  body: { channel: string; content: string },
  token: string,
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/conversations/${leadId}/messages`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

// ---------------------------------------------------------------------------
// Module #7 — Funnel abandonment analytics
// ---------------------------------------------------------------------------

export interface AbandonmentStep {
  questionIndex: number
  questionText?: string
  views:         number
  completions:   number
  dropOffRate:   number  // percentage 0–100
}

export async function getFunnelAbandonmentStats(
  funnelId: string,
  token: string,
): Promise<{ steps: AbandonmentStep[] }> {
  return apiFetch<{ steps: AbandonmentStep[] }>(
    `/api/v1/analytics/funnels/${funnelId}/abandonment`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

// ---------------------------------------------------------------------------
// Module #8 — Financial KPIs & Ads
// ---------------------------------------------------------------------------

// ── Ads Accounts ────────────────────────────────────────────────────────────

export interface AdsAccount {
  id:                string
  tenantId:          string
  name:              string
  platform:          'meta' | 'google' | 'tiktok' | 'linkedin'
  externalAccountId: string
  accessToken:       string | null  // masked on the server
  status:            'active' | 'paused' | 'disconnected' | 'error'
  isDefault:         boolean
  lastSyncedAt:      string | null
  syncErrorMessage:  string | null
  campaignCount:     number
  createdAt:         string
  updatedAt:         string
}

export interface CreateAdsAccountInput {
  name:              string
  platform:          'meta' | 'google' | 'tiktok' | 'linkedin'
  externalAccountId: string
  accessToken?:      string
}

export interface UpdateAdsAccountInput {
  name?:        string
  accessToken?: string
  status?:      'active' | 'paused' | 'disconnected'
  isDefault?:   boolean
}

export async function getAdsAccounts(token: string): Promise<AdsAccount[]> {
  return apiFetch<AdsAccount[]>(
    '/api/v1/ad-accounts',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function createAdsAccount(body: CreateAdsAccountInput, token: string): Promise<AdsAccount> {
  return apiFetch<AdsAccount>(
    '/api/v1/ad-accounts',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

export async function updateAdsAccount(id: string, body: UpdateAdsAccountInput, token: string): Promise<AdsAccount> {
  return apiFetch<AdsAccount>(
    `/api/v1/ad-accounts/${id}`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

export async function deleteAdsAccount(id: string, token: string): Promise<void> {
  return apiFetch<void>(
    `/api/v1/ad-accounts/${id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
}

export async function syncAdsAccount(id: string, token: string): Promise<{ synced: number; message: string }> {
  return apiFetch<{ synced: number; message: string }>(
    `/api/v1/ad-accounts/${id}/sync`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  )
}

export interface AdCampaign {
  id:          string
  name:        string
  status:      'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  source:      string
  spend:       number
  impressions: number
  clicks:      number
  leads:       number
  periodFrom?: string
  periodTo?:   string
}

export interface FinancialKpis {
  totalSpend:    number
  cpl:           number
  cplTarget?:    number
  cplTrend?:     number
  cac:           number
  cacTarget?:    number
  cacTrend?:     number
  roas:          number
  roasTrend?:    number
  avgCtr:        number
  totalRevenue?: number
  dealCount?:    number
}

// ---------------------------------------------------------------------------
// Deals — revenue attribution
// ---------------------------------------------------------------------------

export interface Deal {
  id:           string
  leadId:       string
  amount:       number
  currency:     string
  funnelId?:    string
  adsAccountId?: string
  campaignName?: string
  source:       string
  stage:        'won' | 'lost' | 'refunded'
  closedAt:     string
  notes?:       string
  createdAt:    string
  lead?: { firstName?: string; lastName?: string; email?: string }
}

export interface CreateDealInput {
  leadId:        string
  amount:        number
  currency?:     string
  funnelId?:     string
  adsAccountId?: string
  campaignName?: string
  source?:       'manual' | 'meta_ads' | 'google_ads' | 'organic'
  stage?:        'won' | 'lost' | 'refunded'
  closedAt?:     string
  notes?:        string
}

export interface DealsPage {
  data: Deal[]
  meta: { total: number; page: number; limit: number; pages: number; revenue: number }
}

export async function getDeals(
  params: { stage?: string; leadId?: string; page?: number; limit?: number },
  token: string,
): Promise<DealsPage> {
  const qs = new URLSearchParams({
    page:  String(params.page  ?? 1),
    limit: String(params.limit ?? 20),
    ...(params.stage  ? { stage:  params.stage  } : {}),
    ...(params.leadId ? { leadId: params.leadId } : {}),
  }).toString()
  return apiFetch<DealsPage>(`/api/v1/deals?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache:   'no-store',
  })
}

export async function createDeal(data: CreateDealInput, token: string): Promise<Deal> {
  return apiFetch<Deal>('/api/v1/deals', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify(data),
  })
}

export async function updateDeal(id: string, data: Partial<CreateDealInput>, token: string): Promise<Deal> {
  return apiFetch<Deal>(`/api/v1/deals/${id}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify(data),
  })
}

export async function deleteDeal(id: string, token: string): Promise<void> {
  return apiFetch<void>(`/api/v1/deals/${id}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export interface AdSpendInput {
  campaignName: string
  source:       'meta_ads' | 'google_ads' | 'manual'
  spend:        number
  currency:     string
  periodFrom:   string
  periodTo:     string
}

export interface AudienceExport {
  id:        string
  segment:   string
  status:    'pending' | 'completed' | 'failed'
  leadCount: number
  createdAt: string
}

// ── Google Ads ───────────────────────────────────────────────────────────────

export interface GoogleAdsCampaign {
  id:          string
  name:        string
  status:      'ENABLED' | 'PAUSED' | 'REMOVED'
  platform:    'google'
  channelType: string | null
  budgetDaily: number | null
  impressions: number
  clicks:      number
  spend:       number
  conversions: number
  ctr:         number   // decimal 0–1 (ej. 0.027 = 2.7%)
  cpc:         number
  cpm:         number
}

export async function getGoogleAdsCampaigns(
  customerId: string,
  token: string,
  days = 30,
): Promise<GoogleAdsCampaign[]> {
  return apiFetch<GoogleAdsCampaign[]>(
    `/api/v1/google-ads/campaigns?customerId=${encodeURIComponent(customerId)}&days=${days}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

// ── TikTok Ads ────────────────────────────────────────────────────────────────

export interface TikTokCampaign {
  id:          string
  name:        string
  status:      string   // ENABLE | DISABLE | DELETE
  objective:   string
  budgetDaily: number
  spend:       number
  impressions: number
  clicks:      number
  conversions: number
  ctr:         number
  cpc:         number
  cpm:         number
  platform:    'tiktok'
}

export interface TikTokCampaignsResponse {
  campaigns: TikTokCampaign[]
  account:   { id: string; name: string; advertiserId: string }
  warning?:  string
}

export async function getTikTokCampaigns(
  advertiserId: string,
  token: string,
  accountId?: string,
): Promise<TikTokCampaignsResponse> {
  const qs = new URLSearchParams({ advertiserId })
  if (accountId) qs.set('accountId', accountId)
  return apiFetch<TikTokCampaignsResponse>(
    `/api/v1/tiktok-ads/campaigns?${qs}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function getAdCampaigns(token: string, accountId?: string): Promise<AdCampaign[]> {
  const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : ''
  return apiFetch<AdCampaign[]>(
    `/api/v1/ad-campaigns${qs}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function syncAdCampaigns(token: string): Promise<void> {
  return apiFetch<void>(
    '/api/v1/ad-campaigns/sync',
    { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
  )
}

export async function createAdSpend(body: AdSpendInput, token: string): Promise<void> {
  return apiFetch<void>(
    '/api/v1/ad-spend',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

export async function getFinancialKpis(
  token: string,
  from?: string,
  to?: string,
): Promise<FinancialKpis> {
  const qs = new URLSearchParams({
    ...(from ? { from } : {}),
    ...(to   ? { to }   : {}),
  }).toString()
  return apiFetch<FinancialKpis>(
    `/api/v1/analytics/financial-kpis${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function exportAudience(
  body: { segment: string; type: string },
  token: string,
): Promise<{ exportId: string }> {
  return apiFetch<{ exportId: string }>(
    '/api/v1/audience-exports',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

// ---------------------------------------------------------------------------
// Module #9 — Email sequences
// ---------------------------------------------------------------------------

export interface SequenceStep {
  id:         string
  delayDays:  number
  delayHours: number
  subject:    string
  body:       string
}

export interface EmailSequence {
  id:               string
  name:             string
  trigger:          'quiz_complete' | 'segment_assigned' | 'manual'
  triggerSegments?: string[]
  scoreMin?:        number
  scoreMax?:        number
  isActive:         boolean
  stepCount:        number
  enrolledCount:    number
  steps?:           SequenceStep[]
  createdAt?:       string
  updatedAt?:       string
}

export interface CreateSequenceInput {
  name:             string
  trigger:          'quiz_complete' | 'segment_assigned' | 'manual'
  triggerSegments?: string[]
  scoreMin?:        number
  scoreMax?:        number
  isActive?:        boolean
  steps:            SequenceStep[]
}

export async function getSequences(token: string): Promise<EmailSequence[]> {
  return apiFetch<EmailSequence[]>(
    '/api/v1/sequences',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function createSequence(
  body: CreateSequenceInput,
  token: string,
): Promise<EmailSequence> {
  return apiFetch<EmailSequence>(
    '/api/v1/sequences',
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

export async function updateSequence(
  id: string,
  body: Partial<CreateSequenceInput>,
  token: string,
): Promise<EmailSequence> {
  return apiFetch<EmailSequence>(
    `/api/v1/sequences/${id}`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    },
  )
}

export async function deleteSequence(id: string, token: string): Promise<void> {
  return apiFetch<void>(
    `/api/v1/sequences/${id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
}

// ---------------------------------------------------------------------------
// Module #6 — AI Chat
// ---------------------------------------------------------------------------

export interface AIChatResponse {
  messageId: string
  response: string
  leadId: string
}

export async function sendChatMessage(
  leadId: string,
  message: string,
  token: string,
  channel = 'chat',
): Promise<AIChatResponse> {
  return apiFetch<AIChatResponse>(
    '/api/v1/chat/message',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ leadId, message, channel }),
    },
  )
}

// ---------------------------------------------------------------------------
// Module #10 — Appointments (Citas)
// ---------------------------------------------------------------------------

export interface Appointment {
  id: string
  tenantId: string
  leadId: string
  scheduledAt: string
  durationMins: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  channel: 'video_call' | 'phone' | 'in_person'
  meetingUrl?: string
  notes?: string
  createdAt: string
}

export interface CreateAppointmentInput {
  leadId: string
  scheduledAt: string
  durationMins?: number
  channel?: 'video_call' | 'phone' | 'in_person'
  meetingUrl?: string
  notes?: string
}

export async function getAppointments(
  params: { leadId?: string; status?: string },
  token: string,
): Promise<Appointment[]> {
  const qs = new URLSearchParams({
    ...(params.leadId ? { leadId: params.leadId } : {}),
    ...(params.status ? { status: params.status } : {}),
  }).toString()
  return apiFetch<Appointment[]>(
    `/api/v1/appointments${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function createAppointment(
  data: CreateAppointmentInput,
  token: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(
    '/api/v1/appointments',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    },
  )
}

export async function updateAppointmentStatus(
  id: string,
  status: Appointment['status'],
  token: string,
): Promise<Appointment> {
  return apiFetch<Appointment>(
    `/api/v1/appointments/${id}/status`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    },
  )
}

// ---------------------------------------------------------------------------
// Module #15 — A/B Testing (Funnel Variants)
// ---------------------------------------------------------------------------

export interface FunnelVariant {
  id: string
  funnelId: string
  tenantId: string
  name: string
  trafficSplit: number
  isControl: boolean
  isActive: boolean
  totalViews: number
  totalStarts: number
  totalCompletions: number
  createdAt: string
}

export interface CreateFunnelVariantInput {
  name: string
  trafficSplit: number
  isControl?: boolean
}

export interface UpdateFunnelVariantInput {
  name?: string
  trafficSplit?: number
  isActive?: boolean
}

export async function getFunnelVariants(
  funnelId: string,
  token: string,
): Promise<FunnelVariant[]> {
  return apiFetch<FunnelVariant[]>(
    `/api/v1/funnels/${funnelId}/variants`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function createFunnelVariant(
  funnelId: string,
  data: CreateFunnelVariantInput,
  token: string,
): Promise<FunnelVariant> {
  return apiFetch<FunnelVariant>(
    `/api/v1/funnels/${funnelId}/variants`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    },
  )
}

export async function updateFunnelVariant(
  funnelId: string,
  variantId: string,
  data: UpdateFunnelVariantInput,
  token: string,
): Promise<FunnelVariant> {
  return apiFetch<FunnelVariant>(
    `/api/v1/funnels/${funnelId}/variants/${variantId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    },
  )
}

export async function deleteFunnelVariant(
  funnelId: string,
  variantId: string,
  token: string,
): Promise<void> {
  return apiFetch<void>(
    `/api/v1/funnels/${funnelId}/variants/${variantId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface TenantSettings {
  id: string
  metaPixelId: string | null
  metaCapiToken: string | null        // masked: '***...XXXX'
  metaWhatsappPhoneId: string | null
  metaWhatsappToken: string | null    // masked
  sendgridApiKey: string | null       // masked
  ghlApiKey: string | null            // masked
  ghlLocationId: string | null
  hubspotApiKey: string | null        // masked
  alertEmail: string | null
  hotLeadAlertEnabled: boolean
  dailyDigestEnabled: boolean
  adAccountId: string | null
  instagramConnected?: boolean
  instagramPageId?: string | null
  instagramUsername?: string | null
  calendlyApiKey?: string | null      // masked
  googleCalendarConnected?: boolean
}

export async function getSettings(token: string): Promise<TenantSettings> {
  return apiFetch<TenantSettings>(
    '/api/v1/settings',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function updateSettings(
  data: Partial<TenantSettings>,
  token: string,
): Promise<TenantSettings> {
  return apiFetch<TenantSettings>(
    '/api/v1/settings',
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    },
  )
}

// ---------------------------------------------------------------------------
// Instagram OAuth
// ---------------------------------------------------------------------------

export interface InstagramStatus {
  connected: boolean
  pageId:    string | null
  username:  string | null
}

export async function getInstagramStatus(token: string): Promise<InstagramStatus> {
  return apiFetch<InstagramStatus>(
    '/api/v1/instagram/oauth/status',
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  )
}

export async function disconnectInstagram(token: string): Promise<void> {
  return apiFetch<void>(
    '/api/v1/instagram/oauth/disconnect',
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  )
}

/** Devuelve la URL a la que redirigir para iniciar el flujo OAuth de Instagram. */
export function getInstagramOAuthInitUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'
  return `${base}/api/v1/instagram/oauth/init`
}

// ---------------------------------------------------------------------------
// Leads — update (stage, notes, tags)
// ---------------------------------------------------------------------------

export interface UpdateLeadInput {
  pipelineStage?: string
  notes?:         string
  tags?:          string[]
}

export async function updateLead(
  id: string,
  data: UpdateLeadInput,
  token: string,
): Promise<LeadRow> {
  return apiFetch<LeadRow>(
    `/api/v1/leads/${id}`,
    {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body:    JSON.stringify(data),
    },
  )
}

// ── Billing ────────────────────────────────────────────────────────────────────

export interface BillingSubscription {
  plan:   string
  status: string
  limits: {
    maxFunnels:          number
    maxLeadsPerMonth:    number
    maxWhatsappMessages: number
  }
  sub: {
    id:                 string
    stripeCustomerId:   string
    stripeSubId?:       string
    stripePriceId?:     string
    plan:               string
    status:             string
    currentPeriodStart?: string
    currentPeriodEnd?:   string
    cancelAtPeriodEnd:  boolean
    trialEnd?:          string
  } | null
}

export interface BillingInvoice {
  id:               string
  stripeInvoiceId:  string
  amountDue:        number
  amountPaid:       number
  currency:         string
  status:           string
  hostedInvoiceUrl?: string
  invoicePdfUrl?:   string
  periodStart?:     string
  periodEnd?:       string
  createdAt:        string
}

export async function getBillingSubscription(token: string): Promise<BillingSubscription> {
  return apiFetch<BillingSubscription>('/api/v1/billing/subscription', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getBillingInvoices(token: string): Promise<BillingInvoice[]> {
  return apiFetch<BillingInvoice[]>('/api/v1/billing/invoices', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function createCheckoutSession(
  plan: 'growth' | 'scale' | 'agency',
  token: string,
): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/v1/billing/checkout', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ plan }),
  })
}

export async function createPortalSession(token: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>('/api/v1/billing/portal', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── CSV exports ────────────────────────────────────────────────────────────────

export async function exportLeadsCsv(
  token: string,
  params: { segment?: string; pipelineStage?: string; source?: string } = {},
): Promise<Blob> {
  const qs  = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][])
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'}/api/v1/leads/export/csv?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}

export async function exportDealsCsv(
  token: string,
  params: { stage?: string } = {},
): Promise<Blob> {
  const qs  = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][])
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001'}/api/v1/deals/export/csv?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  return res.blob()
}

// ── Automation Flows ──────────────────────────────────────────────────────────

export interface AutomationFlow {
  id:          string
  name:        string
  description: string | null
  trigger:     string
  status:      string
  runCount:    number
  lastRunAt:   string | null
  createdAt:   string
  updatedAt:   string
}

export interface AutomationFlowDetail extends AutomationFlow {
  graph: { nodes: FlowNode[]; edges: FlowEdge[] }
}

export interface FlowNode {
  id:       string
  type?:    string
  position: { x: number; y: number }
  data:     Record<string, unknown>
}

export interface FlowEdge {
  id:     string
  source: string
  target: string
}

export interface FlowRun {
  id:         string
  status:     string
  startedAt:  string
  finishedAt: string | null
  log:        Array<{ nodeId: string; type: string; status: string; ts: string }>
}

export async function getAutomationFlows(token: string): Promise<AutomationFlow[]> {
  return apiFetch<AutomationFlow[]>('/api/v1/automation-flows', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getAutomationFlow(id: string, token: string): Promise<AutomationFlowDetail> {
  return apiFetch<AutomationFlowDetail>(`/api/v1/automation-flows/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function createAutomationFlow(
  token: string,
  body: { name: string; description?: string; trigger?: string; graph?: object },
): Promise<AutomationFlowDetail> {
  return apiFetch('/api/v1/automation-flows', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify(body),
  })
}

export async function updateAutomationFlow(
  id: string,
  token: string,
  body: Partial<{ name: string; description: string; trigger: string; graph: object }>,
): Promise<AutomationFlowDetail> {
  return apiFetch(`/api/v1/automation-flows/${id}`, {
    method:  'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify(body),
  })
}

export async function deleteAutomationFlow(id: string, token: string): Promise<void> {
  return apiFetch(`/api/v1/automation-flows/${id}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function activateAutomationFlow(id: string, token: string): Promise<AutomationFlow> {
  return apiFetch(`/api/v1/automation-flows/${id}/activate`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function pauseAutomationFlow(id: string, token: string): Promise<AutomationFlow> {
  return apiFetch(`/api/v1/automation-flows/${id}/pause`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function runAutomationFlow(
  id: string,
  token: string,
): Promise<{ runId: string; log: FlowRun['log'] }> {
  return apiFetch(`/api/v1/automation-flows/${id}/run`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function getFlowRuns(id: string, token: string): Promise<FlowRun[]> {
  return apiFetch<FlowRun[]>(`/api/v1/automation-flows/${id}/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

// ── Funnel Templates ──────────────────────────────────────────────────────────

export interface FunnelTemplate {
  id:                   string
  industry:             string
  icon:                 string
  name:                 string
  description:          string
  estimatedConversion:  string
  questions:            number
  quizConfig:           Record<string, unknown>
}

export async function getFunnelTemplates(token: string): Promise<FunnelTemplate[]> {
  return apiFetch<FunnelTemplate[]>('/api/v1/funnels/templates', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function createFunnelFromTemplate(
  token: string,
  templateId: string,
  name?: string,
): Promise<{ id: string; name: string; slug: string }> {
  return apiFetch('/api/v1/funnels/from-template', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ templateId, name }),
  })
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKeyRecord {
  id:          string
  name:        string
  keyPrefix:   string
  scopes:      string[]
  isActive:    boolean
  lastUsedAt:  string | null
  expiresAt:   string | null
  createdAt:   string
}

export interface CreatedApiKey {
  id:        string
  name:      string
  key:       string   // raw key shown once
  prefix:    string
  scopes:    string[]
  createdAt: string
}

export async function getApiKeys(token: string): Promise<ApiKeyRecord[]> {
  return apiFetch<ApiKeyRecord[]>('/api/v1/api-keys', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function createApiKey(
  token: string,
  name: string,
  scopes?: string[],
): Promise<CreatedApiKey> {
  return apiFetch('/api/v1/api-keys', {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ name, scopes }),
  })
}

export async function revokeApiKey(id: string, token: string): Promise<{ revoked: boolean }> {
  return apiFetch(`/api/v1/api-keys/${id}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

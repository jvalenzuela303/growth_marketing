import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '../../queue/inject-queue.decorator';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CaptureWebhookDto } from './dto/capture-webhook.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import type { QuizSubmission } from '@growth-engine/shared-types';
import { getSegmentFromScore } from '@growth-engine/shared-types';
import { RealtimeService } from '../realtime/realtime.service';

interface LeadsFilter {
  segment?: string;
  pipelineStage?: string;
  minScore?: number;
  maxScore?: number;
  source?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('scoring') private readonly scoringQueue: Queue,
    @InjectQueue('messaging') private readonly messagingQueue: Queue,
    @Optional() private readonly realtime?: RealtimeService,
  ) {}

  /**
   * Captura lead desde webhook externo (Meta Ads, n8n, Zapier).
   * Idempotente por externalId: si ya existe, retorna el lead existente.
   */
  async captureFromWebhook(dto: CaptureWebhookDto) {
    // Idempotencia: verificar por externalId en tags
    if (dto.externalId) {
      const existing = await this.prisma.withTenant(dto.tenantId, () =>
        this.prisma.lead.findFirst({
          where: {
            tenantId: dto.tenantId,
            tags: { has: `ext:${dto.externalId}` },
            deletedAt: null,
          },
        }),
      );
      if (existing) {
        this.logger.debug(`Lead duplicado ignorado: externalId=${dto.externalId}`);
        return existing;
      }
    }

    const lead = await this.prisma.withTenant(dto.tenantId, () =>
      this.prisma.lead.create({
        data: {
          tenantId: dto.tenantId,
          funnelId: dto.funnelId,
          email: dto.email,
          phone: dto.phone,
          firstName: dto.firstName,
          lastName: dto.lastName,
          company: dto.company,
          source: dto.source || 'meta_ads',
          utmSource: dto.utmSource,
          utmMedium: dto.utmMedium,
          utmCampaign: dto.utmCampaign,
          metaFbclid: dto.metaData?.fbclid,
          metaFbp: dto.metaData?.fbp,
          metaFbc: dto.metaData?.fbc,
          quizAnswers: (dto.quizAnswers as any) || {},
          tags: dto.externalId ? [`ext:${dto.externalId}`] : [],
        },
      }),
    );

    await this.enqueueForScoring(lead.id, lead.tenantId, lead.funnelId);
    this.logger.log(`Lead capturado via webhook: ${lead.id} (tenant: ${dto.tenantId})`);
    return lead;
  }

  /**
   * Captura lead desde submission de quiz (flujo principal del producto).
   * Este método es el más crítico del sistema.
   */
  async captureFromQuiz(submission: QuizSubmission, tenantId: string, ipAddress?: string) {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.create({
        data: {
          tenantId,
          funnelId: submission.funnelId,
          email: submission.leadData.email,
          phone: submission.leadData.phone,
          firstName: submission.leadData.firstName,
          lastName: submission.leadData.lastName,
          company: submission.leadData.company,
          source: submission.metadata?.utmSource ? 'meta_ads' : 'organic',
          utmSource: submission.metadata?.utmSource,
          utmMedium: submission.metadata?.utmMedium,
          utmCampaign: submission.metadata?.utmCampaign,
          metaFbclid: submission.metadata?.fbclid,
          ipAddress,
          userAgent: submission.metadata?.userAgent,
          quizAnswers: submission.answers as any,
          quizCompletionPercentage: submission.completionPercentage,
          quizCompletedAt: new Date(),
        },
      }),
    );

    // Registrar evento de quiz_complete
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.create({
        data: {
          tenantId,
          leadId: lead.id,
          funnelId: submission.funnelId,
          eventType: 'quiz_complete',
          eventData: {
            completionPercentage: submission.completionPercentage,
            sessionId: submission.sessionId,
            answersCount: submission.answers.length,
          },
          sessionId: submission.sessionId,
          ipAddress,
          userAgent: submission.metadata?.userAgent,
        },
      }),
    );

    await this.enqueueForScoring(lead.id, tenantId, lead.funnelId);
    this.logger.log(`Lead capturado via quiz: ${lead.id} (tenant: ${tenantId})`);
    return lead;
  }

  async findAll(tenantId: string, filters: LeadsFilter) {
    const { segment, pipelineStage, source, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    return this.prisma.withTenant(tenantId, async () => {
      const where: any = {
        tenantId,
        deletedAt: null,
        ...(segment && { segment }),
        ...(pipelineStage && { pipelineStage }),
        ...(source && { source }),
      };

      const [leads, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            company: true,
            segment: true,
            quizScore: true,
            behaviorScore: true,
            engagementScore: true,
            demographicScore: true,
            pipelineStage: true,
            source: true,
            createdAt: true,
            lastSeenAt: true,
            assignedTo: true,
            tags: true,
          },
        }),
        this.prisma.lead.count({ where }),
      ]);

      return {
        data: leads.map((l) => ({
          ...l,
          totalScore: l.quizScore + l.behaviorScore + l.engagementScore + l.demographicScore,
        })),
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    });
  }

  async findOne(tenantId: string, leadId: string) {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        include: {
          conversations: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          events: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      }),
    );

    if (!lead) {
      throw new NotFoundException('Lead no encontrado.');
    }
    return lead;
  }

  async update(tenantId: string, leadId: string, dto: UpdateLeadDto) {
    await this.findOne(tenantId, leadId); // verifica existencia y tenant

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          ...(dto.pipelineStage && { pipelineStage: dto.pipelineStage }),
          ...(dto.assignedTo !== undefined && { assignedTo: dto.assignedTo }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.tags && { tags: dto.tags }),
        },
      }),
    );
  }

  /**
   * Calcula y persiste el score del lead usando los componentes almacenados.
   * El AI Engine llena quizScore/behaviorScore desde scoring.processor.ts;
   * este método recalcula el total y reasigna el segmento.
   */
  async calculateAndUpdateScore(
    tenantId: string,
    leadId: string,
    scores: {
      quizScore: number;
      behaviorScore: number;
      engagementScore: number;
      demographicScore: number;
    },
    classification?: {
      segment: string;
      pathology?: string;
      pathologyConfidence?: number;
      classifiedModel?: string;
    },
  ) {
    const totalScore =
      scores.quizScore + scores.behaviorScore + scores.engagementScore + scores.demographicScore;

    const segment = classification?.segment || getSegmentFromScore(totalScore);

    const updated = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          quizScore: scores.quizScore,
          behaviorScore: scores.behaviorScore,
          engagementScore: scores.engagementScore,
          demographicScore: scores.demographicScore,
          segment,
          pathology: classification?.pathology,
          pathologyConfidence: classification?.pathologyConfidence
            ? parseFloat(classification.pathologyConfidence.toFixed(3))
            : undefined,
          classifiedAt: new Date(),
          classifiedModel: classification?.classifiedModel,
          scoreUpdatedAt: new Date(),
        },
      }),
    );

    // Registrar evento de scoring
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.create({
        data: {
          tenantId,
          leadId,
          eventType: 'score_calculated',
          eventData: { ...scores, totalScore, segment },
        },
      }),
    );

    // Emitir evento WS de score actualizado
    this.realtime?.notifyLeadScored(tenantId, { leadId, score: totalScore, segment });

    // Si es lead "fuego" (>= 80), encolar alerta inmediata + WS hot alert
    if (totalScore >= 80) {
      await this.messagingQueue.add(
        'hot-lead-alert',
        { leadId, tenantId, totalScore, segment },
        { priority: 1 }, // prioridad crítica
      );
      const leadData = await this.prisma.withTenant(tenantId, () =>
        this.prisma.lead.findFirst({
          where: { id: leadId },
          select: { firstName: true, lastName: true, email: true },
        }),
      );
      const name = leadData
        ? `${leadData.firstName ?? ''} ${leadData.lastName ?? ''}`.trim() || (leadData.email ?? leadId)
        : leadId;
      this.realtime?.notifyHotAlert(tenantId, { leadId, name, score: totalScore });
    }

    return updated;
  }

  async updatePipelineStage(tenantId: string, leadId: string, newStage: string) {
    const lead = await this.findOne(tenantId, leadId);

    if (lead.pipelineStage === newStage) return lead;

    const updated = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.update({
        where: { id: leadId },
        data: { pipelineStage: newStage },
      }),
    );

    await this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.create({
        data: {
          tenantId,
          leadId,
          eventType: 'pipeline_stage_change',
          eventData: { from: lead.pipelineStage, to: newStage },
        },
      }),
    );

    this.realtime?.notifyStageChanged(tenantId, { leadId, stage: newStage });

    return updated;
  }

  async getScore(tenantId: string, leadId: string) {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: {
          quizScore: true,
          behaviorScore: true,
          engagementScore: true,
          demographicScore: true,
          segment: true,
          pathology: true,
          pathologyConfidence: true,
          classifiedAt: true,
          classifiedModel: true,
          scoreUpdatedAt: true,
        },
      }),
    );

    if (!lead) throw new NotFoundException('Lead no encontrado.');

    const totalScore =
      lead.quizScore + lead.behaviorScore + lead.engagementScore + lead.demographicScore;

    return { ...lead, totalScore };
  }

  // ─── helpers privados ────────────────────────────────────────────────────

  private async enqueueForScoring(leadId: string, tenantId: string, funnelId: string | null) {
    await this.scoringQueue.add(
      'lead.captured',
      { leadId, tenantId, funnelId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        priority: 2, // alta
      },
    );
  }

  // ── ML Prediction ─────────────────────────────────────────────────────────

  async getPrediction(tenantId: string, leadId: string) {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: {
          id: true,
          conversionProbability: true,
          conversionLabel: true,
          predictionUpdatedAt: true,
          quizScore: true,
          behaviorScore: true,
          engagementScore: true,
          demographicScore: true,
          segment: true,
        },
      }),
    );
    if (!lead) throw new NotFoundException('Lead no encontrado.');
    const totalScore =
      lead.quizScore + lead.behaviorScore + lead.engagementScore + lead.demographicScore;
    return {
      leadId: lead.id,
      conversionProbability: lead.conversionProbability
        ? Number(lead.conversionProbability)
        : null,
      conversionLabel: lead.conversionLabel ?? null,
      predictionUpdatedAt: lead.predictionUpdatedAt ?? null,
      totalScore,
      segment: lead.segment,
    };
  }

  // ── Lead Intelligence Report ──────────────────────────────────────────────

  /**
   * Generates a print-optimized HTML report for a single lead.
   * The frontend opens it in a new tab; the user can Ctrl+P → Save as PDF.
   */
  async generateReport(tenantId: string, leadId: string): Promise<string> {
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        include: {
          deals:         { orderBy: { closedAt: 'desc' }, take: 10 },
          conversations: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10, select: { role: true, content: true, channel: true, createdAt: true } },
        },
      }),
    );

    if (!lead) throw new NotFoundException('Lead no encontrado.');

    const name       = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Anónimo';
    const totalScore = lead.quizScore + lead.behaviorScore + lead.engagementScore + lead.demographicScore;
    const scoreColor = totalScore >= 80 ? '#059669' : totalScore >= 60 ? '#d97706' : totalScore >= 40 ? '#6366f1' : '#94a3b8';
    const segmentLabels: Record<string, string> = {
      fuego: '🔥 Fuego', caliente: '♨️ Caliente', tibio: '🌡️ Tibio',
      frio: '❄️ Frío', motor_detenido: '⛔ Motor Detenido', sin_clasificar: '— Sin clasificar',
    };
    const stageLabels: Record<string, string> = {
      nuevo: 'Nuevo', calificado: 'Calificado', propuesta: 'Propuesta',
      negociacion: 'Negociación', ganado: 'Ganado', perdido: 'Perdido',
    };
    const wonDeals    = lead.deals.filter((d) => d.stage === 'won');
    const totalRevenue = wonDeals.reduce((s, d) => s + Number(d.amount), 0);
    const answers     = lead.quizAnswers as Record<string, unknown>;
    const now         = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' });

    const scoreBar = (score: number, label: string, color: string) =>
      `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:12px;color:#475569">${label}</span>
          <span style="font-size:12px;font-weight:700;color:${color}">${score}</span>
        </div>
        <div style="background:#e2e8f0;border-radius:99px;height:6px">
          <div style="background:${color};width:${score}%;height:6px;border-radius:99px"></div>
        </div>
      </div>`;

    const answersHtml = Object.entries(answers).slice(0, 12).map(([k, v]) =>
      `<tr><td style="padding:6px 8px;font-size:12px;color:#64748b;border-bottom:1px solid #f1f5f9">${k}</td>
       <td style="padding:6px 8px;font-size:12px;font-weight:600;color:#1e293b;border-bottom:1px solid #f1f5f9">${JSON.stringify(v)}</td></tr>`
    ).join('');

    const dealsHtml = lead.deals.map((d) =>
      `<tr>
        <td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f1f5f9">${d.campaignName ?? '—'}</td>
        <td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f1f5f9">${Number(d.amount).toLocaleString('es-CL')}</td>
        <td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f1f5f9;color:${d.stage === 'won' ? '#059669' : '#94a3b8'}">${d.stage}</td>
        <td style="padding:6px 8px;font-size:12px;border-bottom:1px solid #f1f5f9">${d.closedAt ? new Date(d.closedAt).toLocaleDateString('es-CL') : '—'}</td>
      </tr>`
    ).join('');

    const convsHtml = lead.conversations.slice(0, 6).map((c) =>
      `<div style="margin-bottom:8px;padding:8px;background:${c.role === 'assistant' ? '#f8fafc' : '#eff6ff'};border-radius:8px;border-left:3px solid ${c.role === 'assistant' ? '#6366f1' : '#3b82f6'}">
        <div style="font-size:10px;color:#94a3b8;margin-bottom:3px">${c.role.toUpperCase()} · ${c.channel} · ${new Date(c.createdAt).toLocaleDateString('es-CL')}</div>
        <div style="font-size:12px;color:#1e293b">${c.content.slice(0, 200)}${c.content.length > 200 ? '…' : ''}</div>
      </div>`
    ).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Reporte de Lead — ${name}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #1e293b; background: #fff; }
    .page { max-width: 800px; margin: 0 auto; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
    .logo { font-weight: 900; font-size: 18px; color: #6366f1; letter-spacing: -0.5px; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { background: #f8fafc; border-radius: 12px; padding: 14px; }
    .card-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .card-value { font-size: 16px; font-weight: 800; color: #1e293b; }
    .card-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; padding: 6px 8px; background: #f8fafc; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; }
    @media print {
      @page { margin: 1.5cm; }
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo">⚡ Growth Engine</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px">Lead Intelligence Report</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:900;color:#1e293b">${name}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px">Generado: ${now}</div>
      </div>
    </div>

    <!-- Contact & Classification -->
    <div class="section">
      <div class="section-title">Información del Lead</div>
      <div class="grid-2">
        <div class="card">
          <div class="card-label">Contacto</div>
          <div class="card-value" style="font-size:14px">${name}</div>
          <div class="card-sub">${lead.email ?? '—'}</div>
          <div class="card-sub">${lead.phone ?? '—'}</div>
          ${lead.company ? `<div class="card-sub">${lead.company}</div>` : ''}
        </div>
        <div class="card">
          <div class="card-label">Clasificación</div>
          <div class="card-value" style="color:${scoreColor}">${totalScore} pts</div>
          <div class="card-sub">${segmentLabels[lead.segment] ?? lead.segment}</div>
          <div class="card-sub">Pipeline: ${stageLabels[lead.pipelineStage] ?? lead.pipelineStage}</div>
          ${lead.pathology ? `<div class="card-sub">Patología: ${lead.pathology}</div>` : ''}
        </div>
        <div class="card">
          <div class="card-label">Origen</div>
          <div class="card-value" style="font-size:13px">${lead.source}</div>
          ${lead.utmCampaign ? `<div class="card-sub">Campaña: ${lead.utmCampaign}</div>` : ''}
          ${lead.utmSource ? `<div class="card-sub">Fuente: ${lead.utmSource}</div>` : ''}
          ${lead.utmMedium ? `<div class="card-sub">Medio: ${lead.utmMedium}</div>` : ''}
        </div>
        <div class="card">
          <div class="card-label">Revenue generado</div>
          <div class="card-value" style="color:#059669">$${totalRevenue.toLocaleString('es-CL')}</div>
          <div class="card-sub">${wonDeals.length} deal${wonDeals.length !== 1 ? 's' : ''} ganado${wonDeals.length !== 1 ? 's' : ''}</div>
          <div class="card-sub">Creado: ${lead.createdAt.toLocaleDateString('es-CL')}</div>
        </div>
      </div>
    </div>

    <!-- Score breakdown -->
    <div class="section">
      <div class="section-title">Desglose de Score</div>
      ${scoreBar(lead.quizScore,        'Quiz (40%)',          '#6366f1')}
      ${scoreBar(lead.behaviorScore,    'Comportamiento (30%)', '#3b82f6')}
      ${scoreBar(lead.engagementScore,  'Engagement (20%)',    '#10b981')}
      ${scoreBar(lead.demographicScore, 'Demográfico (10%)',   '#f59e0b')}
    </div>

    ${Object.keys(answers).length > 0 ? `
    <!-- Quiz answers -->
    <div class="section">
      <div class="section-title">Respuestas del Quiz</div>
      <table>
        <thead><tr><th>Pregunta</th><th>Respuesta</th></tr></thead>
        <tbody>${answersHtml}</tbody>
      </table>
    </div>` : ''}

    ${lead.deals.length > 0 ? `
    <!-- Deals -->
    <div class="section">
      <div class="section-title">Historial de Deals</div>
      <table>
        <thead><tr><th>Campaña</th><th>Monto (CLP)</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${dealsHtml}</tbody>
      </table>
    </div>` : ''}

    ${lead.conversations.length > 0 ? `
    <!-- Conversations -->
    <div class="section">
      <div class="section-title">Últimas Conversaciones</div>
      ${convsHtml}
    </div>` : ''}

    ${lead.aiMemory ? `
    <!-- AI Memory -->
    <div class="section">
      <div class="section-title">Resumen IA del Lead</div>
      <div style="background:#f0f4ff;border-radius:12px;padding:14px;font-size:12px;color:#3730a3;line-height:1.6">
        ${lead.aiMemory.replace(/\n/g, '<br/>')}
      </div>
    </div>` : ''}

    <div class="footer">
      <div>Growth Engine — Lead Intelligence Report</div>
      <div>Lead ID: ${lead.id}</div>
    </div>
  </div>
</body>
</html>`;
  }

  // ── CSV export ────────────────────────────────────────────────────────────

  async exportCsv(tenantId: string, filters: Omit<LeadsFilter, 'page' | 'limit'>) {
    const leads = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(filters.segment       && { segment: filters.segment }),
          ...(filters.pipelineStage && { pipelineStage: filters.pipelineStage }),
          ...(filters.source        && { source: filters.source }),
        },
        orderBy: { createdAt: 'desc' },
        take: 10000,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          company: true,
          segment: true,
          pipelineStage: true,
          source: true,
          quizScore: true,
          behaviorScore: true,
          engagementScore: true,
          demographicScore: true,
          utmSource: true,
          utmMedium: true,
          utmCampaign: true,
          createdAt: true,
          lastSeenAt: true,
        },
      }),
    );

    const rows = leads.map((l) => ({
      id:              l.id,
      email:           l.email ?? '',
      phone:           l.phone ?? '',
      firstName:       l.firstName ?? '',
      lastName:        l.lastName ?? '',
      company:         l.company ?? '',
      segment:         l.segment ?? '',
      pipelineStage:   l.pipelineStage ?? '',
      source:          l.source ?? '',
      totalScore:      l.quizScore + l.behaviorScore + l.engagementScore + l.demographicScore,
      quizScore:       l.quizScore,
      behaviorScore:   l.behaviorScore,
      engagementScore: l.engagementScore,
      demographicScore: l.demographicScore,
      utmSource:       l.utmSource ?? '',
      utmMedium:       l.utmMedium ?? '',
      utmCampaign:     l.utmCampaign ?? '',
      createdAt:       l.createdAt.toISOString(),
      lastSeenAt:      l.lastSeenAt?.toISOString() ?? '',
    }));

    return this.toCsv(rows);
  }

  private toCsv(rows: Record<string, string | number>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines   = [
      headers.join(','),
      ...rows.map((r) =>
        headers.map((h) => {
          const val = String(r[h] ?? '').replace(/"/g, '""');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val}"`
            : val;
        }).join(','),
      ),
    ];
    return lines.join('\r\n');
  }
}

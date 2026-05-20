import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { LeadsService } from '../modules/leads/leads.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { getSegmentFromScore } from '@growth-engine/shared-types';

interface LeadCapturedJobData {
  leadId: string;
  tenantId: string;
  funnelId: string | null;
}

interface AiEngineScoreResponse {
  quiz_score: number;
  behavior_score: number;
  engagement_score: number;
  demographic_score: number;
  total_score: number;
  segment: string;
  pathology?: string;
  pathology_confidence?: number;
  model: string;
  recommendations?: string[];
}

interface PredictResponse {
  lead_id: string;
  conversion_probability: number;
  label: string;
  top_factors: string[];
  interpretation: string;
}

/**
 * Worker BullMQ para la cola "scoring".
 *
 * Flujo:
 * 1. Recibe job "lead.captured" con leadId + tenantId
 * 2. Carga quiz_answers y behavior_data del lead desde DB
 * 3. Llama al AI Engine (POST /score) con los datos
 * 4. Actualiza el lead con los scores y segmento resultante
 * 5. Si totalScore >= 80, LeadsService encolará hot-lead-alert en messaging queue
 *
 * Retry: 3 intentos con backoff exponencial (2s, 4s, 8s).
 * En caso de fallo del AI Engine, calcula score básico local como fallback.
 */
@Injectable()
export class ScoringProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScoringProcessor.name);
  private worker: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly leadsService: LeadsService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.worker = new Worker<LeadCapturedJobData>(
      'scoring',
      async (job: Job<LeadCapturedJobData>) => this.process(job),
      {
        connection: {
          host: this.config.get<string>('REDIS_HOST', 'localhost'),
          port: this.config.get<number>('REDIS_PORT', 6379),
          password: this.config.get<string>('REDIS_PASSWORD'),
          db: this.config.get<number>('REDIS_DB', 0),
        },
        concurrency: Number(this.config.get('SCORING_WORKER_CONCURRENCY', 5)),
      },
    );

    this.worker.on('completed', (job) =>
      this.logger.debug(`Job scoring completado: ${job.id} (lead: ${job.data.leadId})`),
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job scoring fallido: ${job?.id} — ${err.message}`),
    );

    this.logger.log('ScoringProcessor iniciado.');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async process(job: Job<LeadCapturedJobData>): Promise<void> {
    const { leadId, tenantId } = job.data;

    // 1. Cargar datos del lead desde DB
    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: {
          id: true,
          quizAnswers: true,
          behaviorData: true,
          funnelId: true,
          source: true,
          utmCampaign: true,
          quizCompletionPercentage: true,
        },
      }),
    );

    if (!lead) {
      this.logger.warn(`Lead no encontrado para scoring: ${leadId}`);
      return;
    }

    // 2. Llamar al AI Engine
    let scoreResult: AiEngineScoreResponse;
    const aiEngineUrl = this.config.get<string>('AI_ENGINE_URL', 'http://localhost:8000');

    try {
      const response = await axios.post<AiEngineScoreResponse>(
        `${aiEngineUrl}/score`,
        {
          lead_id: leadId,
          tenant_id: tenantId,
          quiz_answers: lead.quizAnswers,
          behavior_data: lead.behaviorData,
          metadata: {
            source: lead.source,
            utm_campaign: lead.utmCampaign,
            completion_percentage: lead.quizCompletionPercentage,
          },
        },
        {
          timeout: 30000, // 30s — el AI Engine puede tardar con LLMs
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Secret': this.config.get<string>('INTERNAL_API_SECRET', ''),
          },
        },
      );
      scoreResult = response.data;
      this.logger.debug(
        `AI Engine respondió para ${leadId}: score=${scoreResult.total_score}, segment=${scoreResult.segment}`,
      );
    } catch (error: any) {
      // Fallback: calcular score básico localmente si el AI Engine falla
      this.logger.warn(
        `AI Engine no disponible para ${leadId}: ${error.message}. Usando scoring fallback.`,
      );
      scoreResult = this.calculateFallbackScore(lead);
    }

    // 3. Persistir scores y clasificación en DB
    await this.leadsService.calculateAndUpdateScore(
      tenantId,
      leadId,
      {
        quizScore: Math.min(scoreResult.quiz_score, 40),
        behaviorScore: Math.min(scoreResult.behavior_score, 30),
        engagementScore: Math.min(scoreResult.engagement_score, 20),
        demographicScore: Math.min(scoreResult.demographic_score, 10),
      },
      {
        segment: scoreResult.segment,
        pathology: scoreResult.pathology,
        pathologyConfidence: scoreResult.pathology_confidence,
        classifiedModel: scoreResult.model,
      },
    );

    // 4. Llamar a /predict para obtener la probabilidad de conversión
    try {
      const behaviorData = (lead.behaviorData as any) || {};
      const predictRes = await axios.post<PredictResponse>(
        `${aiEngineUrl}/predict`,
        {
          lead_id:               leadId,
          total_score:           scoreResult.total_score,
          quiz_score:            scoreResult.quiz_score,
          behavior_score:        scoreResult.behavior_score,
          engagement_score:      scoreResult.engagement_score,
          demographic_score:     scoreResult.demographic_score,
          visits:                behaviorData.visits ?? 0,
          asked_price:           behaviorData.asked_price_question ?? false,
          requested_demo:        behaviorData.requested_demo ?? false,
          conversation_rounds:   behaviorData.conversation_rounds ?? 0,
        },
        { timeout: 10000 },
      );

      await this.prisma.withTenant(tenantId, () =>
        this.prisma.lead.update({
          where: { id: leadId },
          data: {
            conversionProbability: predictRes.data.conversion_probability,
            conversionLabel:       predictRes.data.label,
            predictionUpdatedAt:   new Date(),
          },
        }),
      );

      this.logger.debug(
        `Predicción guardada para ${leadId}: prob=${predictRes.data.conversion_probability}, label=${predictRes.data.label}`,
      );
    } catch (err: any) {
      this.logger.warn(`Predicción fallida para ${leadId}: ${err.message}`);
    }

    // 5. Push notification si lead caliente (score >= 80)
    if (scoreResult.total_score >= 80) {
      const leadRecord = await this.prisma.withTenant(tenantId, () =>
        this.prisma.lead.findUnique({
          where:  { id: leadId },
          select: { id: true, firstName: true, lastName: true, phone: true },
        }),
      );
      if (leadRecord) {
        const fullName = [leadRecord.firstName, leadRecord.lastName].filter(Boolean).join(' ') || 'Lead';
        this.notifications.notifyHotLead(tenantId, {
          id:    leadRecord.id,
          name:  fullName,
          score: scoreResult.total_score,
          phone: leadRecord.phone,
        }).catch(() => {});
      }
    }
  }

  /**
   * Scoring fallback cuando el AI Engine no está disponible.
   * Usa puntuación proporcional basada en completion percentage del quiz.
   */
  private calculateFallbackScore(lead: any): AiEngineScoreResponse {
    const completionPct = lead.quizCompletionPercentage || 0;
    const quizScore = Math.floor((completionPct / 100) * 40);
    const behaviorData = lead.behaviorData as any || {};
    const behaviorScore = Math.min(
      (behaviorData.visits || 0) * 3 +
      (behaviorData.pricing_page_clicks || 0) * 5 +
      Math.min((behaviorData.total_time_seconds || 0) / 30, 10),
      30,
    );
    const totalScore = quizScore + behaviorScore;
    const segment = getSegmentFromScore(totalScore);

    return {
      quiz_score: quizScore,
      behavior_score: behaviorScore,
      engagement_score: 0,
      demographic_score: 0,
      total_score: totalScore,
      segment,
      model: 'fallback-v1',
    };
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { LeadsService } from '../leads/leads.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import type { QuizConfig } from '@growth-engine/shared-types';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Devuelve la configuración pública del quiz para el frontend.
   * No incluye scoring_rules ni configuraciones internas del tenant.
   */
  async getPublicQuizConfig(tenantSlug: string, funnelSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, isActive: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Funnel no encontrado.');
    }

    // Los funnels públicos no necesitan RLS porque se acceden por slug sin auth
    const funnel = await this.prisma.funnel.findFirst({
      where: {
        tenantId: tenant.id,
        slug: funnelSlug,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        description: true,
        quizConfig: true,
        landingConfig: true,
        resultsConfig: true,
        status: true,
      },
    });

    if (!funnel) {
      throw new NotFoundException('Funnel no encontrado o no está activo.');
    }

    // Registrar page_view event (fire-and-forget)
    this.prisma.leadEvent.create({
      data: {
        tenantId: tenant.id,
        funnelId: funnel.id,
        eventType: 'page_view',
        eventData: { source: 'quiz_public' },
      },
    }).catch((err) => this.logger.warn(`No se pudo registrar page_view: ${err.message}`));

    return {
      funnelId: funnel.id,
      tenantSlug,
      name: funnel.name,
      description: funnel.description,
      quizConfig: funnel.quizConfig as unknown as QuizConfig,
      landingConfig: funnel.landingConfig,
      resultsConfig: funnel.resultsConfig,
    };
  }

  /**
   * Procesa el submit del quiz.
   * Flujo: validar → crear lead → encolar scoring → devolver resultado inmediato.
   *
   * El score final llega de forma asíncrona via BullMQ (scoring.processor).
   * El frontend puede sondear GET /leads/:id/score o usar WebSocket (futuro).
   */
  async submitQuiz(
    tenantSlug: string,
    funnelSlug: string,
    dto: SubmitQuizDto,
    ipAddress?: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, isActive: true, maxLeadsPerMonth: true },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant no encontrado.');
    }

    const funnel = await this.prisma.funnel.findFirst({
      where: { tenantId: tenant.id, slug: funnelSlug, status: 'active' },
      select: { id: true, quizConfig: true },
    });

    if (!funnel) {
      throw new NotFoundException('Funnel no encontrado o no está activo.');
    }

    // Verificar límite mensual de leads del plan
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const leadsThisMonth = await this.prisma.lead.count({
      where: {
        tenantId: tenant.id,
        createdAt: { gte: startOfMonth },
        deletedAt: null,
      },
    });

    if (leadsThisMonth >= tenant.maxLeadsPerMonth) {
      throw new BadRequestException('El límite mensual de leads ha sido alcanzado.');
    }

    const lead = await this.leadsService.captureFromQuiz(
      {
        funnelId: funnel.id,
        tenantSlug,
        answers: dto.answers,
        leadData: dto.leadData,
        completionPercentage: dto.completionPercentage,
        sessionId: dto.sessionId,
        metadata: dto.metadata,
      },
      tenant.id,
      ipAddress,
    );

    // Actualizar contador de completions del funnel (fire-and-forget)
    this.prisma.funnel.update({
      where: { id: funnel.id },
      data: { totalCompletions: { increment: 1 } },
    }).catch((err) => this.logger.warn(`No se pudo incrementar totalCompletions: ${err.message}`));

    return {
      leadId: lead.id,
      status: 'processing',
      message: 'Tus resultados están siendo calculados.',
    };
  }

  /**
   * Returns the public scoring result for a given lead.
   * No tenant check — the lead ID is opaque (UUID) and the response
   * contains only segment metadata + public result content (no PII).
   * Used by the quiz results page to poll until async scoring finishes.
   */
  async getPublicResult(leadId: string): Promise<{
    segment: string | null;
    totalScore: number | null;
    status: 'processing' | 'ready';
    resultConfig: Record<string, unknown> | null;
  }> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        segment: true,
        quizScore: true,
        behaviorScore: true,
        engagementScore: true,
        demographicScore: true,
        funnelId: true,
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead no encontrado.');
    }

    // Scoring is asynchronous — segment is null until the worker finishes
    if (lead.segment === null) {
      return {
        segment: null,
        totalScore: null,
        status: 'processing',
        resultConfig: null,
      };
    }

    // Fetch the funnel's resultsConfig to return the segment-specific content
    const funnel = await this.prisma.funnel.findUnique({
      where: { id: lead.funnelId },
      select: { resultsConfig: true },
    });

    const resultsConfig =
      funnel?.resultsConfig as Record<string, unknown> | null ?? null;

    // resultsConfig is expected to be a map of segment -> config object
    // e.g. { "hot": { title: "...", cta: "..." }, "cold": { ... } }
    let segmentConfig: Record<string, unknown> | null = null;
    if (resultsConfig && typeof resultsConfig === 'object') {
      const entry = (resultsConfig as Record<string, unknown>)[lead.segment];
      segmentConfig = entry && typeof entry === 'object'
        ? (entry as Record<string, unknown>)
        : null;
    }

    const totalScore =
      lead.quizScore + lead.behaviorScore + lead.engagementScore + lead.demographicScore;

    return {
      segment: lead.segment,
      totalScore,
      status: 'ready',
      resultConfig: segmentConfig,
    };
  }
}

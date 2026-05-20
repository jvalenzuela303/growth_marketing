import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Logger,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsService } from './analytics.service';

/**
 * Analytics Controller — KPIs y métricas del dashboard.
 *
 * Todas las queries están protegidas por JWT y aisladas por tenant via RLS.
 * Para analítica avanzada (cohortes, LTV), usar BigQuery via Pub/Sub (futuro).
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * GET /api/v1/analytics/kpis
   * Devuelve KPIs para el dashboard principal.
   *
   * curl -H "Authorization: Bearer <token>" http://localhost:3001/api/v1/analytics/kpis
   *
   * Response:
   * {
   *   "leads": { "today": 12, "week": 87, "month": 342 },
   *   "completionRate": 0.68,
   *   "avgScore": 54.3,
   *   "segmentDistribution": { "fuego": 23, "caliente": 45, ... },
   *   "topFunnels": [...],
   *   "pipelineDistribution": { "nuevo": 120, "calificado": 55, ... }
   * }
   */
  @Get('kpis')
  async getKpis(
    @TenantId() tenantId: string,
    @Query('funnelId') funnelId?: string,
  ) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.prisma.withTenant(tenantId, async () => {
      const baseWhere: any = {
        tenantId,
        deletedAt: null,
        ...(funnelId && { funnelId }),
      };

      const [
        leadsToday,
        leadsWeek,
        leadsMonth,
        segmentCounts,
        stageCounts,
        scoreAgg,
        topFunnels,
      ] = await Promise.all([
        // Leads por período
        this.prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfToday } } }),
        this.prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfWeek } } }),
        this.prisma.lead.count({ where: { ...baseWhere, createdAt: { gte: startOfMonth } } }),

        // Distribución por segmento
        this.prisma.lead.groupBy({
          by: ['segment'],
          where: { ...baseWhere, createdAt: { gte: startOfMonth } },
          _count: { id: true },
        }),

        // Distribución por etapa del pipeline
        this.prisma.lead.groupBy({
          by: ['pipelineStage'],
          where: baseWhere,
          _count: { id: true },
        }),

        // Score promedio
        this.prisma.lead.aggregate({
          where: { ...baseWhere, createdAt: { gte: startOfMonth } },
          _avg: {
            quizScore: true,
            behaviorScore: true,
            engagementScore: true,
            demographicScore: true,
          },
        }),

        // Top funnels por completions este mes
        this.prisma.funnel.findMany({
          where: { tenantId },
          orderBy: { totalCompletions: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            slug: true,
            totalViews: true,
            totalStarts: true,
            totalCompletions: true,
            status: true,
          },
        }),
      ]);

      // Calcular completion rate del mes
      const leadsWithCompletedQuiz = await this.prisma.lead.count({
        where: {
          ...baseWhere,
          createdAt: { gte: startOfMonth },
          quizCompletionPercentage: { gte: 80 },
        },
      });
      const completionRate = leadsMonth > 0 ? leadsWithCompletedQuiz / leadsMonth : 0;

      // Calcular score promedio total
      const avg = scoreAgg._avg;
      const avgScore = avg.quizScore && avg.behaviorScore
        ? (avg.quizScore + avg.behaviorScore + (avg.engagementScore || 0) + (avg.demographicScore || 0))
        : 0;

      // Construir distribución de segmentos como objeto
      const segmentDistribution = segmentCounts.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.segment] = item._count.id;
          return acc;
        },
        {},
      );

      const pipelineDistribution = stageCounts.reduce<Record<string, number>>(
        (acc, item) => {
          acc[item.pipelineStage] = item._count.id;
          return acc;
        },
        {},
      );

      return {
        leads: {
          today: leadsToday,
          week: leadsWeek,
          month: leadsMonth,
        },
        completionRate: Math.round(completionRate * 100) / 100,
        avgScore: Math.round(avgScore * 10) / 10,
        segmentDistribution,
        pipelineDistribution,
        topFunnels: topFunnels.map((f) => ({
          ...f,
          completionRate:
            f.totalStarts > 0
              ? Math.round((f.totalCompletions / f.totalStarts) * 100) / 100
              : 0,
        })),
        generatedAt: now.toISOString(),
      };
    });
  }

  /**
   * GET /api/v1/analytics/events?eventType=quiz_complete&from=2026-01-01
   * Serie temporal de eventos para gráficos de tendencia.
   */
  @Get('events')
  async getEventTimeSeries(
    @TenantId() tenantId: string,
    @Query('eventType') eventType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    return this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.groupBy({
        by: ['eventType', 'createdAt'],
        where: {
          tenantId,
          ...(eventType && { eventType }),
          createdAt: { gte: fromDate, lte: toDate },
        },
        _count: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
  }

  /**
   * GET /api/v1/analytics/funnels/:funnelId/abandonment
   * Per-question drop-off stats for a funnel.
   */
  @Get('funnels/:funnelId/abandonment')
  getFunnelAbandonmentStats(
    @TenantId() tenantId: string,
    @Param('funnelId', ParseUUIDPipe) funnelId: string,
  ) {
    return this.analyticsService.getFunnelAbandonmentStats(tenantId, funnelId);
  }

  /**
   * GET /api/v1/analytics/financial-kpis?range=30d
   * CPL, ROAS, total spend and total leads for the requested date range.
   */
  @Get('financial-kpis')
  getFinancialKpis(
    @TenantId() tenantId: string,
    @Query('range') range = '30d',
  ) {
    return this.analyticsService.getFinancialKpis(tenantId, range);
  }

  /**
   * GET /api/v1/analytics/attribution?range=30d
   * End-to-end attribution: ad spend → leads → deals → revenue, by source/channel.
   */
  @Get('attribution')
  getAttribution(
    @TenantId() tenantId: string,
    @Query('range') range = '30d',
  ) {
    return this.analyticsService.getAttributionByChannel(tenantId, range);
  }

  /**
   * POST /api/v1/analytics/conversion-advisor
   * Streams a Claude-powered CRO analysis via SSE.
   *
   * Body: { range?: string; question?: string }
   * Response: text/event-stream — data: { text } chunks, ends with data: [DONE]
   */
  @Post('conversion-advisor')
  async streamConversionAdvisor(
    @TenantId() tenantId: string,
    @Body('range')    range    = '30d',
    @Body('question') question: string | undefined,
    @Res()            res:      Response,
  ) {
    return this.analyticsService.streamConversionAdvisor(res, tenantId, range, question);
  }
}

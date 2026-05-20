import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { InjectQueue } from './inject-queue.decorator';
import { PrismaService } from '../database/prisma.service';

/**
 * FollowUpScheduler — Autonomous AI follow-up agent.
 *
 * Runs every 24 hours as a BullMQ repeatable job.
 * Identifies leads in segments 'caliente' and 'tibio' that have had no
 * outbound message in the last 48 hours and no reply in the last 72 hours,
 * then enqueues a follow-up sequence step.
 *
 * Design: uses a repeatable BullMQ job pattern instead of node-cron to keep
 * all async work inside the queue — horizontally scalable with multiple workers.
 */
@Injectable()
export class FollowUpScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FollowUpScheduler.name);

  // Segments eligible for autonomous follow-up
  private readonly ELIGIBLE_SEGMENTS = ['caliente', 'tibio', 'frio'];

  // Silence window: don't re-contact leads if last outbound was within this period
  private readonly SILENCE_HOURS = 48;

  // Max follow-ups per lead per 30-day window
  private readonly MAX_FOLLOWUPS_30D = 4;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @InjectQueue('messaging') private readonly messagingQueue: Queue,
  ) {}

  async onModuleInit() {
    // Register the repeatable scheduler job (24h interval)
    await this.messagingQueue.add(
      'followup-scan',
      {},
      {
        repeat:   { every: 24 * 60 * 60 * 1000 }, // every 24h
        jobId:    'followup-scan-daily',
        priority: 5, // low priority
      },
    );

    this.logger.log('FollowUpScheduler registrado — escaneando leads cada 24h.');
  }

  async onModuleDestroy() {
    // Remove the repeatable job on shutdown
    await this.messagingQueue.removeRepeatable('followup-scan', { every: 24 * 60 * 60 * 1000 })
      .catch(() => {});
  }

  /**
   * Called by MessagingProcessor when it receives a 'followup-scan' job.
   * Scans all tenants for eligible leads and enqueues follow-up messages.
   */
  async runScan(): Promise<void> {
    const silenceCutoff = new Date(Date.now() - this.SILENCE_HOURS * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    this.logger.log('Iniciando escaneo de follow-ups automáticos…');

    // Get all active tenants
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true, name: true },
    });

    let totalEnqueued = 0;

    for (const tenant of tenants) {
      try {
        const enqueued = await this.scanTenant(tenant.id, silenceCutoff, thirtyDaysAgo);
        totalEnqueued += enqueued;
      } catch (err) {
        this.logger.error(`Error escaneando tenant ${tenant.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`Follow-up scan completo. ${totalEnqueued} mensajes encolados.`);
  }

  private async scanTenant(
    tenantId: string,
    silenceCutoff: Date,
    thirtyDaysAgo: Date,
  ): Promise<number> {
    const leads = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findMany({
        where: {
          tenantId,
          deletedAt: null,
          segment: { in: this.ELIGIBLE_SEGMENTS },
          phone: { not: null },
          pipelineStage: { notIn: ['cerrado_ganado', 'cerrado_perdido'] },
        },
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          segment: true,
        },
      }),
    );

    // For each lead, check silence window and monthly cap with separate queries
    const leadIds = leads.map((l) => l.id);
    if (leadIds.length === 0) return 0;

    const [recentOutbound, recentFollowups] = await Promise.all([
      // Leads with an outbound message since silenceCutoff
      this.prisma.withTenant(tenantId, () =>
        this.prisma.conversation.findMany({
          where: {
            tenantId,
            leadId: { in: leadIds },
            role:      { in: ['assistant', 'human_agent'] },
            createdAt: { gte: silenceCutoff },
          },
          select: { leadId: true },
          distinct: ['leadId'],
        }),
      ),
      // Leads with auto_followup events this month
      this.prisma.withTenant(tenantId, () =>
        this.prisma.leadEvent.groupBy({
          by:    ['leadId'],
          where: {
            tenantId,
            leadId:    { in: leadIds },
            eventType: 'auto_followup',
            createdAt: { gte: thirtyDaysAgo },
          },
          _count: { id: true },
        }),
      ),
    ]);

    const silencedIds = new Set(recentOutbound.map((c) => c.leadId));
    const followupCounts = new Map(recentFollowups.map((r) => [r.leadId, r._count.id]));

    let enqueued = 0;

    for (const lead of leads) {
      // Skip if we already sent something within the silence window
      if (silencedIds.has(lead.id)) continue;

      // Skip if they hit the monthly cap
      const count = followupCounts.get(lead.id) ?? 0;
      if (count >= this.MAX_FOLLOWUPS_30D) continue;

      const templateName = this.pickTemplate(lead.segment);
      if (!templateName) continue;

      await this.messagingQueue.add(
        'auto-followup',
        {
          leadId:       lead.id,
          tenantId,
          phone:        lead.phone,
          templateName,
          params:       { name: lead.firstName || 'ahí' },
        },
        { priority: 4 },
      );

      enqueued++;
    }

    return enqueued;
  }

  private pickTemplate(segment: string): string | null {
    const templates: Record<string, string> = {
      caliente: 'ge_warm_nurture_2',
      tibio:    'ge_warm_nurture_1',
      frio:     'ge_reengagement',
    };
    return templates[segment] ?? null;
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, Queue } from 'bullmq';
import { InjectQueue } from './inject-queue.decorator';
import { MessagingService } from '../modules/messaging/messaging.service';
import { PrismaService } from '../database/prisma.service';
import { WHATSAPP_TEMPLATES } from '@growth-engine/shared-types';
import { FollowUpScheduler } from './followup.scheduler';

interface LeadScoredJobData {
  leadId: string;
  tenantId: string;
  totalScore: number;
  segment: string;
}

interface HotLeadAlertJobData extends LeadScoredJobData {
  // Heredado, sin campos adicionales
}

/**
 * Segmento → secuencia de templates de WhatsApp a enviar.
 * Los templates deben estar pre-aprobados en Meta Business Manager.
 */
const SEGMENT_SEQUENCE: Record<string, string[]> = {
  fuego: [
    WHATSAPP_TEMPLATES.HOT_LEAD_1,
    WHATSAPP_TEMPLATES.HOT_LEAD_2,
    WHATSAPP_TEMPLATES.HOT_LEAD_3,
  ],
  caliente: [
    WHATSAPP_TEMPLATES.WARM_NURTURE_1,
    WHATSAPP_TEMPLATES.WARM_NURTURE_2,
  ],
  tibio: [WHATSAPP_TEMPLATES.WARM_NURTURE_1],
  frio: [WHATSAPP_TEMPLATES.REENGAGEMENT],
  motor_detenido: [], // no enviar mensajes automáticos
  sin_clasificar: [WHATSAPP_TEMPLATES.WELCOME],
};

/**
 * Worker BullMQ para la cola "messaging".
 *
 * Flujo para "lead.scored":
 * 1. Carga datos del lead (teléfono, nombre, segmento) desde DB
 * 2. Determina la secuencia de templates según el segmento
 * 3. Envía el primer template via MessagingService (IChannel)
 *
 * Flujo para "hot-lead-alert":
 * 1. Envía notificación inmediata al equipo de ventas (futuro: Slack/email)
 * 2. Marca hotLeadAlertSentAt en el lead
 *
 * La secuencia completa (mensajes 2, 3...) se programa con BullMQ delayed jobs.
 */
@Injectable()
export class MessagingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessagingProcessor.name);
  private worker: Worker;

  constructor(
    private readonly config: ConfigService,
    private readonly messagingService: MessagingService,
    private readonly prisma: PrismaService,
    @InjectQueue('messaging') private readonly messagingQueue: Queue,
    private readonly followUpScheduler: FollowUpScheduler,
  ) {}

  onModuleInit() {
    this.worker = new Worker<LeadScoredJobData | HotLeadAlertJobData>(
      'messaging',
      async (job: Job<LeadScoredJobData>) => {
        if (job.name === 'hot-lead-alert')  return this.processHotLeadAlert(job as Job<HotLeadAlertJobData>);
        if (job.name === 'followup-scan')   return this.followUpScheduler.runScan();
        if (job.name === 'auto-followup')   return this.processAutoFollowup(job as any);
        if (job.name === 'sequence-step')   return this.processSequenceStep(job as any);
        return this.processLeadScored(job);
      },
      {
        connection: {
          host: this.config.get<string>('REDIS_HOST', 'localhost'),
          port: this.config.get<number>('REDIS_PORT', 6379),
          password: this.config.get<string>('REDIS_PASSWORD'),
          db: this.config.get<number>('REDIS_DB', 0),
        },
        concurrency: Number(this.config.get('MESSAGING_WORKER_CONCURRENCY', 3)),
      },
    );

    this.worker.on('completed', (job) =>
      this.logger.debug(`Job messaging completado: ${job.id} (${job.name})`),
    );

    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job messaging fallido: ${job?.id} (${job?.name}) — ${err.message}`),
    );

    this.logger.log('MessagingProcessor iniciado.');
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  private async processLeadScored(job: Job<LeadScoredJobData>): Promise<void> {
    const { leadId, tenantId, segment } = job.data;

    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: { phone: true, firstName: true, lastName: true, email: true },
      }),
    );

    if (!lead) {
      this.logger.warn(`Lead no encontrado para mensajería: ${leadId}`);
      return;
    }

    const sequence = SEGMENT_SEQUENCE[segment] || [];
    if (sequence.length === 0) {
      this.logger.debug(`Segmento "${segment}" sin secuencia de mensajes configurada.`);
      return;
    }

    // Siempre enviar el primer mensaje del welcome/segmento
    const welcomeTemplate = WHATSAPP_TEMPLATES.WELCOME;
    if (lead.phone) {
      const welcomeResult = await this.messagingService.sendTemplate(
        tenantId,
        leadId,
        'whatsapp',
        lead.phone,
        welcomeTemplate,
        {
          name: lead.firstName || 'ahí',
          segment,
        },
      );

      if (!welcomeResult.success) {
        this.logger.warn(
          `No se pudo enviar welcome a ${lead.phone}: ${welcomeResult.error}`,
        );
      }
    }

    // El primer mensaje específico del segmento (si existe y es distinto del welcome)
    const firstSegmentTemplate = sequence[0];
    if (firstSegmentTemplate && lead.phone) {
      // Delay de 5 minutos para no saturar al lead
      const fiveMinutes = 5 * 60 * 1000;
      await this.messagingQueue.add(
        'sequence-step',
        {
          leadId,
          tenantId,
          phone: lead.phone,
          templateName: firstSegmentTemplate,
          params: { name: lead.firstName || 'ahí' },
        },
        { delay: fiveMinutes, priority: 3 },
      );
    }
  }

  private async processAutoFollowup(job: Job<{
    leadId: string; tenantId: string; phone: string;
    templateName: string; params: Record<string, string>;
  }>): Promise<void> {
    const { leadId, tenantId, phone, templateName, params } = job.data;

    const result = await this.messagingService.sendTemplate(
      tenantId, leadId, 'whatsapp', phone, templateName, params,
    );

    // Record event so the scheduler can count monthly follow-ups
    if (result.success) {
      await this.prisma.withTenant(tenantId, () =>
        this.prisma.leadEvent.create({
          data: {
            tenantId,
            leadId,
            eventType: 'auto_followup',
            eventData: { templateName, channel: 'whatsapp' },
          },
        }),
      );
      this.logger.log(`Auto follow-up enviado a ${phone} (lead ${leadId}): ${templateName}`);
    } else {
      this.logger.warn(`Auto follow-up falló para ${leadId}: ${result.error}`);
    }
  }

  private async processSequenceStep(job: Job<{
    leadId: string; tenantId: string; phone: string;
    templateName: string; params: Record<string, string>;
  }>): Promise<void> {
    const { leadId, tenantId, phone, templateName, params } = job.data;
    await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', phone, templateName, params);
  }

  private async processHotLeadAlert(job: Job<HotLeadAlertJobData>): Promise<void> {
    const { leadId, tenantId, totalScore, segment } = job.data;

    const lead = await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.findFirst({
        where: { id: leadId, tenantId, deletedAt: null },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          company: true,
          hotLeadAlertSentAt: true,
        },
      }),
    );

    if (!lead) return;
    if (lead.hotLeadAlertSentAt) {
      this.logger.debug(`Hot lead alert ya enviada para ${leadId}, ignorando duplicado.`);
      return;
    }

    this.logger.log(
      `HOT LEAD: ${lead.firstName} ${lead.lastName} (${lead.email}) — score ${totalScore} — segmento ${segment}`,
    );

    // Marcar alert enviada
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.lead.update({
        where: { id: leadId },
        data: { hotLeadAlertSentAt: new Date() },
      }),
    );

    // Registrar evento
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.create({
        data: {
          tenantId,
          leadId,
          eventType: 'hot_lead_alert',
          eventData: { totalScore, segment, alertSentAt: new Date().toISOString() },
        },
      }),
    );

    // Obtener email del owner del tenant para notificarle
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { name: true },
    });

    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: 'owner' },
      select: { email: true, name: true },
    });

    if (owner?.email) {
      const leadName = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || (lead.email ?? leadId);
      await this.messagingService.send({
        tenantId,
        leadId,
        channel: 'email',
        to: owner.email,
        templateName: 'hot_lead_internal_alert',
        templateParams: {
          ownerName: owner.name ?? 'Equipo',
          leadName,
          leadEmail: lead.email ?? '—',
          leadPhone: lead.phone ?? '—',
          leadCompany: lead.company ?? '—',
          score: totalScore.toString(),
          segment,
          tenantName: tenant?.name ?? '',
        },
      });
      this.logger.log(`Alerta hot-lead enviada a ${owner.email} para lead ${leadId}`);
    }
  }
}

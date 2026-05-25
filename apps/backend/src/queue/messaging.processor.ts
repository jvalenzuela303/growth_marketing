import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, Queue } from 'bullmq';
import { InjectQueue } from './inject-queue.decorator';
import { MessagingService } from '../modules/messaging/messaging.service';
import { PrismaService } from '../database/prisma.service';
import { WHATSAPP_TEMPLATES } from '@growth-engine/shared-types';
import { FollowUpScheduler } from './followup.scheduler';
import { AbandonedCartScanner } from './abandoned-cart.scanner';

// ── Job payload types ─────────────────────────────────────────────────────────

interface OnboardingStartJobData {
  leadId:    string;
  tenantId:  string;
  dealId:    string;
  amount:    number;
  currency:  string;
  phone?:    string;
  email?:    string;
  firstName?: string;
}

interface AppointmentReminderJobData {
  appointmentId: string;
  tenantId:      string;
  leadId:        string;
  phone?:        string;
  email?:        string;
  firstName?:    string;
  scheduledAt:   string;
  meetingUrl?:   string;
  reminderType:  '24h' | '2h';
}

interface PostConsultationJobData {
  appointmentId: string;
  tenantId:      string;
  leadId:        string;
  phone?:        string;
  email?:        string;
  firstName?:    string;
}

interface CartAbandonedJobData {
  cartId:    string;
  tenantId:  string;
  leadId?:   string;
  phone?:    string;
  email?:    string;
  firstName?: string;
  totalAmount: number;
  currency:   string;
  checkoutUrl?: string;
  itemNames:  string;   // comma-separated top 3 item names
  attemptNumber: number; // 1 = first alert, 2 = second alert
}

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
    private readonly cartScanner: AbandonedCartScanner,
  ) {}

  async onModuleInit() {
    this.worker = new Worker<LeadScoredJobData | HotLeadAlertJobData>(
      'messaging',
      async (job: Job<LeadScoredJobData>) => {
        if (job.name === 'hot-lead-alert')       return this.processHotLeadAlert(job as Job<HotLeadAlertJobData>);
        if (job.name === 'followup-scan')        return this.followUpScheduler.runScan();
        if (job.name === 'auto-followup')        return this.processAutoFollowup(job as any);
        if (job.name === 'sequence-step')        return this.processSequenceStep(job as any);
        if (job.name === 'onboarding-start')            return this.processOnboardingStart(job as unknown as Job<OnboardingStartJobData>);
        if (job.name === 'appointment-reminder')        return this.processAppointmentReminder(job as unknown as Job<AppointmentReminderJobData>);
        if (job.name === 'followup-post-consultation')  return this.processPostConsultation(job as unknown as Job<PostConsultationJobData>);
        if (job.name === 'cart-abandoned')              return this.processCartAbandoned(job as unknown as Job<CartAbandonedJobData>);
        if (job.name === 'abandoned-cart-scan')         return this.cartScanner.runScan();
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

    // Register abandoned cart scan — every 1 hour
    await this.messagingQueue.add(
      'abandoned-cart-scan',
      {},
      { repeat: { every: 60 * 60 * 1000 }, jobId: 'abandoned-cart-scan-hourly', priority: 5 },
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
    channel?: string;
  }>): Promise<void> {
    const { leadId, tenantId, phone, templateName, params, channel = 'whatsapp' } = job.data;
    await this.messagingService.sendTemplate(tenantId, leadId, channel as any, phone, templateName, params);
  }

  // ── Gap 2: Post-enrollment onboarding sequence ─────────────────────────────

  private async processOnboardingStart(job: Job<OnboardingStartJobData>): Promise<void> {
    const { leadId, tenantId, phone, email, firstName, amount, currency } = job.data;
    const name = firstName || 'ahí';

    // Step 1 — Welcome (immediate, WhatsApp preferred, email fallback)
    if (phone) {
      await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', phone,
        WHATSAPP_TEMPLATES.ONBOARDING_WELCOME, { name, amount: String(amount), currency });
    } else if (email) {
      await this.messagingService.send({
        tenantId, leadId, channel: 'email', to: email,
        templateName: WHATSAPP_TEMPLATES.ONBOARDING_WELCOME,
        templateParams: { name, amount: String(amount), currency },
      });
    }

    if (!phone && !email) {
      this.logger.warn(`Onboarding sin contacto para lead ${leadId}`);
      return;
    }

    const contact  = phone ?? email!;
    const channel  = phone ? 'whatsapp' : 'email';
    const ONE_HOUR = 60 * 60 * 1000;

    // Step 2 — Document checklist (1h later)
    await this.messagingQueue.add('sequence-step', {
      leadId, tenantId, phone: contact, channel,
      templateName: WHATSAPP_TEMPLATES.ONBOARDING_DOCS,
      params: { name },
    }, { delay: ONE_HOUR, priority: 3 });

    // Step 3 — First class / orientation (24h later)
    await this.messagingQueue.add('sequence-step', {
      leadId, tenantId, phone: contact, channel,
      templateName: WHATSAPP_TEMPLATES.ONBOARDING_FIRST_CLASS,
      params: { name },
    }, { delay: 24 * ONE_HOUR, priority: 3 });

    // Record onboarding event
    await this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.create({
        data: {
          tenantId,
          leadId,
          eventType: 'onboarding_started',
          eventData: { dealId: job.data.dealId, channel },
        },
      }),
    );

    this.logger.log(`Onboarding iniciado para lead ${leadId} (deal ${job.data.dealId})`);
  }

  // ── Gap 1: Appointment reminders ───────────────────────────────────────────

  private async processAppointmentReminder(job: Job<AppointmentReminderJobData>): Promise<void> {
    const { appointmentId, tenantId, leadId, phone, email, firstName, scheduledAt, meetingUrl, reminderType } = job.data;

    // Verify appointment is still scheduled
    const appointment = await this.prisma.withTenant(tenantId, () =>
      this.prisma.appointment.findFirst({
        where: { id: appointmentId, tenantId, status: 'scheduled' },
      }),
    );

    if (!appointment) {
      this.logger.debug(`Appointment ${appointmentId} ya no está programada, omitiendo recordatorio.`);
      return;
    }

    const name      = firstName || 'ahí';
    const template  = reminderType === '24h'
      ? WHATSAPP_TEMPLATES.APPOINTMENT_REMINDER_24H
      : WHATSAPP_TEMPLATES.APPOINTMENT_REMINDER_2H;

    const scheduledDate = new Date(scheduledAt);
    const dateStr = scheduledDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = scheduledDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    const params: Record<string, string> = {
      name,
      date: dateStr,
      time: timeStr,
      meetingUrl: meetingUrl || '',
    };

    // WhatsApp preferred; fall back to email
    if (phone) {
      const result = await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', phone, template, params);
      if (!result.success) {
        this.logger.warn(`WhatsApp reminder falló para ${phone}: ${result.error}`);
      }
    }

    if (email) {
      await this.messagingService.send({
        tenantId, leadId, channel: 'email', to: email,
        templateName: template,
        templateParams: params,
      });
    }

    this.logger.log(`Recordatorio ${reminderType} enviado — appointment ${appointmentId}`);
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

  // ── Salud: post-consultation follow-up ────────────────────────────────────

  private async processPostConsultation(job: Job<PostConsultationJobData>): Promise<void> {
    const { leadId, tenantId, phone, email, firstName } = job.data;
    const name = firstName || 'ahí';

    if (phone) {
      await this.messagingService.sendTemplate(
        tenantId, leadId, 'whatsapp', phone,
        WHATSAPP_TEMPLATES.POST_CONSULTATION_FOLLOWUP,
        { name },
      );
    }

    if (email) {
      await this.messagingService.send({
        tenantId, leadId, channel: 'email', to: email,
        templateName: WHATSAPP_TEMPLATES.POST_CONSULTATION_FOLLOWUP,
        templateParams: { name },
      });
    }

    await this.prisma.withTenant(tenantId, () =>
      this.prisma.leadEvent.create({
        data: {
          tenantId, leadId,
          eventType: 'post_consultation_followup',
          eventData: { appointmentId: job.data.appointmentId },
        },
      }),
    ).catch(() => {});

    this.logger.log(`Post-consultation follow-up enviado — lead ${leadId}`);
  }

  // ── E-commerce: abandoned cart recovery ──────────────────────────────────

  private async processCartAbandoned(job: Job<CartAbandonedJobData>): Promise<void> {
    const { cartId, tenantId, leadId, phone, email, firstName,
            totalAmount, currency, checkoutUrl, itemNames, attemptNumber } = job.data;

    const name     = firstName || 'ahí';
    const template = attemptNumber === 1
      ? WHATSAPP_TEMPLATES.CART_ABANDONED_1
      : WHATSAPP_TEMPLATES.CART_ABANDONED_2;

    const params: Record<string, string> = {
      name,
      items:       itemNames,
      total:       `${currency} ${totalAmount.toLocaleString('es-CL')}`,
      checkoutUrl: checkoutUrl || '',
    };

    if (phone) {
      const result = await this.messagingService.sendTemplate(
        tenantId, leadId ?? '', 'whatsapp', phone, template, params,
      );
      if (!result.success) {
        this.logger.warn(`Cart abandoned WhatsApp falló (${phone}): ${result.error}`);
      }
    }

    if (email) {
      await this.messagingService.send({
        tenantId, leadId, channel: 'email', to: email,
        templateName: template, templateParams: params,
      });
    }

    // Mark cart as recovery-alerted
    await this.prisma.withTenant(tenantId, () =>
      (this.prisma as any).cart.update({
        where: { id: cartId },
        data:  { recoveryAlertSentAt: new Date() },
      }),
    ).catch(() => {});

    this.logger.log(`Cart abandoned attempt #${attemptNumber} — cart ${cartId}`);
  }
}

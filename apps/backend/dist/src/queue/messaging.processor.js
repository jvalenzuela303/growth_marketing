"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MessagingProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingProcessor = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("bullmq");
const inject_queue_decorator_1 = require("./inject-queue.decorator");
const messaging_service_1 = require("../modules/messaging/messaging.service");
const prisma_service_1 = require("../database/prisma.service");
const shared_types_1 = require("@growth-engine/shared-types");
const followup_scheduler_1 = require("./followup.scheduler");
const abandoned_cart_scanner_1 = require("./abandoned-cart.scanner");
const SEGMENT_SEQUENCE = {
    fuego: [
        shared_types_1.WHATSAPP_TEMPLATES.HOT_LEAD_1,
        shared_types_1.WHATSAPP_TEMPLATES.HOT_LEAD_2,
        shared_types_1.WHATSAPP_TEMPLATES.HOT_LEAD_3,
    ],
    caliente: [
        shared_types_1.WHATSAPP_TEMPLATES.WARM_NURTURE_1,
        shared_types_1.WHATSAPP_TEMPLATES.WARM_NURTURE_2,
    ],
    tibio: [shared_types_1.WHATSAPP_TEMPLATES.WARM_NURTURE_1],
    frio: [shared_types_1.WHATSAPP_TEMPLATES.REENGAGEMENT],
    motor_detenido: [],
    sin_clasificar: [shared_types_1.WHATSAPP_TEMPLATES.WELCOME],
};
let MessagingProcessor = MessagingProcessor_1 = class MessagingProcessor {
    constructor(config, messagingService, prisma, messagingQueue, followUpScheduler, cartScanner) {
        this.config = config;
        this.messagingService = messagingService;
        this.prisma = prisma;
        this.messagingQueue = messagingQueue;
        this.followUpScheduler = followUpScheduler;
        this.cartScanner = cartScanner;
        this.logger = new common_1.Logger(MessagingProcessor_1.name);
    }
    async onModuleInit() {
        this.worker = new bullmq_1.Worker('messaging', async (job) => {
            if (job.name === 'hot-lead-alert')
                return this.processHotLeadAlert(job);
            if (job.name === 'followup-scan')
                return this.followUpScheduler.runScan();
            if (job.name === 'auto-followup')
                return this.processAutoFollowup(job);
            if (job.name === 'sequence-step')
                return this.processSequenceStep(job);
            if (job.name === 'onboarding-start')
                return this.processOnboardingStart(job);
            if (job.name === 'appointment-reminder')
                return this.processAppointmentReminder(job);
            if (job.name === 'followup-post-consultation')
                return this.processPostConsultation(job);
            if (job.name === 'cart-abandoned')
                return this.processCartAbandoned(job);
            if (job.name === 'abandoned-cart-scan')
                return this.cartScanner.runScan();
            return this.processLeadScored(job);
        }, {
            connection: {
                host: this.config.get('REDIS_HOST', 'localhost'),
                port: this.config.get('REDIS_PORT', 6379),
                password: this.config.get('REDIS_PASSWORD'),
                db: this.config.get('REDIS_DB', 0),
            },
            concurrency: Number(this.config.get('MESSAGING_WORKER_CONCURRENCY', 3)),
        });
        this.worker.on('completed', (job) => this.logger.debug(`Job messaging completado: ${job.id} (${job.name})`));
        this.worker.on('failed', (job, err) => this.logger.error(`Job messaging fallido: ${job?.id} (${job?.name}) — ${err.message}`));
        await this.messagingQueue.add('abandoned-cart-scan', {}, { repeat: { every: 60 * 60 * 1000 }, jobId: 'abandoned-cart-scan-hourly', priority: 5 });
        this.logger.log('MessagingProcessor iniciado.');
    }
    async onModuleDestroy() {
        await this.worker?.close();
    }
    async processLeadScored(job) {
        const { leadId, tenantId, segment } = job.data;
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: { phone: true, firstName: true, lastName: true, email: true },
        }));
        if (!lead) {
            this.logger.warn(`Lead no encontrado para mensajería: ${leadId}`);
            return;
        }
        const sequence = SEGMENT_SEQUENCE[segment] || [];
        if (sequence.length === 0) {
            this.logger.debug(`Segmento "${segment}" sin secuencia de mensajes configurada.`);
            return;
        }
        const welcomeTemplate = shared_types_1.WHATSAPP_TEMPLATES.WELCOME;
        if (lead.phone) {
            const welcomeResult = await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', lead.phone, welcomeTemplate, {
                name: lead.firstName || 'ahí',
                segment,
            });
            if (!welcomeResult.success) {
                this.logger.warn(`No se pudo enviar welcome a ${lead.phone}: ${welcomeResult.error}`);
            }
        }
        const firstSegmentTemplate = sequence[0];
        if (firstSegmentTemplate && lead.phone) {
            const fiveMinutes = 5 * 60 * 1000;
            await this.messagingQueue.add('sequence-step', {
                leadId,
                tenantId,
                phone: lead.phone,
                templateName: firstSegmentTemplate,
                params: { name: lead.firstName || 'ahí' },
            }, { delay: fiveMinutes, priority: 3 });
        }
    }
    async processAutoFollowup(job) {
        const { leadId, tenantId, phone, templateName, params } = job.data;
        const result = await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', phone, templateName, params);
        if (result.success) {
            await this.prisma.withTenant(tenantId, () => this.prisma.leadEvent.create({
                data: {
                    tenantId,
                    leadId,
                    eventType: 'auto_followup',
                    eventData: { templateName, channel: 'whatsapp' },
                },
            }));
            this.logger.log(`Auto follow-up enviado a ${phone} (lead ${leadId}): ${templateName}`);
        }
        else {
            this.logger.warn(`Auto follow-up falló para ${leadId}: ${result.error}`);
        }
    }
    async processSequenceStep(job) {
        const { leadId, tenantId, phone, templateName, params, channel = 'whatsapp' } = job.data;
        await this.messagingService.sendTemplate(tenantId, leadId, channel, phone, templateName, params);
    }
    async processOnboardingStart(job) {
        const { leadId, tenantId, phone, email, firstName, amount, currency } = job.data;
        const name = firstName || 'ahí';
        if (phone) {
            await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', phone, shared_types_1.WHATSAPP_TEMPLATES.ONBOARDING_WELCOME, { name, amount: String(amount), currency });
        }
        else if (email) {
            await this.messagingService.send({
                tenantId, leadId, channel: 'email', to: email,
                templateName: shared_types_1.WHATSAPP_TEMPLATES.ONBOARDING_WELCOME,
                templateParams: { name, amount: String(amount), currency },
            });
        }
        if (!phone && !email) {
            this.logger.warn(`Onboarding sin contacto para lead ${leadId}`);
            return;
        }
        const contact = phone ?? email;
        const channel = phone ? 'whatsapp' : 'email';
        const ONE_HOUR = 60 * 60 * 1000;
        await this.messagingQueue.add('sequence-step', {
            leadId, tenantId, phone: contact, channel,
            templateName: shared_types_1.WHATSAPP_TEMPLATES.ONBOARDING_DOCS,
            params: { name },
        }, { delay: ONE_HOUR, priority: 3 });
        await this.messagingQueue.add('sequence-step', {
            leadId, tenantId, phone: contact, channel,
            templateName: shared_types_1.WHATSAPP_TEMPLATES.ONBOARDING_FIRST_CLASS,
            params: { name },
        }, { delay: 24 * ONE_HOUR, priority: 3 });
        await this.prisma.withTenant(tenantId, () => this.prisma.leadEvent.create({
            data: {
                tenantId,
                leadId,
                eventType: 'onboarding_started',
                eventData: { dealId: job.data.dealId, channel },
            },
        }));
        this.logger.log(`Onboarding iniciado para lead ${leadId} (deal ${job.data.dealId})`);
    }
    async processAppointmentReminder(job) {
        const { appointmentId, tenantId, leadId, phone, email, firstName, scheduledAt, meetingUrl, reminderType } = job.data;
        const appointment = await this.prisma.withTenant(tenantId, () => this.prisma.appointment.findFirst({
            where: { id: appointmentId, tenantId, status: 'scheduled' },
        }));
        if (!appointment) {
            this.logger.debug(`Appointment ${appointmentId} ya no está programada, omitiendo recordatorio.`);
            return;
        }
        const name = firstName || 'ahí';
        const template = reminderType === '24h'
            ? shared_types_1.WHATSAPP_TEMPLATES.APPOINTMENT_REMINDER_24H
            : shared_types_1.WHATSAPP_TEMPLATES.APPOINTMENT_REMINDER_2H;
        const scheduledDate = new Date(scheduledAt);
        const dateStr = scheduledDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
        const timeStr = scheduledDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        const params = {
            name,
            date: dateStr,
            time: timeStr,
            meetingUrl: meetingUrl || '',
        };
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
    async processHotLeadAlert(job) {
        const { leadId, tenantId, totalScore, segment } = job.data;
        const lead = await this.prisma.withTenant(tenantId, () => this.prisma.lead.findFirst({
            where: { id: leadId, tenantId, deletedAt: null },
            select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                company: true,
                hotLeadAlertSentAt: true,
            },
        }));
        if (!lead)
            return;
        if (lead.hotLeadAlertSentAt) {
            this.logger.debug(`Hot lead alert ya enviada para ${leadId}, ignorando duplicado.`);
            return;
        }
        this.logger.log(`HOT LEAD: ${lead.firstName} ${lead.lastName} (${lead.email}) — score ${totalScore} — segmento ${segment}`);
        await this.prisma.withTenant(tenantId, () => this.prisma.lead.update({
            where: { id: leadId },
            data: { hotLeadAlertSentAt: new Date() },
        }));
        await this.prisma.withTenant(tenantId, () => this.prisma.leadEvent.create({
            data: {
                tenantId,
                leadId,
                eventType: 'hot_lead_alert',
                eventData: { totalScore, segment, alertSentAt: new Date().toISOString() },
            },
        }));
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
    async processPostConsultation(job) {
        const { leadId, tenantId, phone, email, firstName } = job.data;
        const name = firstName || 'ahí';
        if (phone) {
            await this.messagingService.sendTemplate(tenantId, leadId, 'whatsapp', phone, shared_types_1.WHATSAPP_TEMPLATES.POST_CONSULTATION_FOLLOWUP, { name });
        }
        if (email) {
            await this.messagingService.send({
                tenantId, leadId, channel: 'email', to: email,
                templateName: shared_types_1.WHATSAPP_TEMPLATES.POST_CONSULTATION_FOLLOWUP,
                templateParams: { name },
            });
        }
        await this.prisma.withTenant(tenantId, () => this.prisma.leadEvent.create({
            data: {
                tenantId, leadId,
                eventType: 'post_consultation_followup',
                eventData: { appointmentId: job.data.appointmentId },
            },
        })).catch(() => { });
        this.logger.log(`Post-consultation follow-up enviado — lead ${leadId}`);
    }
    async processCartAbandoned(job) {
        const { cartId, tenantId, leadId, phone, email, firstName, totalAmount, currency, checkoutUrl, itemNames, attemptNumber } = job.data;
        const name = firstName || 'ahí';
        const template = attemptNumber === 1
            ? shared_types_1.WHATSAPP_TEMPLATES.CART_ABANDONED_1
            : shared_types_1.WHATSAPP_TEMPLATES.CART_ABANDONED_2;
        const params = {
            name,
            items: itemNames,
            total: `${currency} ${totalAmount.toLocaleString('es-CL')}`,
            checkoutUrl: checkoutUrl || '',
        };
        if (phone) {
            const result = await this.messagingService.sendTemplate(tenantId, leadId ?? '', 'whatsapp', phone, template, params);
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
        await this.prisma.withTenant(tenantId, () => this.prisma.cart.update({
            where: { id: cartId },
            data: { recoveryAlertSentAt: new Date() },
        })).catch(() => { });
        this.logger.log(`Cart abandoned attempt #${attemptNumber} — cart ${cartId}`);
    }
};
exports.MessagingProcessor = MessagingProcessor;
exports.MessagingProcessor = MessagingProcessor = MessagingProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, inject_queue_decorator_1.InjectQueue)('messaging')),
    __metadata("design:paramtypes", [config_1.ConfigService,
        messaging_service_1.MessagingService,
        prisma_service_1.PrismaService,
        bullmq_1.Queue,
        followup_scheduler_1.FollowUpScheduler,
        abandoned_cart_scanner_1.AbandonedCartScanner])
], MessagingProcessor);
//# sourceMappingURL=messaging.processor.js.map
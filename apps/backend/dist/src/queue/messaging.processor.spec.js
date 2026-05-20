"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const messaging_processor_1 = require("./messaging.processor");
const messaging_service_1 = require("../modules/messaging/messaging.service");
const prisma_service_1 = require("../database/prisma.service");
jest.mock('bullmq', () => {
    const mockWorkerOn = jest.fn();
    const mockWorkerClose = jest.fn().mockResolvedValue(undefined);
    const MockWorker = jest.fn().mockImplementation(() => ({
        on: mockWorkerOn,
        close: mockWorkerClose,
    }));
    const MockQueue = jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    }));
    return { Worker: MockWorker, Queue: MockQueue, Job: jest.fn() };
});
const makeLead = (overrides = {}) => ({
    phone: '+521234567890',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@empresa.com',
    company: 'Empresa S.A.',
    hotLeadAlertSentAt: null,
    ...overrides,
});
const makeJob = (name, data) => ({
    name,
    data: {
        leadId: 'lead-001',
        tenantId: 'tenant-001',
        totalScore: 85,
        segment: 'fuego',
        ...data,
    },
});
describe('MessagingProcessor', () => {
    let processor;
    let messagingService;
    let messagingQueue;
    const mockPrismaLead = { findFirst: jest.fn(), update: jest.fn() };
    const mockPrismaLeadEvent = { create: jest.fn() };
    const mockWithTenant = jest.fn().mockImplementation((_tenantId, fn) => fn());
    const configValues = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6380,
        REDIS_DB: 0,
        MESSAGING_WORKER_CONCURRENCY: '3',
    };
    beforeEach(async () => {
        messagingQueue = { add: jest.fn().mockResolvedValue({ id: 'job-delayed' }) };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                messaging_processor_1.MessagingProcessor,
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key, fb) => configValues[key] ?? fb),
                    },
                },
                {
                    provide: messaging_service_1.MessagingService,
                    useValue: {
                        sendTemplate: jest.fn().mockResolvedValue({ success: true }),
                    },
                },
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: {
                        withTenant: mockWithTenant,
                        lead: mockPrismaLead,
                        leadEvent: mockPrismaLeadEvent,
                    },
                },
                {
                    provide: 'BULLMQ_QUEUE_MESSAGING',
                    useValue: messagingQueue,
                },
            ],
        }).compile();
        processor = module.get(messaging_processor_1.MessagingProcessor);
        messagingService = module.get(messaging_service_1.MessagingService);
        processor.messagingQueue = messagingQueue;
        processor.onModuleInit();
    });
    afterEach(() => jest.clearAllMocks());
    afterAll(async () => { await processor.onModuleDestroy(); });
    describe('processLeadScored', () => {
        it('envía mensaje de bienvenida cuando el lead tiene teléfono', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead());
            await processor.processLeadScored(makeJob('lead.scored', { segment: 'caliente' }));
            expect(messagingService.sendTemplate).toHaveBeenCalledWith('tenant-001', 'lead-001', 'whatsapp', '+521234567890', expect.any(String), expect.objectContaining({ name: 'Ana', segment: 'caliente' }));
        });
        it('encola el primer mensaje del segmento con delay de 5 min', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead());
            await processor.processLeadScored(makeJob('lead.scored', { segment: 'fuego' }));
            expect(messagingQueue.add).toHaveBeenCalledWith('sequence-step', expect.objectContaining({ leadId: 'lead-001', tenantId: 'tenant-001' }), expect.objectContaining({ delay: 5 * 60 * 1000 }));
        });
        it('motor_detenido: no envía ningún mensaje ni encola nada', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead());
            await processor.processLeadScored(makeJob('lead.scored', { segment: 'motor_detenido' }));
            expect(messagingService.sendTemplate).not.toHaveBeenCalled();
            expect(messagingQueue.add).not.toHaveBeenCalled();
        });
        it('sin teléfono: no envía mensajes ni encola', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead({ phone: null }));
            await processor.processLeadScored(makeJob('lead.scored', { segment: 'caliente' }));
            expect(messagingService.sendTemplate).not.toHaveBeenCalled();
        });
        it('lead no encontrado: retorna sin error', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(null);
            await expect(processor.processLeadScored(makeJob('lead.scored', {}))).resolves.toBeUndefined();
            expect(messagingService.sendTemplate).not.toHaveBeenCalled();
        });
        it('fallo en sendTemplate: no lanza excepción (log warning)', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead());
            messagingService.sendTemplate.mockResolvedValue({
                success: false,
                error: 'WhatsApp no configurado.',
            });
            await expect(processor.processLeadScored(makeJob('lead.scored', { segment: 'caliente' }))).resolves.toBeUndefined();
        });
    });
    describe('processHotLeadAlert', () => {
        it('actualiza hotLeadAlertSentAt en el lead', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead({ hotLeadAlertSentAt: null }));
            mockPrismaLead.update.mockResolvedValue({});
            mockPrismaLeadEvent.create.mockResolvedValue({});
            await processor.processHotLeadAlert(makeJob('hot-lead-alert', {}));
            expect(mockPrismaLead.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'lead-001' },
                data: expect.objectContaining({ hotLeadAlertSentAt: expect.any(Date) }),
            }));
        });
        it('registra un evento lead_event tipo hot_lead_alert', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead());
            mockPrismaLead.update.mockResolvedValue({});
            mockPrismaLeadEvent.create.mockResolvedValue({});
            await processor.processHotLeadAlert(makeJob('hot-lead-alert', {}));
            expect(mockPrismaLeadEvent.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    eventType: 'hot_lead_alert',
                    leadId: 'lead-001',
                    tenantId: 'tenant-001',
                }),
            }));
        });
        it('duplicado: si hotLeadAlertSentAt ya existe, no actualiza ni crea evento', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead({ hotLeadAlertSentAt: new Date('2025-01-01') }));
            await processor.processHotLeadAlert(makeJob('hot-lead-alert', {}));
            expect(mockPrismaLead.update).not.toHaveBeenCalled();
            expect(mockPrismaLeadEvent.create).not.toHaveBeenCalled();
        });
        it('lead no encontrado: retorna sin error', async () => {
            mockPrismaLead.findFirst.mockResolvedValue(null);
            await expect(processor.processHotLeadAlert(makeJob('hot-lead-alert', {}))).resolves.toBeUndefined();
        });
    });
});
//# sourceMappingURL=messaging.processor.spec.js.map
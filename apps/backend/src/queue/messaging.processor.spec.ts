/**
 * Unit tests — MessagingProcessor
 *
 * Cubre los flujos del worker BullMQ de mensajería:
 *   1. processLeadScored: envía welcome + encola secuencia del segmento
 *   2. processHotLeadAlert: marca hotLeadAlertSentAt y crea evento
 *   3. motor_detenido: no envía mensajes automáticos
 *   4. Alerta duplicada: se ignora si hotLeadAlertSentAt ya existe
 *   5. Lead no encontrado: retorna sin error
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MessagingProcessor } from './messaging.processor';
import { MessagingService } from '../modules/messaging/messaging.service';
import { PrismaService } from '../database/prisma.service';

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

// ─── Factories ────────────────────────────────────────────────────────────────

const makeLead = (overrides = {}) => ({
  phone: '+521234567890',
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@empresa.com',
  company: 'Empresa S.A.',
  hotLeadAlertSentAt: null,
  ...overrides,
});

const makeJob = (name: string, data: object) => ({
  name,
  data: {
    leadId: 'lead-001',
    tenantId: 'tenant-001',
    totalScore: 85,
    segment: 'fuego',
    ...data,
  },
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('MessagingProcessor', () => {
  let processor: MessagingProcessor;
  let messagingService: jest.Mocked<MessagingService>;
  let messagingQueue: { add: jest.Mock };

  const mockPrismaLead = { findFirst: jest.fn(), update: jest.fn() };
  const mockPrismaLeadEvent = { create: jest.fn() };
  const mockWithTenant = jest.fn().mockImplementation((_tenantId, fn) => fn());

  const configValues: Record<string, unknown> = {
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6380,
    REDIS_DB: 0,
    MESSAGING_WORKER_CONCURRENCY: '3',
  };

  beforeEach(async () => {
    messagingQueue = { add: jest.fn().mockResolvedValue({ id: 'job-delayed' }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingProcessor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fb?: unknown) => configValues[key] ?? fb),
          },
        },
        {
          provide: MessagingService,
          useValue: {
            sendTemplate: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            withTenant: mockWithTenant,
            lead: mockPrismaLead,
            leadEvent: mockPrismaLeadEvent,
          },
        },
        {
          // Token generado por @InjectQueue('messaging') → BULLMQ_QUEUE_MESSAGING
          provide: 'BULLMQ_QUEUE_MESSAGING',
          useValue: messagingQueue,
        },
      ],
    }).compile();

    processor = module.get<MessagingProcessor>(MessagingProcessor);
    messagingService = module.get(MessagingService);

    // Inyectar queue manualmente (el decorador custom puede variar)
    (processor as any).messagingQueue = messagingQueue;

    processor.onModuleInit();
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(async () => { await processor.onModuleDestroy(); });

  // ─── processLeadScored ───────────────────────────────────────────────────────

  describe('processLeadScored', () => {
    it('envía mensaje de bienvenida cuando el lead tiene teléfono', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead());

      await (processor as any).processLeadScored(makeJob('lead.scored', { segment: 'caliente' }));

      expect(messagingService.sendTemplate).toHaveBeenCalledWith(
        'tenant-001',
        'lead-001',
        'whatsapp',
        '+521234567890',
        expect.any(String), // welcomeTemplate
        expect.objectContaining({ name: 'Ana', segment: 'caliente' }),
      );
    });

    it('encola el primer mensaje del segmento con delay de 5 min', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead());

      await (processor as any).processLeadScored(makeJob('lead.scored', { segment: 'fuego' }));

      expect(messagingQueue.add).toHaveBeenCalledWith(
        'sequence-step',
        expect.objectContaining({ leadId: 'lead-001', tenantId: 'tenant-001' }),
        expect.objectContaining({ delay: 5 * 60 * 1000 }),
      );
    });

    it('motor_detenido: no envía ningún mensaje ni encola nada', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead());

      await (processor as any).processLeadScored(
        makeJob('lead.scored', { segment: 'motor_detenido' }),
      );

      expect(messagingService.sendTemplate).not.toHaveBeenCalled();
      expect(messagingQueue.add).not.toHaveBeenCalled();
    });

    it('sin teléfono: no envía mensajes ni encola', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead({ phone: null }));

      await (processor as any).processLeadScored(makeJob('lead.scored', { segment: 'caliente' }));

      expect(messagingService.sendTemplate).not.toHaveBeenCalled();
    });

    it('lead no encontrado: retorna sin error', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(null);

      await expect(
        (processor as any).processLeadScored(makeJob('lead.scored', {})),
      ).resolves.toBeUndefined();

      expect(messagingService.sendTemplate).not.toHaveBeenCalled();
    });

    it('fallo en sendTemplate: no lanza excepción (log warning)', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead());
      (messagingService.sendTemplate as jest.Mock).mockResolvedValue({
        success: false,
        error: 'WhatsApp no configurado.',
      });

      await expect(
        (processor as any).processLeadScored(makeJob('lead.scored', { segment: 'caliente' })),
      ).resolves.toBeUndefined();
    });
  });

  // ─── processHotLeadAlert ─────────────────────────────────────────────────────

  describe('processHotLeadAlert', () => {
    it('actualiza hotLeadAlertSentAt en el lead', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead({ hotLeadAlertSentAt: null }));
      mockPrismaLead.update.mockResolvedValue({});
      mockPrismaLeadEvent.create.mockResolvedValue({});

      await (processor as any).processHotLeadAlert(makeJob('hot-lead-alert', {}));

      expect(mockPrismaLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lead-001' },
          data: expect.objectContaining({ hotLeadAlertSentAt: expect.any(Date) }),
        }),
      );
    });

    it('registra un evento lead_event tipo hot_lead_alert', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead());
      mockPrismaLead.update.mockResolvedValue({});
      mockPrismaLeadEvent.create.mockResolvedValue({});

      await (processor as any).processHotLeadAlert(makeJob('hot-lead-alert', {}));

      expect(mockPrismaLeadEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'hot_lead_alert',
            leadId: 'lead-001',
            tenantId: 'tenant-001',
          }),
        }),
      );
    });

    it('duplicado: si hotLeadAlertSentAt ya existe, no actualiza ni crea evento', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(
        makeLead({ hotLeadAlertSentAt: new Date('2025-01-01') }),
      );

      await (processor as any).processHotLeadAlert(makeJob('hot-lead-alert', {}));

      expect(mockPrismaLead.update).not.toHaveBeenCalled();
      expect(mockPrismaLeadEvent.create).not.toHaveBeenCalled();
    });

    it('lead no encontrado: retorna sin error', async () => {
      mockPrismaLead.findFirst.mockResolvedValue(null);

      await expect(
        (processor as any).processHotLeadAlert(makeJob('hot-lead-alert', {})),
      ).resolves.toBeUndefined();
    });
  });
});

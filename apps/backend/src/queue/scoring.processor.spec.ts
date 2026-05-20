/**
 * Unit tests — ScoringProcessor
 *
 * Cubre los flujos críticos del worker BullMQ:
 *   1. Happy path: AI Engine disponible → scores persistidos
 *   2. Fallback: AI Engine no disponible → scoring local
 *   3. Lead no encontrado → retorno sin error
 *
 * Las dependencias (Worker, axios, Prisma, LeadsService) se mockean completamente
 * para evitar conexiones reales a Redis o PostgreSQL.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ScoringProcessor } from './scoring.processor';
import { LeadsService } from '../modules/leads/leads.service';
import { PrismaService } from '../database/prisma.service';

// Mockear módulos externos antes de importarlos
jest.mock('axios');
jest.mock('bullmq', () => {
  const mockWorkerOn = jest.fn();
  const mockWorkerClose = jest.fn().mockResolvedValue(undefined);
  const MockWorker = jest.fn().mockImplementation(() => ({
    on: mockWorkerOn,
    close: mockWorkerClose,
  }));
  return { Worker: MockWorker, Job: jest.fn() };
});

import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

// ─── Factories ────────────────────────────────────────────────────────────────

const makeLead = (overrides = {}) => ({
  id: 'lead-001',
  quizAnswers: [{ question_index: 8, option_id: 'menos_1_mes' }],
  behaviorData: { visits: 3, pricing_page_clicks: 2, total_time_seconds: 180 },
  funnelId: 'funnel-001',
  source: 'meta_ads',
  utmCampaign: 'q1_2025',
  quizCompletionPercentage: 90,
  ...overrides,
});

const makeAiEngineResponse = (overrides = {}) => ({
  quiz_score: 35,
  behavior_score: 14,
  engagement_score: 17,
  demographic_score: 10,
  total_score: 76,
  segment: 'caliente',
  pathology: 'buscando_solucion',
  pathology_confidence: 0.85,
  model: 'claude-sonnet-4-6',
  recommendations: ['Enviar caso de éxito', 'Demo en 24h'],
  ...overrides,
});

const makeJob = (data: object) => ({
  data: { leadId: 'lead-001', tenantId: 'tenant-001', funnelId: 'funnel-001', ...data },
});

// ─── Setup ────────────────────────────────────────────────────────────────────

describe('ScoringProcessor', () => {
  let processor: ScoringProcessor;
  let leadsService: jest.Mocked<LeadsService>;
  let prismaService: jest.Mocked<PrismaService>;

  const mockPrismaLead = {
    findFirst: jest.fn(),
  };

  const mockWithTenant = jest.fn().mockImplementation((_tenantId, fn) => fn());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoringProcessor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, fallback?: unknown) => {
              const config: Record<string, unknown> = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6380,
                REDIS_DB: 0,
                SCORING_WORKER_CONCURRENCY: '5',
                AI_ENGINE_URL: 'http://localhost:8000',
                INTERNAL_API_SECRET: 'test-secret',
              };
              return config[key] ?? fallback;
            }),
          },
        },
        {
          provide: LeadsService,
          useValue: {
            calculateAndUpdateScore: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            withTenant: mockWithTenant,
            lead: mockPrismaLead,
          },
        },
      ],
    }).compile();

    processor = module.get<ScoringProcessor>(ScoringProcessor);
    leadsService = module.get(LeadsService);
    prismaService = module.get(PrismaService);

    processor.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await processor.onModuleDestroy();
  });

  // ─── Happy path ─────────────────────────────────────────────────────────────

  describe('cuando el AI Engine responde correctamente', () => {
    beforeEach(() => {
      mockPrismaLead.findFirst.mockResolvedValue(makeLead());
      mockedAxios.post = jest.fn().mockResolvedValue({ data: makeAiEngineResponse() });
    });

    it('llama al AI Engine con los datos del lead', async () => {
      await (processor as any).process(makeJob({}));

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://localhost:8000/score',
        expect.objectContaining({ lead_id: 'lead-001', tenant_id: 'tenant-001' }),
        expect.objectContaining({ timeout: 30000 }),
      );
    });

    it('persiste scores con caps correctos (quiz ≤40, behavior ≤30, etc.)', async () => {
      await (processor as any).process(makeJob({}));

      expect(leadsService.calculateAndUpdateScore).toHaveBeenCalledWith(
        'tenant-001',
        'lead-001',
        expect.objectContaining({
          quizScore: expect.any(Number),
          behaviorScore: expect.any(Number),
          engagementScore: expect.any(Number),
          demographicScore: expect.any(Number),
        }),
        expect.objectContaining({
          segment: 'caliente',
          pathology: 'buscando_solucion',
        }),
      );

      const scoreArg = (leadsService.calculateAndUpdateScore as jest.Mock).mock.calls[0][2];
      expect(scoreArg.quizScore).toBeLessThanOrEqual(40);
      expect(scoreArg.behaviorScore).toBeLessThanOrEqual(30);
      expect(scoreArg.engagementScore).toBeLessThanOrEqual(20);
      expect(scoreArg.demographicScore).toBeLessThanOrEqual(10);
    });

    it('pasa pathology y model al servicio de leads', async () => {
      await (processor as any).process(makeJob({}));

      const classificationArg = (leadsService.calculateAndUpdateScore as jest.Mock).mock.calls[0][3];
      expect(classificationArg.pathology).toBe('buscando_solucion');
      expect(classificationArg.classifiedModel).toBe('claude-sonnet-4-6');
      expect(classificationArg.pathologyConfidence).toBe(0.85);
    });
  });

  // ─── Fallback ───────────────────────────────────────────────────────────────

  describe('cuando el AI Engine falla (fallback local)', () => {
    beforeEach(() => {
      mockPrismaLead.findFirst.mockResolvedValue(
        makeLead({ quizCompletionPercentage: 80, behaviorData: { visits: 3, pricing_page_clicks: 2, total_time_seconds: 180 } }),
      );
      mockedAxios.post = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    });

    it('no lanza excepción y usa scoring fallback', async () => {
      await expect((processor as any).process(makeJob({}))).resolves.toBeUndefined();
    });

    it('persiste scores con model=fallback-v1', async () => {
      await (processor as any).process(makeJob({}));

      expect(leadsService.calculateAndUpdateScore).toHaveBeenCalledWith(
        'tenant-001',
        'lead-001',
        expect.any(Object),
        expect.objectContaining({ classifiedModel: 'fallback-v1' }),
      );
    });

    it('score de fallback = quizScore (proporcional) + behaviorScore (visitas/clics)', async () => {
      await (processor as any).process(makeJob({}));

      const scoreArg = (leadsService.calculateAndUpdateScore as jest.Mock).mock.calls[0][2];
      // 80% completion → 32 pts de quiz; 3 visitas + 2 clics = ~15 pts behavior
      expect(scoreArg.quizScore).toBe(32);
      expect(scoreArg.engagementScore).toBe(0);
      expect(scoreArg.demographicScore).toBe(0);
    });
  });

  // ─── Lead no encontrado ──────────────────────────────────────────────────────

  describe('cuando el lead no existe en DB', () => {
    beforeEach(() => {
      mockPrismaLead.findFirst.mockResolvedValue(null);
    });

    it('retorna sin error y sin llamar al AI Engine', async () => {
      await expect((processor as any).process(makeJob({}))).resolves.toBeUndefined();
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(leadsService.calculateAndUpdateScore).not.toHaveBeenCalled();
    });
  });

  // ─── calculateFallbackScore ──────────────────────────────────────────────────

  describe('calculateFallbackScore (privado)', () => {
    it('score total = quizScore + behaviorScore (engagement y demographic son 0)', () => {
      const lead = makeLead({ quizCompletionPercentage: 50 });
      const result = (processor as any).calculateFallbackScore(lead);

      expect(result.engagement_score).toBe(0);
      expect(result.demographic_score).toBe(0);
      expect(result.total_score).toBe(result.quiz_score + result.behavior_score);
    });

    it('model es siempre "fallback-v1"', () => {
      const result = (processor as any).calculateFallbackScore(makeLead());
      expect(result.model).toBe('fallback-v1');
    });

    it('quiz_score no supera 40', () => {
      const lead = makeLead({ quizCompletionPercentage: 100 });
      const result = (processor as any).calculateFallbackScore(lead);
      expect(result.quiz_score).toBeLessThanOrEqual(40);
    });
  });
});

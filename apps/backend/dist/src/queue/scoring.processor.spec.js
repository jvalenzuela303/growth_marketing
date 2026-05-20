"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const scoring_processor_1 = require("./scoring.processor");
const leads_service_1 = require("../modules/leads/leads.service");
const prisma_service_1 = require("../database/prisma.service");
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
const axios_1 = require("axios");
const mockedAxios = axios_1.default;
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
const makeJob = (data) => ({
    data: { leadId: 'lead-001', tenantId: 'tenant-001', funnelId: 'funnel-001', ...data },
});
describe('ScoringProcessor', () => {
    let processor;
    let leadsService;
    let prismaService;
    const mockPrismaLead = {
        findFirst: jest.fn(),
    };
    const mockWithTenant = jest.fn().mockImplementation((_tenantId, fn) => fn());
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                scoring_processor_1.ScoringProcessor,
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key, fallback) => {
                            const config = {
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
                    provide: leads_service_1.LeadsService,
                    useValue: {
                        calculateAndUpdateScore: jest.fn().mockResolvedValue(undefined),
                    },
                },
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: {
                        withTenant: mockWithTenant,
                        lead: mockPrismaLead,
                    },
                },
            ],
        }).compile();
        processor = module.get(scoring_processor_1.ScoringProcessor);
        leadsService = module.get(leads_service_1.LeadsService);
        prismaService = module.get(prisma_service_1.PrismaService);
        processor.onModuleInit();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    afterAll(async () => {
        await processor.onModuleDestroy();
    });
    describe('cuando el AI Engine responde correctamente', () => {
        beforeEach(() => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead());
            mockedAxios.post = jest.fn().mockResolvedValue({ data: makeAiEngineResponse() });
        });
        it('llama al AI Engine con los datos del lead', async () => {
            await processor.process(makeJob({}));
            expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:8000/score', expect.objectContaining({ lead_id: 'lead-001', tenant_id: 'tenant-001' }), expect.objectContaining({ timeout: 30000 }));
        });
        it('persiste scores con caps correctos (quiz ≤40, behavior ≤30, etc.)', async () => {
            await processor.process(makeJob({}));
            expect(leadsService.calculateAndUpdateScore).toHaveBeenCalledWith('tenant-001', 'lead-001', expect.objectContaining({
                quizScore: expect.any(Number),
                behaviorScore: expect.any(Number),
                engagementScore: expect.any(Number),
                demographicScore: expect.any(Number),
            }), expect.objectContaining({
                segment: 'caliente',
                pathology: 'buscando_solucion',
            }));
            const scoreArg = leadsService.calculateAndUpdateScore.mock.calls[0][2];
            expect(scoreArg.quizScore).toBeLessThanOrEqual(40);
            expect(scoreArg.behaviorScore).toBeLessThanOrEqual(30);
            expect(scoreArg.engagementScore).toBeLessThanOrEqual(20);
            expect(scoreArg.demographicScore).toBeLessThanOrEqual(10);
        });
        it('pasa pathology y model al servicio de leads', async () => {
            await processor.process(makeJob({}));
            const classificationArg = leadsService.calculateAndUpdateScore.mock.calls[0][3];
            expect(classificationArg.pathology).toBe('buscando_solucion');
            expect(classificationArg.classifiedModel).toBe('claude-sonnet-4-6');
            expect(classificationArg.pathologyConfidence).toBe(0.85);
        });
    });
    describe('cuando el AI Engine falla (fallback local)', () => {
        beforeEach(() => {
            mockPrismaLead.findFirst.mockResolvedValue(makeLead({ quizCompletionPercentage: 80, behaviorData: { visits: 3, pricing_page_clicks: 2, total_time_seconds: 180 } }));
            mockedAxios.post = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
        });
        it('no lanza excepción y usa scoring fallback', async () => {
            await expect(processor.process(makeJob({}))).resolves.toBeUndefined();
        });
        it('persiste scores con model=fallback-v1', async () => {
            await processor.process(makeJob({}));
            expect(leadsService.calculateAndUpdateScore).toHaveBeenCalledWith('tenant-001', 'lead-001', expect.any(Object), expect.objectContaining({ classifiedModel: 'fallback-v1' }));
        });
        it('score de fallback = quizScore (proporcional) + behaviorScore (visitas/clics)', async () => {
            await processor.process(makeJob({}));
            const scoreArg = leadsService.calculateAndUpdateScore.mock.calls[0][2];
            expect(scoreArg.quizScore).toBe(32);
            expect(scoreArg.engagementScore).toBe(0);
            expect(scoreArg.demographicScore).toBe(0);
        });
    });
    describe('cuando el lead no existe en DB', () => {
        beforeEach(() => {
            mockPrismaLead.findFirst.mockResolvedValue(null);
        });
        it('retorna sin error y sin llamar al AI Engine', async () => {
            await expect(processor.process(makeJob({}))).resolves.toBeUndefined();
            expect(mockedAxios.post).not.toHaveBeenCalled();
            expect(leadsService.calculateAndUpdateScore).not.toHaveBeenCalled();
        });
    });
    describe('calculateFallbackScore (privado)', () => {
        it('score total = quizScore + behaviorScore (engagement y demographic son 0)', () => {
            const lead = makeLead({ quizCompletionPercentage: 50 });
            const result = processor.calculateFallbackScore(lead);
            expect(result.engagement_score).toBe(0);
            expect(result.demographic_score).toBe(0);
            expect(result.total_score).toBe(result.quiz_score + result.behavior_score);
        });
        it('model es siempre "fallback-v1"', () => {
            const result = processor.calculateFallbackScore(makeLead());
            expect(result.model).toBe('fallback-v1');
        });
        it('quiz_score no supera 40', () => {
            const lead = makeLead({ quizCompletionPercentage: 100 });
            const result = processor.calculateFallbackScore(lead);
            expect(result.quiz_score).toBeLessThanOrEqual(40);
        });
    });
});
//# sourceMappingURL=scoring.processor.spec.js.map
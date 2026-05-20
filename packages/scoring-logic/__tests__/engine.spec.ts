/**
 * Tests del scoring engine TypeScript
 * =====================================
 * Espeja test_scoring.py del AI Engine Python para garantizar paridad de resultados.
 * La fórmula es B(30) + Q(40) + E(20) + D(10) = 100 puntos.
 */

import {
  calculateScore,
  calculateBehaviorScore,
  calculateQuizScore,
  calculateEngagementScore,
  calculateDemographicScore,
  checkHotLeadAlert,
  getSegmentFromScore,
} from '../src/engine';
import type { BehaviorData } from '../src/types';
import type { QuizAnswer, ScoreRequest } from '../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const emptyBehavior = (): BehaviorData => ({
  visits: 0,
  pricingPageClicks: 0,
  totalTimeSeconds: 0,
  emailOpens: 0,
  emailClicks: 0,
  whatsappReplies: 0,
});

const makeRequest = (
  overrides: Partial<ScoreRequest> = {},
): ScoreRequest => ({
  leadId: 'test-lead',
  tenantId: 'tenant-test',
  quizAnswers: [],
  behaviorData: emptyBehavior(),
  quizCompletionPercentage: 100,
  ...overrides,
});

/** Caso de validación del spec: CEO + quiz max + comportamiento moderado */
const buildSpecRequest = (): ScoreRequest => ({
  leadId: 'test-001',
  tenantId: 'tenant-001',
  quizAnswers: [
    { questionId: 'q1',  questionIndex: 0, optionId: 'mas_15m' },
    { questionId: 'q2',  questionIndex: 1, optionId: 'mas_500' },
    { questionId: 'q3',  questionIndex: 2, optionId: 'seguimiento_ineficiente' },
    { questionId: 'q4',  questionIndex: 3, optionId: 'menos_15_dias' },
    { questionId: 'q5',  questionIndex: 4, optionId: 'sistema_integrado' },
    { questionId: 'q6',  questionIndex: 5, optionId: 'mas_1m' },
    { questionId: 'q7',  questionIndex: 6, optionId: 'crm_avanzado' },
    { questionId: 'q8',  questionIndex: 7, optionId: 'mas_20pct' },
    { questionId: 'q9',  questionIndex: 8, optionId: 'menos_1_mes' },
    { questionId: 'q10', questionIndex: 9, optionId: 'mas_600k' },
  ],
  behaviorData: {
    visits: 3,
    pricingPageClicks: 2,
    totalTimeSeconds: 180,
    emailOpens: 0,
    emailClicks: 0,
    whatsappReplies: 0,
    askedPriceQuestion: true,
    requestedDemo: true,
    conversationRounds: 3,
    isDecisionMaker: true,
    hasExistingCrm: true,
    companySize: 100,
    industry: 'saas',
  },
  quizCompletionPercentage: 90,
});

// ─── CASO DE VALIDACIÓN DEL SPEC ─────────────────────────────────────────────

describe('Spec validation: CEO + quiz max + comportamiento moderado', () => {
  it('score total debe superar 75 puntos', () => {
    const result = calculateScore(buildSpecRequest());
    expect(result.scores.totalScore).toBeGreaterThanOrEqual(75);
  });

  it('segmento debe ser CALIENTE o FUEGO', () => {
    const result = calculateScore(buildSpecRequest());
    expect(['caliente', 'fuego']).toContain(result.segment);
  });

  it('suma de componentes debe igualar el total', () => {
    const result = calculateScore(buildSpecRequest());
    const { behaviorScore, quizScore, engagementScore, demographicScore, totalScore } = result.scores;
    const sum = Math.round((behaviorScore + quizScore + engagementScore + demographicScore) * 10) / 10;
    expect(totalScore).toBe(sum);
  });

  it('comportamiento máximo (10 visitas, 5min, todos los flags) → FUEGO y hot alert', () => {
    const request: ScoreRequest = {
      ...buildSpecRequest(),
      quizCompletionPercentage: 100,
      behaviorData: {
        visits: 10,
        pricingPageClicks: 3,
        totalTimeSeconds: 300,
        emailOpens: 5,
        emailClicks: 4,
        whatsappReplies: 4,
        askedPriceQuestion: true,
        requestedDemo: true,
        conversationRounds: 5,
        sharedContent: true,
        linkedinInteraction: true,
        isDecisionMaker: true,
        hasExistingCrm: true,
        companySize: 200,
        industry: 'saas',
      },
    };
    const result = calculateScore(request);
    expect(result.scores.totalScore).toBeGreaterThanOrEqual(80);
    expect(result.segment).toBe('fuego');
    expect(result.hotLeadAlert).toBe(true);
  });
});

// ─── Lead frío ───────────────────────────────────────────────────────────────

describe('Lead frío: sin quiz, sin comportamiento', () => {
  it('score debe ser < 20', () => {
    const result = calculateScore(makeRequest({ quizCompletionPercentage: 10 }));
    expect(result.scores.totalScore).toBeLessThan(20);
  });

  it('segmento debe ser motor_detenido', () => {
    const result = calculateScore(makeRequest({ quizCompletionPercentage: 10 }));
    expect(result.segment).toBe('motor_detenido');
  });

  it('hot lead alert debe ser false', () => {
    const result = calculateScore(makeRequest({ quizCompletionPercentage: 10 }));
    expect(result.hotLeadAlert).toBe(false);
  });
});

// ─── Behavior score ──────────────────────────────────────────────────────────

describe('calculateBehaviorScore', () => {
  it('no supera 30 puntos con valores extremos', () => {
    const score = calculateBehaviorScore({
      visits: 1000,
      pricingPageClicks: 100,
      totalTimeSeconds: 9999,
      emailOpens: 100,
      emailClicks: 100,
      whatsappReplies: 100,
    });
    expect(score).toBeLessThanOrEqual(30);
  });

  it('0 visitas da score > 0 (escala log mínima)', () => {
    const score = calculateBehaviorScore(emptyBehavior());
    // log(0+1+1)*4.5 = log(2)*4.5 > 0
    expect(score).toBeGreaterThan(0);
  });

  it('1 clic en precios aumenta el score', () => {
    const base = calculateBehaviorScore({ ...emptyBehavior(), visits: 1 });
    const withClick = calculateBehaviorScore({ ...emptyBehavior(), visits: 1, pricingPageClicks: 1 });
    expect(withClick).toBeGreaterThan(base);
  });

  it('3 clics en precios alcanza ~8 pts del subcomponente', () => {
    const score = calculateBehaviorScore({ ...emptyBehavior(), pricingPageClicks: 3 });
    expect(score).toBeGreaterThanOrEqual(8);
  });
});

// ─── Quiz score ───────────────────────────────────────────────────────────────

describe('calculateQuizScore', () => {
  it('0 respuestas devuelve 0', () => {
    expect(calculateQuizScore([], 100)).toBe(0);
  });

  it('no supera 40 puntos', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q9',  questionIndex: 8, optionId: 'menos_1_mes' },
      { questionId: 'q10', questionIndex: 9, optionId: 'mas_600k' },
      { questionId: 'q8',  questionIndex: 7, optionId: 'mas_20pct' },
      { questionId: 'q6',  questionIndex: 5, optionId: 'mas_1m' },
    ];
    expect(calculateQuizScore(answers, 100)).toBeLessThanOrEqual(40);
  });

  it('quiz parcial (10%) penaliza vs quiz completo (100%)', () => {
    const answers: QuizAnswer[] = [
      { questionId: 'q9', questionIndex: 8, optionId: 'menos_1_mes' },
    ];
    const scoreFull = calculateQuizScore(answers, 100);
    const scorePartial = calculateQuizScore(answers, 10);
    expect(scoreFull).toBeGreaterThan(scorePartial);
  });

  it('opción de mayor valor supera opción de menor valor', () => {
    const lowBudget: QuizAnswer[] = [{ questionId: 'q10', questionIndex: 9, optionId: 'menos_100k' }];
    const highBudget: QuizAnswer[] = [{ questionId: 'q10', questionIndex: 9, optionId: 'mas_600k' }];
    expect(calculateQuizScore(highBudget, 100)).toBeGreaterThan(calculateQuizScore(lowBudget, 100));
  });

  it('option_id desconocido da 0 puntos', () => {
    const answers: QuizAnswer[] = [{ questionId: 'q1', questionIndex: 0, optionId: 'opcion_inexistente' }];
    expect(calculateQuizScore(answers, 100)).toBe(0);
  });
});

// ─── Engagement score ─────────────────────────────────────────────────────────

describe('calculateEngagementScore', () => {
  it('no supera 20 puntos', () => {
    const score = calculateEngagementScore({
      ...emptyBehavior(),
      askedPriceQuestion: true,
      requestedDemo: true,
      conversationRounds: 10,
      sharedContent: true,
      linkedinInteraction: true,
    });
    expect(score).toBeLessThanOrEqual(20);
  });

  it('preguntar precio agrega 7 puntos', () => {
    const base = calculateEngagementScore(emptyBehavior());
    const withPrice = calculateEngagementScore({ ...emptyBehavior(), askedPriceQuestion: true });
    expect(withPrice - base).toBeCloseTo(7);
  });

  it('solicitar demo agrega 6 puntos', () => {
    const base = calculateEngagementScore(emptyBehavior());
    const withDemo = calculateEngagementScore({ ...emptyBehavior(), requestedDemo: true });
    expect(withDemo - base).toBeCloseTo(6);
  });

  it('3+ rondas de chat puntúa más que 1 ronda', () => {
    const oneRound = calculateEngagementScore({ ...emptyBehavior(), conversationRounds: 1 });
    const threeRounds = calculateEngagementScore({ ...emptyBehavior(), conversationRounds: 3 });
    expect(threeRounds).toBeGreaterThan(oneRound);
  });
});

// ─── Demographic score ────────────────────────────────────────────────────────

describe('calculateDemographicScore', () => {
  it('no supera 10 puntos', () => {
    const score = calculateDemographicScore({
      ...emptyBehavior(),
      isDecisionMaker: true,
      hasExistingCrm: true,
      companySize: 100,
      industry: 'saas',
    });
    expect(score).toBeLessThanOrEqual(10);
  });

  it('decision maker agrega 4 puntos', () => {
    const base = calculateDemographicScore(emptyBehavior());
    const dm = calculateDemographicScore({ ...emptyBehavior(), isDecisionMaker: true });
    expect(dm - base).toBeCloseTo(4);
  });

  it('industria de alto valor agrega 2 puntos', () => {
    const base = calculateDemographicScore(emptyBehavior());
    const hi = calculateDemographicScore({ ...emptyBehavior(), industry: 'saas' });
    expect(hi - base).toBeCloseTo(2);
  });

  it('empresa >= 50 agrega 2 pts vs empresa < 10', () => {
    const small = calculateDemographicScore({ ...emptyBehavior(), companySize: 5 });
    const large = calculateDemographicScore({ ...emptyBehavior(), companySize: 50 });
    expect(large - small).toBeCloseTo(2);
  });
});

// ─── Segmentación ─────────────────────────────────────────────────────────────

describe('getSegmentFromScore', () => {
  const cases: [number, string][] = [
    [100, 'fuego'],
    [80,  'fuego'],
    [79,  'caliente'],
    [60,  'caliente'],
    [59,  'tibio'],
    [40,  'tibio'],
    [39,  'frio'],
    [20,  'frio'],
    [19,  'motor_detenido'],
    [0,   'motor_detenido'],
  ];

  test.each(cases)('score %i → %s', (score, segment) => {
    expect(getSegmentFromScore(score)).toBe(segment);
  });
});

// ─── Hot lead alert ───────────────────────────────────────────────────────────

describe('checkHotLeadAlert', () => {
  const makeAnswers = (q9: string, q10: string): QuizAnswer[] => [
    { questionId: 'q9',  questionIndex: 8, optionId: q9 },
    { questionId: 'q10', questionIndex: 9, optionId: q10 },
  ];

  it('score < 80 → sin alerta', () => {
    expect(checkHotLeadAlert(79.9, makeAnswers('menos_1_mes', 'mas_600k'), emptyBehavior())).toBe(false);
  });

  it('sin urgencia (q9) → sin alerta', () => {
    expect(checkHotLeadAlert(90, makeAnswers('3_6_meses', 'mas_600k'), emptyBehavior())).toBe(false);
  });

  it('sin presupuesto (q10 = no_tengo) → sin alerta', () => {
    expect(checkHotLeadAlert(90, makeAnswers('menos_1_mes', 'no_tengo'), emptyBehavior())).toBe(false);
  });

  it('score >= 80 + urgencia + presupuesto → alerta activada', () => {
    expect(checkHotLeadAlert(90, makeAnswers('menos_1_mes', 'mas_600k'), emptyBehavior())).toBe(true);
  });

  it('"ya" también activa urgencia', () => {
    expect(checkHotLeadAlert(85, makeAnswers('ya', '300k_600k'), emptyBehavior())).toBe(true);
  });

  it('answers vacías → sin alerta', () => {
    expect(checkHotLeadAlert(90, [], emptyBehavior())).toBe(false);
  });
});

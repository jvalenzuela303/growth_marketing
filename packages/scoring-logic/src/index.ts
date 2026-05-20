export {
  calculateScore,
  calculateBehaviorScore,
  calculateQuizScore,
  calculateEngagementScore,
  calculateDemographicScore,
  checkHotLeadAlert,
  getSegmentFromScore,
} from './engine';

export { QUIZ_SCORING_MAP, QUESTION_WEIGHTS, HIGH_VALUE_INDUSTRIES } from './quiz-map';

export type {
  QuizAnswer,
  ScoreRequest,
  ScoreResult,
  BehaviorData,
  LeadSegment,
  ScoreComponents,
} from './types';

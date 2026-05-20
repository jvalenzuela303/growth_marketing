export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'scale'
  | 'text'
  | 'email'
  | 'phone'
  | 'number';

export interface QuizOption {
  id: string;
  text: string;
  points: number;         // puntos que aporta al score
  skipToStep?: number;    // lógica de branching (legacy — prefer BranchingRule)
  scoreModifiers?: Array<{
    questionIndex: number;
    triggerOptionId: string;
    bonus: number;
  }>;
  metadata?: Record<string, unknown>;
}

// Declarative branching rule linking a specific option to a target question.
// targetQuestionId === null means "end the quiz immediately after this answer".
export interface BranchingRule {
  id: string;
  triggerQuestionId: string;
  triggerOptionId: string;
  targetQuestionId: string | null;
}

export interface QuizQuestion {
  id: string;
  index: number;
  type: QuestionType;
  text: string;
  subtitle?: string;
  options?: QuizOption[];
  maxPoints: number;
  weight: number;         // multiplicador de peso (1.0 = normal, 2.0 = doble peso)
  required: boolean;
  scoringCategory: 'quiz' | 'behavior' | 'engagement' | 'demographic';
  // Optional media attachment shown above / beside the question text
  mediaUrl?: string;
  // Controls how answer options are rendered
  layout?: 'list' | 'grid' | 'image_grid';
  // Branching rules that originate from this question (outgoing edges)
  branchingRules?: BranchingRule[];
}

export interface QuizConfig {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  leadGatePosition: number;  // después de qué pregunta mostrar el form
  completionRedirect?: string;
  // Global list of all branching rules in the quiz (mirrors per-question rules;
  // kept here for easy full-graph lookups without iterating every question)
  branchingRules?: BranchingRule[];
}

export interface QuizAnswer {
  questionId: string;
  questionIndex: number;
  optionId?: string;
  optionIds?: string[];  // para multiple_choice
  textValue?: string;
  numberValue?: number;
}

export interface LeadGateData {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  company?: string;
}

export interface QuizSubmission {
  funnelId: string;
  tenantSlug: string;
  answers: QuizAnswer[];
  leadData: LeadGateData;
  completionPercentage: number;
  sessionId: string;
  metadata?: {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    fbclid?: string;
    userAgent?: string;
    ipAddress?: string;
  };
}

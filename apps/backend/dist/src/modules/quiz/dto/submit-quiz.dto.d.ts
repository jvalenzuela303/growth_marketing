declare class QuizAnswerDto {
    questionId: string;
    questionIndex: number;
    optionId?: string;
    optionIds?: string[];
    textValue?: string;
    numberValue?: number;
}
declare class LeadGateDataDto {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
    company?: string;
}
declare class QuizMetadataDto {
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    fbclid?: string;
    userAgent?: string;
    ipAddress?: string;
}
export declare class SubmitQuizDto {
    answers: QuizAnswerDto[];
    leadData: LeadGateDataDto;
    completionPercentage: number;
    sessionId: string;
    metadata?: QuizMetadataDto;
}
export {};

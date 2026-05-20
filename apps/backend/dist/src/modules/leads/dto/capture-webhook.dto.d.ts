declare class WebhookMetaDto {
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    pixelId?: string;
}
export declare class CaptureWebhookDto {
    tenantId: string;
    funnelId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    source?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    metaData?: WebhookMetaDto;
    quizAnswers?: Record<string, unknown>;
    externalId?: string;
}
export {};

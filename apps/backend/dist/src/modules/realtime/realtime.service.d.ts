import { RealtimeGateway } from './realtime.gateway';
export declare class RealtimeService {
    private readonly gateway;
    constructor(gateway: RealtimeGateway);
    notifyLeadScored(tenantId: string, payload: {
        leadId: string;
        score: number;
        segment: string;
    }): void;
    notifyHotAlert(tenantId: string, payload: {
        leadId: string;
        name: string;
        score: number;
    }): void;
    notifyStageChanged(tenantId: string, payload: {
        leadId: string;
        stage: string;
    }): void;
    notifyNewMessage(tenantId: string, payload: {
        conversationId: string;
        message: string;
        from: string;
    }): void;
}

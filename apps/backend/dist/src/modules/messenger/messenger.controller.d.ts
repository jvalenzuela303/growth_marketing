import { Response } from 'express';
import { MessengerService } from './messenger.service';
interface MessengerWebhookBody {
    object: string;
    entry: Array<{
        id: string;
        messaging: Array<{
            sender: {
                id: string;
            };
            recipient: {
                id: string;
            };
            timestamp: number;
            message?: {
                mid: string;
                text: string;
            };
        }>;
    }>;
}
export declare class MessengerController {
    private readonly service;
    private readonly logger;
    constructor(service: MessengerService);
    verify(mode: string, token: string, challenge: string, res: Response): void;
    receive(body: MessengerWebhookBody): Promise<{
        ok: boolean;
    }>;
}
export {};

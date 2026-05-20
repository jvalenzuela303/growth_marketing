import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatMessageDto } from './dto/chat-message.dto';
export declare class ChatController {
    private readonly chatService;
    constructor(chatService: ChatService);
    sendMessage(tenantId: string, dto: ChatMessageDto): Promise<{
        messageId: string;
        response: string;
        leadId: string;
    }>;
    streamMessage(tenantId: string, leadId: string, message: string, model: string, res: Response): Promise<void>;
    getModels(): {
        id: string;
        label: string;
        provider: string;
        icon: string;
    }[];
}
